import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";

function pairKey(first: string, second: string) {
  return [first, second].sort().join("__");
}

export const relationshipRoutes = new Hono<AppEnv>();
relationshipRoutes.use("*", requireAuth);

relationshipRoutes.get("/:clubId/relationships", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const [friends, requests] = await Promise.all([
    c.env.DB.prepare(`
      SELECT pair_key, first_membership_id, second_membership_id, created_at
      FROM club_friendships
      WHERE club_id = ? AND (first_membership_id = ? OR second_membership_id = ?)
      ORDER BY created_at
    `).bind(clubId, membership.membershipId, membership.membershipId).all<{
      pair_key: string; first_membership_id: string; second_membership_id: string; created_at: string;
    }>(),
    c.env.DB.prepare(`
      SELECT id, requester_membership_id, recipient_membership_id, status, created_at
      FROM friend_requests
      WHERE club_id = ? AND status = 'pending' AND (requester_membership_id = ? OR recipient_membership_id = ?)
      ORDER BY created_at DESC
    `).bind(clubId, membership.membershipId, membership.membershipId).all<{
      id: string; requester_membership_id: string; recipient_membership_id: string; status: string; created_at: string;
    }>(),
  ]);
  return c.json({
    ok: true,
    friendships: (friends.results || []).map((row) => ({
      id: row.pair_key,
      membershipIds: [row.first_membership_id, row.second_membership_id],
      createdAt: row.created_at,
    })),
    requests: (requests.results || []).map((row) => ({
      id: row.id,
      requesterMembershipId: row.requester_membership_id,
      recipientMembershipId: row.recipient_membership_id,
      status: row.status,
      createdAt: row.created_at,
    })),
  });
});

relationshipRoutes.post("/:clubId/friend-requests", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const requester = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const body = await readJsonObject(c);
  const targetMembershipId = typeof body.targetMembershipId === "string" ? body.targetMembershipId : "";
  if (!targetMembershipId || targetMembershipId === requester.membershipId) {
    throw new AppError(400, "invalid_friend_target", "Choose another club member.");
  }
  const target = await c.env.DB.prepare(`
    SELECT memberships.id,
      COALESCE(requester_membership.display_name_override, requester_user.display_name) AS requester_name
    FROM club_memberships memberships
    JOIN club_memberships requester_membership ON requester_membership.id = ? AND requester_membership.club_id = memberships.club_id
    JOIN platform_users requester_user ON requester_user.id = requester_membership.user_id
    WHERE memberships.id = ? AND memberships.club_id = ? AND memberships.status = 'active' AND memberships.role = 'player'
  `).bind(requester.membershipId, targetMembershipId, clubId).first<{ id: string; requester_name: string }>();
  if (!target) throw new AppError(404, "member_not_found", "The player is not an active member of this club.");
  const key = pairKey(requester.membershipId, targetMembershipId);
  const existingFriend = await c.env.DB.prepare(`SELECT pair_key FROM club_friendships WHERE club_id = ? AND pair_key = ?`).bind(clubId, key).first();
  if (existingFriend) throw new AppError(409, "already_friends", "These players are already friends.");
  const reverse = await c.env.DB.prepare(`
    SELECT id FROM friend_requests WHERE club_id = ? AND pair_key = ? AND status = 'pending'
  `).bind(clubId, key).first<{ id: string }>();
  if (reverse) throw new AppError(409, "friend_request_pending", "A friend request between these players is already pending.");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO friend_requests (id, club_id, pair_key, requester_membership_id, recipient_membership_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).bind(id, clubId, key, requester.membershipId, targetMembershipId, now),
    c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'friend_request', 'Zadost o kamaradstvi', ?, 'friend_request', ?, ?)
    `).bind(crypto.randomUUID(), clubId, targetMembershipId, requester.membershipId, `${target.requester_name} chce byt tvuj kamarad v klubovem portalu.`, id, now),
  ]);
  return c.json({ ok: true, request: { id } }, 201);
});

relationshipRoutes.post("/:clubId/friend-requests/:requestId/respond", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const body = await readJsonObject(c);
  const response = body.response === "accept" || body.response === "decline" ? body.response : null;
  if (!response) throw new AppError(400, "invalid_response", "response must be accept or decline.");
  const request = await c.env.DB.prepare(`
    SELECT id, pair_key, requester_membership_id, recipient_membership_id
    FROM friend_requests WHERE id = ? AND club_id = ? AND recipient_membership_id = ? AND status = 'pending'
  `).bind(c.req.param("requestId"), clubId, membership.membershipId).first<{
    id: string; pair_key: string; requester_membership_id: string; recipient_membership_id: string;
  }>();
  if (!request) throw new AppError(409, "friend_request_not_pending", "This friend request is no longer pending.");
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ? AND status = 'pending'`)
      .bind(response === "accept" ? "accepted" : "declined", now, request.id),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE recipient_membership_id = ? AND entity_type = 'friend_request' AND entity_id = ? AND acted_at IS NULL`)
      .bind(now, now, membership.membershipId, request.id),
  ];
  if (response === "accept") {
    const [first, second] = [request.requester_membership_id, request.recipient_membership_id].sort();
    statements.push(c.env.DB.prepare(`
      INSERT OR IGNORE INTO club_friendships (club_id, pair_key, first_membership_id, second_membership_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(clubId, request.pair_key, first, second, now));
    statements.push(c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'friend_accepted', 'Kamaradstvi potvrzeno', 'Muzete se rychleji zvat na hry.', 'friendship', ?, ?)
    `).bind(crypto.randomUUID(), clubId, request.requester_membership_id, membership.membershipId, request.pair_key, now));
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true, response });
});
