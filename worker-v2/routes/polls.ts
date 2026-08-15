import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";

async function pollPayload(db: D1Database, clubId: string, membershipId: string, canManage: boolean) {
  const polls = await db.prepare(`SELECT * FROM club_polls WHERE club_id = ? AND (? = 1 OR status = 'active') ORDER BY created_at DESC`).bind(clubId, canManage ? 1 : 0).all<any>();
  const options = await db.prepare(`SELECT options.*, COUNT(votes.membership_id) AS vote_count, COALESCE(SUM(votes.weight),0) AS weighted FROM club_poll_options options JOIN club_polls polls ON polls.id = options.poll_id AND polls.club_id = ? LEFT JOIN club_poll_votes votes ON votes.option_id = options.id GROUP BY options.id ORDER BY options.sort_order`).bind(clubId).all<any>();
  const mine = await db.prepare(`SELECT poll_id, option_id FROM club_poll_votes WHERE membership_id = ?`).bind(membershipId).all<{ poll_id: string; option_id: string }>();
  return (polls.results || []).map((poll) => ({
    id: poll.id, title: poll.title, question: poll.question, endsAt: poll.ends_at, status: poll.status,
    myOptionId: (mine.results || []).find((vote) => vote.poll_id === poll.id)?.option_id || null,
    options: (options.results || []).filter((option) => option.poll_id === poll.id).map((option) => ({
      id: option.id, label: option.label, category: option.category, logisticsNote: option.logistics_note,
      voteCount: Number(option.vote_count), weighted: Number(option.weighted),
    })),
  }));
}

function optionCategory(label: string) {
  const value = label.toLowerCase();
  if (value.includes("bot")) return "shoes";
  if (value.includes("trick") || value.includes("oblec")) return "clothing";
  if (value.includes("raket")) return "rackets";
  return "other";
}

export const pollRoutes = new Hono<AppEnv>();
pollRoutes.use("*", requireAuth);

pollRoutes.get("/:clubId/polls", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const member = await requireClubMembership(c.env.DB, auth.userId, clubId);
  return c.json({ ok: true, polls: await pollPayload(c.env.DB, clubId, member.membershipId, ["admin", "manager"].includes(member.role)) });
});

pollRoutes.post("/:clubId/polls", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]); const body = await readJsonObject(c);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const endsAt = typeof body.endsAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.endsAt) ? body.endsAt : "";
  const labels = Array.isArray(body.options) ? body.options.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 160)).filter(Boolean) : [];
  if (!title || !question || !endsAt || labels.length < 2 || labels.length > 8 || new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) throw new AppError(400, "invalid_poll", "Poll needs a title, end date and 2 to 8 unique options.");
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`INSERT INTO club_polls (id, club_id, created_by_membership_id, title, question, ends_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`).bind(id, clubId, actor.membershipId, title, question, endsAt, now),
    c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at) SELECT lower(hex(randomblob(16))), ?, id, ?, 'poll_opened', 'Nova klubova anketa', ?, 'poll', ?, ? FROM club_memberships WHERE club_id = ? AND role = 'player' AND status = 'active'`).bind(clubId, actor.membershipId, `${title}. Hlasujte do ${endsAt}.`, id, now, clubId),
  ];
  labels.forEach((label, index) => statements.push(c.env.DB.prepare(`INSERT INTO club_poll_options (id, poll_id, label, category, logistics_note, sort_order) VALUES (?, ?, ?, ?, 'Domluvit dostupnost s dodavatelem.', ?)`).bind(crypto.randomUUID(), id, label, optionCategory(label), index)));
  await c.env.DB.batch(statements);
  return c.json({ ok: true, poll: { id } }, 201);
});

pollRoutes.post("/:clubId/polls/:pollId/vote", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const member = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]); const body = await readJsonObject(c); const optionId = String(body.optionId || "");
  const option = await c.env.DB.prepare(`SELECT options.id FROM club_poll_options options JOIN club_polls polls ON polls.id = options.poll_id WHERE options.id = ? AND polls.id = ? AND polls.club_id = ? AND polls.status = 'active' AND polls.ends_at >= date('now')`).bind(optionId, c.req.param("pollId"), clubId).first();
  if (!option) throw new AppError(404, "poll_not_active", "The poll option is not active.");
  const activity = await c.env.DB.prepare(`SELECT (SELECT COUNT(*) FROM reservations r JOIN reservation_participants p ON p.reservation_id = r.id WHERE p.membership_id = ? AND p.status IN ('owner','confirmed','replacement')) AS games, (SELECT COALESCE(SUM(paid_delta_minor),0) FROM credit_transactions WHERE membership_id = ? AND transaction_type = 'topup') AS paid`).bind(member.membershipId, member.membershipId).first<{ games: number; paid: number }>();
  const weight = Number(activity?.paid || 0) >= 600_000 || Number(activity?.games || 0) >= 20 ? 3 : Number(activity?.games || 0) >= 8 ? 2 : 1;
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO club_poll_votes (poll_id, option_id, membership_id, weight, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(poll_id,membership_id) DO UPDATE SET option_id=excluded.option_id, weight=excluded.weight, updated_at=excluded.updated_at`).bind(c.req.param("pollId"), optionId, member.membershipId, weight, now, now),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE recipient_membership_id = ? AND entity_type = 'poll' AND entity_id = ? AND acted_at IS NULL`).bind(now, now, member.membershipId, c.req.param("pollId")),
  ]);
  return c.json({ ok: true, weight });
});

pollRoutes.post("/:clubId/polls/:pollId/close", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]); const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`UPDATE club_polls SET status='closed', closed_at=? WHERE id=? AND club_id=? AND status='active'`).bind(now, c.req.param("pollId"), clubId).run();
  if (!result.meta.changes) throw new AppError(404, "poll_not_active", "The active poll does not exist.");
  const winner = await c.env.DB.prepare(`SELECT options.id, options.label, COALESCE(SUM(votes.weight),0) AS weighted, COUNT(votes.membership_id) AS votes FROM club_poll_options options LEFT JOIN club_poll_votes votes ON votes.option_id=options.id WHERE options.poll_id=? GROUP BY options.id ORDER BY weighted DESC, votes DESC, options.sort_order ASC LIMIT 1`).bind(c.req.param("pollId")).first();
  await c.env.DB.prepare(`UPDATE member_notifications SET acted_at=?, read_at=COALESCE(read_at,?) WHERE club_id=? AND entity_type='poll' AND entity_id=? AND acted_at IS NULL`).bind(now, now, clubId, c.req.param("pollId")).run();
  return c.json({ ok: true, winner });
});

pollRoutes.post("/:clubId/polls/:pollId/remind", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const poll = await c.env.DB.prepare(`SELECT title, ends_at FROM club_polls WHERE id=? AND club_id=? AND status='active'`).bind(c.req.param("pollId"), clubId).first<{ title: string; ends_at: string }>();
  if (!poll) throw new AppError(404, "poll_not_active", "The active poll does not exist.");
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
    SELECT lower(hex(randomblob(16))), ?, members.id, ?, 'poll_reminder', 'Pripominka klubove ankety', ?, 'poll', ?, ?
    FROM club_memberships members WHERE members.club_id=? AND members.role='player' AND members.status='active'
      AND NOT EXISTS (SELECT 1 FROM club_poll_votes votes WHERE votes.poll_id=? AND votes.membership_id=members.id)
      AND NOT EXISTS (SELECT 1 FROM member_notifications notices WHERE notices.recipient_membership_id=members.id AND notices.entity_type='poll' AND notices.entity_id=? AND notices.acted_at IS NULL)
  `).bind(clubId, actor.membershipId, `${poll.title}. Hlasujte do ${poll.ends_at}.`, c.req.param("pollId"), now, clubId, c.req.param("pollId"), c.req.param("pollId")).run();
  return c.json({ ok: true, notified: result.meta.changes || 0 });
});
