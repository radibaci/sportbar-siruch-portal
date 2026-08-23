import { Hono } from "hono";
import type { AppEnv, MembershipContext } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";

type ReservationCore = { owner_membership_id: string; reservation_date: string; start_time: string; end_time: string; game_type: "single" | "double"; status: string; external_participants_json: string };

async function reservationCore(db: D1Database, clubId: string, reservationId: string) {
  return db.prepare(`SELECT owner_membership_id, reservation_date, start_time, end_time, game_type, status, external_participants_json FROM reservations WHERE id = ? AND club_id = ? AND status NOT IN ('cancelled','completed')`)
    .bind(reservationId, clubId).first<ReservationCore>();
}

export async function appendAutomaticReplacementCandidates(db: D1Database, clubId: string, reservationId: string, actor: MembershipContext, statements: D1PreparedStatement[], now: string) {
  const candidates = await db.prepare(`
    SELECT candidate.id,
      SUM(CASE WHEN friendships.pair_key IS NULL THEN 0 ELSE 1 END) AS friend_score
    FROM club_memberships candidate
    LEFT JOIN club_friendships friendships ON friendships.club_id = candidate.club_id
      AND (friendships.first_membership_id = candidate.id OR friendships.second_membership_id = candidate.id)
      AND (CASE WHEN friendships.first_membership_id = candidate.id THEN friendships.second_membership_id ELSE friendships.first_membership_id END) IN (
        SELECT membership_id FROM reservation_participants WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')
      )
    WHERE candidate.club_id = ? AND candidate.role = 'player' AND candidate.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM reservation_participants p WHERE p.reservation_id = ? AND p.membership_id = candidate.id)
      AND NOT EXISTS (SELECT 1 FROM replacement_candidates rc WHERE rc.reservation_id = ? AND rc.candidate_membership_id = candidate.id)
      AND NOT EXISTS (
        SELECT 1 FROM member_busy_slots busy JOIN reservation_slots wanted ON wanted.reservation_id = ? AND wanted.slot_at = busy.slot_at
        WHERE busy.club_id = ? AND busy.membership_id = candidate.id
      )
    GROUP BY candidate.id ORDER BY friend_score DESC, candidate.joined_at ASC LIMIT 3
  `).bind(reservationId, clubId, reservationId, reservationId, reservationId, clubId).all<{ id: string }>();
  for (const candidate of candidates.results || []) {
    statements.push(db.prepare(`INSERT INTO replacement_candidates (reservation_id, candidate_membership_id, invited_by_membership_id, status, created_at) VALUES (?, ?, ?, 'invited', ?)`)
      .bind(reservationId, candidate.id, actor.membershipId, now));
    statements.push(db.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      SELECT ?, ?, ?, ?, 'replacement_invite', 'Pozvanka jako nahradnik', reservation_date || ' ' || start_time || '-' || end_time, 'reservation', id, ? FROM reservations WHERE id = ?`)
      .bind(crypto.randomUUID(), clubId, candidate.id, actor.membershipId, now, reservationId));
  }
}

async function replacementPayload(db: D1Database, reservationId: string) {
  const candidates = await db.prepare(`
    SELECT candidates.candidate_membership_id AS membership_id, COALESCE(m.display_name_override, u.display_name) AS display_name,
      candidates.status, COUNT(votes.voter_membership_id) AS votes
    FROM replacement_candidates candidates JOIN club_memberships m ON m.id = candidates.candidate_membership_id
    JOIN platform_users u ON u.id = m.user_id LEFT JOIN replacement_votes votes
      ON votes.reservation_id = candidates.reservation_id AND votes.candidate_membership_id = candidates.candidate_membership_id
    WHERE candidates.reservation_id = ? GROUP BY candidates.candidate_membership_id ORDER BY votes DESC, candidates.created_at ASC
  `).bind(reservationId).all();
  return candidates.results || [];
}

function timeMinutes(value: string) {
  const match = /^(\d{2}):(00|30)$/.exec(value);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function proposedSlots(date: string, start: string, end: string) {
  const from = timeMinutes(start); const to = timeMinutes(end);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || from < 0 || to <= from || to - from > 240) {
    throw new AppError(400, "invalid_counterproposal_time", "Choose a valid date and half-hour time range.");
  }
  const result: string[] = [];
  for (let minute = from; minute < to; minute += 30) result.push(`${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  return result;
}

export const coordinationRoutes = new Hono<AppEnv>();
coordinationRoutes.use("*", requireAuth);

coordinationRoutes.post("/:clubId/reservations/:reservationId/counterproposals", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const reservationId = c.req.param("reservationId");
  const proposer = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]); const body = await readJsonObject(c);
  const date = String(body.date || ""); const start = String(body.start || ""); const end = String(body.end || ""); const courtId = String(body.courtId || "");
  const slots = proposedSlots(date, start, end);
  const reservation = await c.env.DB.prepare(`SELECT r.owner_membership_id, p.status FROM reservations r JOIN reservation_participants p ON p.reservation_id = r.id WHERE r.id = ? AND r.club_id = ? AND p.membership_id = ? AND r.status != 'cancelled'`)
    .bind(reservationId, clubId, proposer.membershipId).first<{ owner_membership_id: string; status: string }>();
  if (!reservation || reservation.status !== "pending") throw new AppError(403, "counterproposal_denied", "Only a player with a pending invitation can propose another time.");
  const court = await c.env.DB.prepare(`SELECT open_time, close_time FROM club_courts WHERE id = ? AND club_id = ? AND active = 1`).bind(courtId, clubId).first<{ open_time: string; close_time: string }>();
  if (!court || timeMinutes(start) < timeMinutes(court.open_time) || timeMinutes(end) > timeMinutes(court.close_time)) throw new AppError(400, "counterproposal_outside_hours", "The proposed time is outside court opening hours.");
  for (const slot of slots) {
    if (await c.env.DB.prepare(`SELECT 1 FROM reservation_slots WHERE court_id = ? AND slot_at = ? AND reservation_id != ?`).bind(courtId, slot, reservationId).first()) throw new AppError(409, "court_time_conflict", "The proposed court is already occupied.");
    if (await c.env.DB.prepare(`SELECT 1 FROM member_busy_slots WHERE club_id = ? AND membership_id = ? AND slot_at = ? AND reservation_id != ?`).bind(clubId, proposer.membershipId, slot, reservationId).first()) throw new AppError(409, "player_time_conflict", "You already have another reservation at the proposed time.");
  }
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO game_counterproposals (id, club_id, reservation_id, proposer_membership_id, court_id, proposed_date, start_time, end_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`).bind(id, clubId, reservationId, proposer.membershipId, courtId, date, start, end, now),
      c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, 'game_counterproposal', 'Novy protinavrh hry', ?, 'counterproposal', ?, ?)`).bind(crypto.randomUUID(), clubId, reservation.owner_membership_id, proposer.membershipId, `${date} ${start}-${end}`, id, now),
    ]);
  } catch { throw new AppError(409, "counterproposal_exists", "This player already has a pending counterproposal."); }
  return c.json({ ok: true, counterproposal: { id } }, 201);
});

coordinationRoutes.post("/:clubId/counterproposals/:proposalId/respond", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const owner = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]);
  const body = await readJsonObject(c); const accept = body.response === "accept"; if (!accept && body.response !== "decline") throw new AppError(400, "invalid_response", "response must be accept or decline.");
  const proposal = await c.env.DB.prepare(`SELECT cp.*, r.owner_membership_id FROM game_counterproposals cp JOIN reservations r ON r.id = cp.reservation_id WHERE cp.id = ? AND cp.club_id = ? AND cp.status = 'pending'`)
    .bind(c.req.param("proposalId"), clubId).first<{ reservation_id: string; proposer_membership_id: string; court_id: string; proposed_date: string; start_time: string; end_time: string; owner_membership_id: string }>();
  if (!proposal) throw new AppError(404, "counterproposal_not_found", "The pending counterproposal does not exist.");
  if (proposal.owner_membership_id !== owner.membershipId) throw new AppError(403, "counterproposal_response_denied", "Only the reservation owner can respond.");
  const now = new Date().toISOString();
  if (!accept) {
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE game_counterproposals SET status = 'declined', responded_at = ? WHERE id = ?`).bind(now, c.req.param("proposalId")),
      c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE club_id = ? AND entity_type = 'counterproposal' AND entity_id = ? AND acted_at IS NULL`).bind(now, now, clubId, c.req.param("proposalId")),
    ]);
    return c.json({ ok: true, status: "declined" });
  }
  const slots = proposedSlots(proposal.proposed_date, proposal.start_time, proposal.end_time);
  const participants = await c.env.DB.prepare(`SELECT membership_id FROM reservation_participants WHERE reservation_id = ? AND status IN ('owner','pending','confirmed','replacement')`).bind(proposal.reservation_id).all<{ membership_id: string }>();
  for (const slot of slots) {
    if (await c.env.DB.prepare(`SELECT 1 FROM reservation_slots WHERE court_id = ? AND slot_at = ? AND reservation_id != ?`).bind(proposal.court_id, slot, proposal.reservation_id).first()) throw new AppError(409, "court_time_conflict", "The proposed court became occupied.");
    for (const participant of participants.results || []) if (await c.env.DB.prepare(`SELECT 1 FROM member_busy_slots WHERE club_id = ? AND membership_id = ? AND slot_at = ? AND reservation_id != ?`).bind(clubId, participant.membership_id, slot, proposal.reservation_id).first()) throw new AppError(409, "player_time_conflict", "A participant is no longer free at the proposed time.");
  }
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`DELETE FROM reservation_slots WHERE reservation_id = ?`).bind(proposal.reservation_id),
    c.env.DB.prepare(`DELETE FROM member_busy_slots WHERE reservation_id = ?`).bind(proposal.reservation_id),
    c.env.DB.prepare(`UPDATE reservations SET court_id = ?, reservation_date = ?, start_time = ?, end_time = ?, updated_at = ? WHERE id = ? AND club_id = ?`).bind(proposal.court_id, proposal.proposed_date, proposal.start_time, proposal.end_time, now, proposal.reservation_id, clubId),
    c.env.DB.prepare(`UPDATE game_counterproposals SET status = 'accepted', responded_at = ? WHERE id = ?`).bind(now, c.req.param("proposalId")),
    c.env.DB.prepare(`UPDATE game_counterproposals SET status = 'cancelled', responded_at = ? WHERE reservation_id = ? AND id != ? AND status = 'pending'`).bind(now, proposal.reservation_id, c.req.param("proposalId")),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE club_id = ? AND entity_type = 'counterproposal' AND entity_id = ? AND acted_at IS NULL`).bind(now, now, clubId, c.req.param("proposalId")),
  ];
  for (const slot of slots) {
    statements.push(c.env.DB.prepare(`INSERT INTO reservation_slots (reservation_id, court_id, slot_at) VALUES (?, ?, ?)`).bind(proposal.reservation_id, proposal.court_id, slot));
    for (const participant of participants.results || []) statements.push(c.env.DB.prepare(`INSERT INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at) VALUES (?, ?, ?, ?)`).bind(clubId, participant.membership_id, proposal.reservation_id, slot));
  }
  try { await c.env.DB.batch(statements); } catch { throw new AppError(409, "counterproposal_conflict", "The proposed time could not be reserved."); }
  return c.json({ ok: true, status: "accepted" });
});

coordinationRoutes.post("/:clubId/reservations/:reservationId/join-request", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const reservationId = c.req.param("reservationId");
  const candidate = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]);
  const reservation = await reservationCore(c.env.DB, clubId, reservationId);
  if (!reservation || reservation.status !== "searching") {
    throw new AppError(409, "reservation_not_searching", "This reservation is no longer looking for a player.");
  }
  const alreadyInGame = await c.env.DB.prepare(`SELECT 1 FROM reservation_participants WHERE reservation_id = ? AND membership_id = ?`)
    .bind(reservationId, candidate.membershipId).first();
  if (alreadyInGame) throw new AppError(409, "already_in_reservation", "You are already part of this reservation.");
  const existingCandidate = await c.env.DB.prepare(`SELECT 1 FROM replacement_candidates WHERE reservation_id = ? AND candidate_membership_id = ?`)
    .bind(reservationId, candidate.membershipId).first();
  if (existingCandidate) throw new AppError(409, "join_request_exists", "Your request is already waiting for the group.");
  const active = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM reservation_participants WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')`)
    .bind(reservationId).first<{ count: number }>();
  let externalCount = 0;
  try { externalCount = Array.isArray(JSON.parse(reservation.external_participants_json || "[]")) ? JSON.parse(reservation.external_participants_json || "[]").length : 0; } catch { externalCount = 0; }
  const target = reservation.game_type === "single" ? 2 : 4;
  if (Number(active?.count || 0) + externalCount >= target) throw new AppError(409, "reservation_full", "The lineup is already full.");
  const conflict = await c.env.DB.prepare(`
    SELECT 1 FROM member_busy_slots busy JOIN reservation_slots wanted ON wanted.reservation_id = ? AND wanted.slot_at = busy.slot_at
    WHERE busy.club_id = ? AND busy.membership_id = ? AND busy.reservation_id != ? LIMIT 1
  `).bind(reservationId, clubId, candidate.membershipId, reservationId).first();
  if (conflict) throw new AppError(409, "player_time_conflict", "You already have another game at this time.");
  const voters = await c.env.DB.prepare(`SELECT membership_id FROM reservation_participants WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')`)
    .bind(reservationId).all<{ membership_id: string }>();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`INSERT INTO replacement_candidates (reservation_id, candidate_membership_id, invited_by_membership_id, status, responded_at, created_at) VALUES (?, ?, ?, 'accepted', ?, ?)`)
      .bind(reservationId, candidate.membershipId, candidate.membershipId, now, now),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE club_id = ? AND recipient_membership_id = ? AND type = 'open_game' AND entity_type = 'reservation' AND entity_id = ? AND acted_at IS NULL`)
      .bind(now, now, clubId, candidate.membershipId, reservationId),
  ];
  for (const voter of voters.results || []) {
    statements.push(c.env.DB.prepare(`INSERT INTO member_notifications
      (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'replacement_vote', 'Zadost o misto ve hre', ?, 'reservation', ?, ?)`)
      .bind(crypto.randomUUID(), clubId, voter.membership_id, candidate.membershipId, `${reservation.reservation_date} ${reservation.start_time}-${reservation.end_time}. Hrac se chce pridat, potvrďte ho hlasovanim.`, reservationId, now));
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true, status: "waiting_for_vote" }, 201);
});

coordinationRoutes.get("/:clubId/reservations/:reservationId/replacements", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const reservationId = c.req.param("reservationId");
  const member = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const allowed = await c.env.DB.prepare(`SELECT 1 FROM replacement_candidates WHERE reservation_id = ? AND candidate_membership_id = ? UNION SELECT 1 FROM reservation_participants WHERE reservation_id = ? AND membership_id = ?`)
    .bind(reservationId, member.membershipId, reservationId, member.membershipId).first();
  if (!allowed) throw new AppError(403, "replacement_access_denied", "This replacement vote is private to its participants.");
  return c.json({ ok: true, candidates: await replacementPayload(c.env.DB, reservationId) });
});

coordinationRoutes.post("/:clubId/reservations/:reservationId/replacements/respond", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const reservationId = c.req.param("reservationId");
  const member = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]); const body = await readJsonObject(c);
  const response = body.response === "accept" ? "accepted" : body.response === "decline" ? "declined" : "";
  if (!response) throw new AppError(400, "invalid_response", "response must be accept or decline.");
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`UPDATE replacement_candidates SET status = ?, responded_at = ? WHERE reservation_id = ? AND candidate_membership_id = ? AND status = 'invited'`)
    .bind(response, now, reservationId, member.membershipId).run();
  if (!result.meta.changes) throw new AppError(409, "replacement_invitation_not_pending", "This replacement invitation is no longer pending.");
  await c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE recipient_membership_id = ? AND entity_type = 'reservation' AND entity_id = ? AND type = 'replacement_invite' AND acted_at IS NULL`)
    .bind(now, now, member.membershipId, reservationId).run();
  if (response === "accepted") {
    const voters = await c.env.DB.prepare(`SELECT membership_id FROM reservation_participants WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')`)
      .bind(reservationId).all<{ membership_id: string }>();
    const statements = (voters.results || []).map((voter) => c.env.DB.prepare(`INSERT INTO member_notifications
      (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'replacement_vote', 'Hlasovani o nahradnikovi', 'Kandidat souhlasi. Potvrdte, zda ma doplnit sestavu.', 'reservation', ?, ?)`)
      .bind(crypto.randomUUID(), clubId, voter.membership_id, member.membershipId, reservationId, now));
    if (statements.length) await c.env.DB.batch(statements);
  }
  return c.json({ ok: true, status: response });
});

coordinationRoutes.post("/:clubId/reservations/:reservationId/replacements/vote", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId"); const reservationId = c.req.param("reservationId");
  const voter = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]); const body = await readJsonObject(c);
  const candidateId = typeof body.candidateMembershipId === "string" ? body.candidateMembershipId : "";
  const reservation = await reservationCore(c.env.DB, clubId, reservationId);
  if (!reservation) throw new AppError(404, "reservation_not_found", "The reservation is not active.");
  const activeVoter = await c.env.DB.prepare(`SELECT 1 FROM reservation_participants WHERE reservation_id = ? AND membership_id = ? AND status IN ('owner','confirmed','replacement')`).bind(reservationId, voter.membershipId).first();
  const candidate = await c.env.DB.prepare(`SELECT 1 FROM replacement_candidates WHERE reservation_id = ? AND candidate_membership_id = ? AND status = 'accepted'`).bind(reservationId, candidateId).first();
  if (!activeVoter || !candidate) throw new AppError(403, "replacement_vote_denied", "Only active players can vote for an accepted candidate.");
  const now = new Date().toISOString();
  try {
    await c.env.DB.prepare(`INSERT INTO replacement_votes (reservation_id, candidate_membership_id, voter_membership_id, created_at) VALUES (?, ?, ?, ?)`)
      .bind(reservationId, candidateId, voter.membershipId, now).run();
  } catch { throw new AppError(409, "replacement_vote_exists", "This player has already voted."); }
  const active = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM reservation_participants WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')`).bind(reservationId).first<{ count: number }>();
  const votes = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM replacement_votes WHERE reservation_id = ?`).bind(reservationId).first<{ count: number }>();
  let selected: string | null = null;
  if (Number(votes?.count || 0) >= Number(active?.count || 0)) {
    const winner = await c.env.DB.prepare(`SELECT candidate_membership_id, COUNT(*) AS votes FROM replacement_votes WHERE reservation_id = ? GROUP BY candidate_membership_id ORDER BY votes DESC, candidate_membership_id ASC LIMIT 1`).bind(reservationId).first<{ candidate_membership_id: string }>();
    selected = winner?.candidate_membership_id || null;
    if (selected) {
      const target = reservation.game_type === "single" ? 2 : 4;
      let externalCount = 0;
      try { const parsed = JSON.parse(reservation.external_participants_json || "[]"); externalCount = Array.isArray(parsed) ? parsed.length : 0; } catch { externalCount = 0; }
      const statements: D1PreparedStatement[] = [
        c.env.DB.prepare(`UPDATE replacement_candidates SET status = CASE WHEN candidate_membership_id = ? THEN 'selected' ELSE 'rejected' END WHERE reservation_id = ? AND status = 'accepted'`).bind(selected, reservationId),
        c.env.DB.prepare(`INSERT INTO reservation_participants (reservation_id, membership_id, status, invited_by_membership_id, responded_at, created_at, updated_at) VALUES (?, ?, 'replacement', ?, ?, ?, ?) ON CONFLICT(reservation_id,membership_id) DO UPDATE SET status='replacement', responded_at=excluded.responded_at, updated_at=excluded.updated_at`).bind(reservationId, selected, voter.membershipId, now, now, now),
        c.env.DB.prepare(`INSERT INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at) SELECT ?, ?, ?, slot_at FROM reservation_slots WHERE reservation_id = ?`).bind(clubId, selected, reservationId, reservationId),
        c.env.DB.prepare(`UPDATE reservations SET status = CASE WHEN (SELECT COUNT(*) FROM reservation_participants WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')) + ? >= ? THEN 'confirmed' ELSE 'searching' END, updated_at = ? WHERE id = ?`).bind(reservationId, externalCount, target, now, reservationId),
      ];
      await c.env.DB.batch(statements);
      await c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE club_id = ? AND entity_type = 'reservation' AND entity_id = ? AND type = 'replacement_vote' AND acted_at IS NULL`)
        .bind(now, now, clubId, reservationId).run();
    }
  }
  return c.json({ ok: true, selectedMembershipId: selected, candidates: await replacementPayload(c.env.DB, reservationId) });
});
