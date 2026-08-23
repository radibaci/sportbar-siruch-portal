import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";
import { validateBookingTime, validateOpeningHours } from "../reservations/time";
import { appendAutomaticReplacementCandidates } from "./coordination";

type CourtRow = {
  id: string;
  name: string;
  surface: string;
  color: string;
  photo_url: string | null;
  open_time: string;
  close_time: string;
};

type ReservationRow = {
  id: string;
  court_id: string;
  court_name: string;
  surface: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  game_type: "single" | "double";
  status: string;
  owner_membership_id: string;
  participant_status: string | null;
  active_count: number;
  owner_display_name?: string;
  title?: string | null;
  series_id?: string | null;
  created_at: string;
};

type ParticipantRow = {
  reservation_id: string;
  membership_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
};

type PriceRuleRow = {
  id: string;
  court_id: string;
  day_key: string;
  start_time: string;
  end_time: string;
  price_minor: number;
};

type CourtBlockRow = {
  id: string;
  court_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  block_type: string;
  title: string;
  note: string | null;
  color: string;
};

async function reservationParticipants(db: D1Database, clubId: string, reservationIds: string[]): Promise<Map<string, ParticipantRow[]>> {
  const grouped = new Map<string, ParticipantRow[]>();
  if (!reservationIds.length) return grouped;
  const placeholders = reservationIds.map(() => "?").join(",");
  const result = await db.prepare(`
    SELECT participants.reservation_id, participants.membership_id,
      COALESCE(memberships.display_name_override, users.display_name) AS display_name,
      users.avatar_url, participants.status
    FROM reservation_participants participants
    JOIN reservations ON reservations.id = participants.reservation_id AND reservations.club_id = ?
    JOIN club_memberships memberships ON memberships.id = participants.membership_id AND memberships.club_id = reservations.club_id
    JOIN platform_users users ON users.id = memberships.user_id
    WHERE participants.reservation_id IN (${placeholders})
    ORDER BY participants.created_at
  `).bind(clubId, ...reservationIds).all<ParticipantRow>();
  for (const row of result.results || []) {
    const list = grouped.get(row.reservation_id) || [];
    list.push(row);
    grouped.set(row.reservation_id, list);
  }
  return grouped;
}

function participantJson(item: ParticipantRow) {
  return {
    membershipId: item.membership_id,
    displayName: item.display_name,
    avatarUrl: item.avatar_url,
    status: item.status,
  };
}

function databaseConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/UNIQUE constraint failed|court_slot_blocked|court_slot_reserved/i.test(message)) {
    throw new AppError(409, "booking_conflict", "The court or one of the players is no longer available at this time.");
  }
  throw error;
}

function courtInput(body: Record<string, unknown>): {
  name: string;
  surface: "clay" | "hard" | "grass" | "carpet" | "other";
  color: string;
  photoUrl: string | null;
  openTime: string;
  closeTime: string;
} {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const surfaces = ["clay", "hard", "grass", "carpet", "other"] as const;
  const surface = surfaces.find((item) => item === body.surface);
  const color = typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : "#5f8f72";
  const photoUrl = typeof body.photoUrl === "string" && body.photoUrl.length <= 500 ? body.photoUrl : null;
  const openTime = typeof body.openTime === "string" ? body.openTime : "08:00";
  const closeTime = typeof body.closeTime === "string" ? body.closeTime : "21:00";
  if (!name || !surface) throw new AppError(400, "invalid_court", "Court name and surface are required.");
  validateOpeningHours(openTime, closeTime);
  return { name, surface, color, photoUrl, openTime, closeTime };
}

function priceRuleInput(body: Record<string, unknown>) {
  const dayKey = typeof body.dayKey === "string" ? body.dayKey : "";
  const validDayKey = ["weekdays", "weekend", "all"].includes(dayKey) || /^date:\d{4}-\d{2}-\d{2}$/.test(dayKey);
  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  const endTime = typeof body.endTime === "string" ? body.endTime : "";
  const priceMinor = Number(body.priceMinor);
  if (!validDayKey) throw new AppError(400, "invalid_day_key", "The pricing day range is invalid.");
  validateOpeningHours(startTime, endTime);
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) {
    throw new AppError(400, "invalid_price", "The hourly price must be a non-negative integer in minor currency units.");
  }
  return { dayKey, startTime, endTime, priceMinor };
}

async function activeMembers(db: D1Database, clubId: string, membershipIds: string[]): Promise<Set<string>> {
  if (membershipIds.length === 0) return new Set();
  const placeholders = membershipIds.map(() => "?").join(",");
  const result = await db.prepare(`
    SELECT id FROM club_memberships
    WHERE club_id = ? AND status = 'active' AND role = 'player' AND id IN (${placeholders})
  `).bind(clubId, ...membershipIds).all<{ id: string }>();
  return new Set((result.results || []).map((row) => row.id));
}

const DEFAULT_CANCELLATION_MINUTES = 30;

function cancellationMinutesFromConfig(configJson: string): number {
  try {
    const value = Number((JSON.parse(configJson) as Record<string, unknown>).reservationCancellationMinutes);
    return Number.isInteger(value) && value >= 0 && value <= 10_080 ? value : DEFAULT_CANCELLATION_MINUTES;
  } catch {
    return DEFAULT_CANCELLATION_MINUTES;
  }
}

async function clubCancellationMinutes(db: D1Database, clubId: string): Promise<number> {
  const club = await db.prepare(`SELECT public_config_json FROM clubs WHERE id = ? AND status = 'active'`)
    .bind(clubId).first<{ public_config_json: string }>();
  if (!club) throw new AppError(404, "club_not_found", "The club does not exist.");
  return cancellationMinutesFromConfig(club.public_config_json);
}

function cancellationDeadline(createdAt: string, minutes: number): string {
  return new Date(new Date(createdAt).getTime() + minutes * 60_000).toISOString();
}

export const reservationRoutes = new Hono<AppEnv>();
reservationRoutes.use("*", requireAuth);

reservationRoutes.get("/:clubId/schedule", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const from = c.req.query("from");
  if (!from) throw new AppError(400, "date_required", "A schedule start date is required.");
  validateBookingTime(from, "00:00", "00:30");
  const days = Math.min(31, Math.max(1, Number.parseInt(c.req.query("days") || "7", 10) || 7));
  const endDate = new Date(`${from}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + days - 1);
  const through = endDate.toISOString().slice(0, 10);
  const courts = await c.env.DB.prepare(`
    SELECT id, name, surface, color, photo_url, open_time, close_time
    FROM club_courts WHERE club_id = ? AND active = 1 ORDER BY sort_order, name
  `).bind(clubId).all<CourtRow>();
  const reservations = await c.env.DB.prepare(`
    SELECT r.id, r.court_id, courts.name AS court_name, courts.surface, r.reservation_date, r.title, r.series_id, r.created_at,
      r.start_time, r.end_time, r.game_type, r.status, r.owner_membership_id,
      COALESCE(owner_membership.display_name_override, owner_user.display_name) AS owner_display_name,
      mine.status AS participant_status,
      SUM(CASE WHEN participants.status IN ('owner','confirmed','replacement') THEN 1 ELSE 0 END) AS active_count
    FROM reservations r
    JOIN club_courts courts ON courts.id = r.court_id AND courts.club_id = r.club_id
    JOIN club_memberships owner_membership ON owner_membership.id = r.owner_membership_id
    JOIN platform_users owner_user ON owner_user.id = owner_membership.user_id
    LEFT JOIN reservation_participants participants ON participants.reservation_id = r.id
    LEFT JOIN reservation_participants mine ON mine.reservation_id = r.id AND mine.membership_id = ?
    WHERE r.club_id = ? AND r.reservation_date BETWEEN ? AND ? AND r.status != 'cancelled'
    GROUP BY r.id ORDER BY r.reservation_date, courts.sort_order, r.start_time
  `).bind(membership.membershipId, clubId, from, through).all<ReservationRow>();
  const priceRules = await c.env.DB.prepare(`
    SELECT id, court_id, day_key, start_time, end_time, price_minor
    FROM court_price_rules WHERE club_id = ? ORDER BY court_id, day_key, start_time
  `).bind(clubId).all<PriceRuleRow>();
  const blocks = await c.env.DB.prepare(`
    SELECT id, court_id, block_date, start_time, end_time, block_type, title, note, color
    FROM court_blocks WHERE club_id = ? AND block_date BETWEEN ? AND ?
    ORDER BY block_date, court_id, start_time
  `).bind(clubId, from, through).all<CourtBlockRow>();
  return c.json({
    ok: true,
    from,
    through,
    priceRules: (priceRules.results || []).map((rule) => ({
      id: rule.id,
      courtId: rule.court_id,
      dayKey: rule.day_key,
      start: rule.start_time,
      end: rule.end_time,
      priceMinor: Number(rule.price_minor),
    })),
    courts: (courts.results || []).map((court) => ({
      id: court.id,
      name: court.name,
      surface: court.surface,
      color: court.color,
      photoUrl: court.photo_url,
      openTime: court.open_time,
      closeTime: court.close_time,
      reservations: [
        ...(reservations.results || []).filter((item) => item.court_id === court.id).map((item) => ({
        id: item.id,
        seriesId: item.series_id,
        date: item.reservation_date,
        start: item.start_time,
        end: item.end_time,
        gameType: item.game_type,
        status: item.status,
        activePlayers: Number(item.active_count),
        targetPlayers: item.game_type === "single" ? 2 : 4,
        ownerName: item.owner_display_name,
        isMine: ["owner", "confirmed", "replacement"].includes(item.participant_status || ""),
        invitationPending: item.participant_status === "pending",
        })),
        ...(blocks.results || []).filter((item) => item.court_id === court.id).map((item) => ({
          id: item.id,
          date: item.block_date,
          start: item.start_time,
          end: item.end_time,
          kind: "block",
          blockType: item.block_type,
          title: item.title,
          note: item.note,
          color: item.color,
          status: "blocked",
          activePlayers: 0,
          targetPlayers: 0,
          isMine: false,
          invitationPending: false,
        })),
      ],
    })),
  });
});

reservationRoutes.get("/:clubId/courts", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const date = c.req.query("date");
  if (!date) throw new AppError(400, "date_required", "A reservation date is required.");
  validateBookingTime(date, "00:00", "00:30");
  const courts = await c.env.DB.prepare(`
    SELECT id, name, surface, color, photo_url, open_time, close_time
    FROM club_courts WHERE club_id = ? AND active = 1 ORDER BY sort_order, name
  `).bind(clubId).all<CourtRow>();
  const reservations = await c.env.DB.prepare(`
    SELECT r.id, r.court_id, courts.name AS court_name, courts.surface, r.reservation_date,
      r.start_time, r.end_time, r.game_type, r.status, r.owner_membership_id,
      COALESCE(owner_membership.display_name_override, owner_user.display_name) AS owner_display_name,
      mine.status AS participant_status,
      SUM(CASE WHEN participants.status IN ('owner','confirmed','replacement') THEN 1 ELSE 0 END) AS active_count
    FROM reservations r
    JOIN club_courts courts ON courts.id = r.court_id AND courts.club_id = r.club_id
    JOIN club_memberships owner_membership ON owner_membership.id = r.owner_membership_id
    JOIN platform_users owner_user ON owner_user.id = owner_membership.user_id
    LEFT JOIN reservation_participants participants ON participants.reservation_id = r.id
    LEFT JOIN reservation_participants mine ON mine.reservation_id = r.id AND mine.membership_id = ?
    WHERE r.club_id = ? AND r.reservation_date = ? AND r.status != 'cancelled'
    GROUP BY r.id ORDER BY courts.sort_order, r.start_time
  `).bind(membership.membershipId, clubId, date).all<ReservationRow>();
  return c.json({
    ok: true,
    date,
    courts: (courts.results || []).map((court) => ({
      id: court.id,
      name: court.name,
      surface: court.surface,
      color: court.color,
      photoUrl: court.photo_url,
      openTime: court.open_time,
      closeTime: court.close_time,
      reservations: (reservations.results || []).filter((item) => item.court_id === court.id).map((item) => ({
        id: item.id,
        start: item.start_time,
        end: item.end_time,
        gameType: item.game_type,
        status: item.status,
        activePlayers: Number(item.active_count),
        targetPlayers: item.game_type === "single" ? 2 : 4,
        ownerName: item.owner_display_name,
        isMine: ["owner", "confirmed", "replacement"].includes(item.participant_status || ""),
        invitationPending: item.participant_status === "pending",
      })),
    })),
  });
});

reservationRoutes.post("/:clubId/courts", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const input = courtInput(await readJsonObject(c));
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO club_courts (id, club_id, name, surface, color, photo_url, open_time, close_time, active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, COALESCE((SELECT MAX(sort_order) + 1 FROM club_courts WHERE club_id = ?), 1), ?, ?)
      `).bind(id, clubId, input.name, input.surface, input.color, input.photoUrl, input.openTime, input.closeTime, clubId, now, now),
      c.env.DB.prepare(`
        INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
        VALUES (?, ?, ?, 'club.court.created', 'court', ?, ?, ?)
      `).bind(crypto.randomUUID(), clubId, auth.userId, id, JSON.stringify({ name: input.name }), now),
    ]);
  } catch (error) {
    databaseConflict(error);
  }
  return c.json({ ok: true, court: { id, ...input } }, 201);
});

reservationRoutes.put("/:clubId/courts/:courtId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const courtId = c.req.param("courtId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const input = courtInput(await readJsonObject(c));
  const now = new Date().toISOString();
  try {
    const result = await c.env.DB.prepare(`
      UPDATE club_courts SET name = ?, surface = ?, color = ?, photo_url = ?, open_time = ?, close_time = ?, updated_at = ?
      WHERE id = ? AND club_id = ? AND active = 1
    `).bind(input.name, input.surface, input.color, input.photoUrl, input.openTime, input.closeTime, now, courtId, clubId).run();
    if (!result.meta.changes) throw new AppError(404, "court_not_found", "The court does not exist in this club.");
  } catch (error) {
    databaseConflict(error);
  }
  await c.env.DB.prepare(`
    INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, 'club.court.updated', 'court', ?, ?, ?)
  `).bind(crypto.randomUUID(), clubId, auth.userId, courtId, JSON.stringify({ name: input.name }), now).run();
  return c.json({ ok: true, court: { id: courtId, ...input } });
});

reservationRoutes.delete("/:clubId/courts/:courtId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const courtId = c.req.param("courtId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const activeCount = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM club_courts WHERE club_id = ? AND active = 1`).bind(clubId).first<{ count: number }>();
  if (Number(activeCount?.count || 0) <= 1) throw new AppError(409, "last_court", "A club must keep at least one active court.");
  const future = await c.env.DB.prepare(`
    SELECT id FROM reservations WHERE club_id = ? AND court_id = ? AND status NOT IN ('cancelled','completed') LIMIT 1
  `).bind(clubId, courtId).first<{ id: string }>();
  if (future) throw new AppError(409, "court_has_reservations", "Move or cancel active reservations before removing the court.");
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`UPDATE club_courts SET active = 0, updated_at = ? WHERE id = ? AND club_id = ? AND active = 1`).bind(now, courtId, clubId).run();
  if (!result.meta.changes) throw new AppError(404, "court_not_found", "The court does not exist in this club.");
  await c.env.DB.prepare(`
    INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, 'club.court.removed', 'court', ?, '{}', ?)
  `).bind(crypto.randomUUID(), clubId, auth.userId, courtId, now).run();
  return c.json({ ok: true });
});

reservationRoutes.post("/:clubId/courts/:courtId/price-rules", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const courtId = c.req.param("courtId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const court = await c.env.DB.prepare(`
    SELECT id FROM club_courts WHERE id = ? AND club_id = ? AND active = 1
  `).bind(courtId, clubId).first<{ id: string }>();
  if (!court) throw new AppError(404, "court_not_found", "The court does not exist in this club.");

  const input = priceRuleInput(await readJsonObject(c));
  const overlapping = await c.env.DB.prepare(`
    SELECT id, court_id, day_key, start_time, end_time, price_minor
    FROM court_price_rules
    WHERE club_id = ? AND court_id = ? AND day_key = ? AND end_time > ? AND start_time < ?
    ORDER BY start_time
  `).bind(clubId, courtId, input.dayKey, input.startTime, input.endTime).all<PriceRuleRow>();
  const now = new Date().toISOString();
  const statements = (overlapping.results || []).map((rule) =>
    c.env.DB.prepare(`DELETE FROM court_price_rules WHERE id = ? AND club_id = ?`).bind(rule.id, clubId)
  );
  for (const rule of overlapping.results || []) {
    if (rule.start_time < input.startTime) {
      statements.push(c.env.DB.prepare(`
        INSERT INTO court_price_rules (id, club_id, court_id, day_key, start_time, end_time, price_minor, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), clubId, courtId, rule.day_key, rule.start_time, input.startTime, rule.price_minor, auth.userId, now, now));
    }
    if (rule.end_time > input.endTime) {
      statements.push(c.env.DB.prepare(`
        INSERT INTO court_price_rules (id, club_id, court_id, day_key, start_time, end_time, price_minor, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), clubId, courtId, rule.day_key, input.endTime, rule.end_time, rule.price_minor, auth.userId, now, now));
    }
  }
  const id = crypto.randomUUID();
  statements.push(c.env.DB.prepare(`
    INSERT INTO court_price_rules (id, club_id, court_id, day_key, start_time, end_time, price_minor, created_by_user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, clubId, courtId, input.dayKey, input.startTime, input.endTime, input.priceMinor, auth.userId, now, now));
  statements.push(c.env.DB.prepare(`
    INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, 'club.court.price_rule.saved', 'court', ?, ?, ?)
  `).bind(crypto.randomUUID(), clubId, auth.userId, courtId, JSON.stringify(input), now));
  await c.env.DB.batch(statements);
  return c.json({ ok: true, priceRule: { id, courtId, ...input } }, 201);
});

reservationRoutes.delete("/:clubId/courts/:courtId/price-rules/:ruleId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const courtId = c.req.param("courtId");
  const ruleId = c.req.param("ruleId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const rule = await c.env.DB.prepare(`
    SELECT id, day_key, start_time, end_time, price_minor
    FROM court_price_rules WHERE id = ? AND club_id = ? AND court_id = ?
  `).bind(ruleId, clubId, courtId).first<PriceRuleRow>();
  if (!rule) throw new AppError(404, "price_rule_not_found", "The court price interval does not exist.");
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM court_price_rules WHERE id = ? AND club_id = ? AND court_id = ?`).bind(ruleId, clubId, courtId),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'club.court.price_rule.removed', 'court_price_rule', ?, ?, ?)
    `).bind(crypto.randomUUID(), clubId, auth.userId, ruleId, JSON.stringify({ courtId, dayKey: rule.day_key, startTime: rule.start_time, endTime: rule.end_time, priceMinor: rule.price_minor }), now),
  ]);
  return c.json({ ok: true });
});

reservationRoutes.post("/:clubId/court-blocks", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const body = await readJsonObject(c);
  const courtIds = Array.isArray(body.courtIds)
    ? [...new Set(body.courtIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  if (!courtIds.length) throw new AppError(400, "court_required", "Select at least one court.");
  const placeholders = courtIds.map(() => "?").join(",");
  const validCourts = await c.env.DB.prepare(`SELECT id FROM club_courts WHERE club_id = ? AND active = 1 AND id IN (${placeholders})`)
    .bind(clubId, ...courtIds).all<{ id: string }>();
  if ((validCourts.results || []).length !== courtIds.length) throw new AppError(400, "invalid_court", "Every selected court must be active in this club.");
  const time = validateBookingTime(body.date, body.start, body.end);
  const allowedTypes = ["tournament", "demo", "training", "service", "maintenance", "other"];
  const blockType = typeof body.blockType === "string" && allowedTypes.includes(body.blockType) ? body.blockType : "other";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const color = typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : "#7c4dff";
  if (!title) throw new AppError(400, "title_required", "A block title is required.");
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  const blocks = courtIds.map((courtId) => ({ id: crypto.randomUUID(), courtId }));
  for (const block of blocks) {
    statements.push(c.env.DB.prepare(`
      INSERT INTO court_blocks (id, club_id, court_id, block_date, start_time, end_time, block_type, title, note, color, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(block.id, clubId, block.courtId, time.date, time.start, time.end, blockType, title, note || null, color, auth.userId, now, now));
    for (const slot of time.slots) {
      statements.push(c.env.DB.prepare(`INSERT INTO court_block_slots (block_id, court_id, slot_at) VALUES (?, ?, ?)`)
        .bind(block.id, block.courtId, slot));
    }
  }
  statements.push(c.env.DB.prepare(`
    INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, 'club.court_block.created', 'court_block', ?, ?, ?)
  `).bind(crypto.randomUUID(), clubId, auth.userId, blocks[0]!.id, JSON.stringify({ courtIds, date: time.date, start: time.start, end: time.end, blockType }), now));
  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    databaseConflict(error);
  }
  return c.json({ ok: true, blocks }, 201);
});

reservationRoutes.delete("/:clubId/court-blocks/:blockId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const blockId = c.req.param("blockId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const result = await c.env.DB.prepare(`DELETE FROM court_blocks WHERE id = ? AND club_id = ?`).bind(blockId, clubId).run();
  if (!result.meta.changes) throw new AppError(404, "block_not_found", "The court block does not exist.");
  await c.env.DB.prepare(`
    INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, 'club.court_block.deleted', 'court_block', ?, '{}', ?)
  `).bind(crypto.randomUUID(), clubId, auth.userId, blockId, new Date().toISOString()).run();
  return c.json({ ok: true });
});

reservationRoutes.get("/:clubId/reservation-series", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const rows = await c.env.DB.prepare(`
    SELECT series.*, courts.name AS court_name,
      COALESCE(members.display_name_override, users.display_name) AS owner_name,
      (SELECT COUNT(*) FROM reservations r WHERE r.series_id = series.id AND r.status != 'cancelled') AS occurrence_count
    FROM reservation_series series
    JOIN club_courts courts ON courts.id = series.court_id
    JOIN club_memberships members ON members.id = series.owner_membership_id
    JOIN platform_users users ON users.id = members.user_id
    WHERE series.club_id = ? ORDER BY series.status, series.start_date, series.start_time
  `).bind(clubId).all<any>();
  return c.json({ ok: true, series: (rows.results || []).map((item) => ({
    id: item.id, courtId: item.court_id, courtName: item.court_name, ownerMembershipId: item.owner_membership_id,
    ownerName: item.owner_name, startDate: item.start_date, endDate: item.end_date, start: item.start_time,
    end: item.end_time, weekday: Number(item.weekday), gameType: item.game_type, title: item.title,
    status: item.status, occurrenceCount: Number(item.occurrence_count),
  })) });
});

reservationRoutes.post("/:clubId/reservation-series", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const body = await readJsonObject(c);
  const gameType = body.gameType === "single" || body.gameType === "double" ? body.gameType : null;
  if (!gameType) throw new AppError(400, "invalid_game_type", "gameType must be single or double.");
  const courtId = typeof body.courtId === "string" ? body.courtId : "";
  const ownerMembershipId = typeof body.ownerMembershipId === "string" ? body.ownerMembershipId : "";
  const participantIds = Array.isArray(body.participantMembershipIds)
    ? [...new Set(body.participantMembershipIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  const target = gameType === "single" ? 2 : 4;
  if (!ownerMembershipId || participantIds.includes(ownerMembershipId) || participantIds.length > target - 1) {
    throw new AppError(400, "invalid_participants", "The recurring lineup does not match the game type.");
  }
  const valid = await activeMembers(c.env.DB, clubId, [ownerMembershipId, ...participantIds]);
  if (valid.size !== participantIds.length + 1) throw new AppError(400, "invalid_participants", "Every recurring player must be active in this club.");
  const court = await c.env.DB.prepare(`SELECT id,name,open_time,close_time FROM club_courts WHERE id=? AND club_id=? AND active=1`).bind(courtId, clubId).first<{ id:string; name:string; open_time:string; close_time:string }>();
  if (!court) throw new AppError(404, "court_not_found", "The court does not exist in this club.");
  const startDate = typeof body.startDate === "string" ? body.startDate : "";
  const endDate = typeof body.endDate === "string" ? body.endDate : "";
  const first = validateBookingTime(startDate, body.start, body.end);
  validateBookingTime(endDate, body.start, body.end);
  if (startDate > endDate || first.start < court.open_time || first.end > court.close_time) throw new AppError(400, "invalid_series_range", "Recurring reservation dates or hours are invalid.");
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const last = new Date(`${endDate}T12:00:00Z`);
  while (cursor <= last && dates.length < 61) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  if (!dates.length || cursor <= last) throw new AppError(400, "series_too_long", "A recurring series can contain at most 61 weekly reservations.");
  const seriesId = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const complete = participantIds.length + 1 >= target;
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`INSERT INTO reservation_series (id,club_id,court_id,owner_membership_id,created_by_membership_id,start_date,end_date,start_time,end_time,weekday,game_type,title,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?)`)
      .bind(seriesId,clubId,court.id,ownerMembershipId,actor.membershipId,startDate,endDate,first.start,first.end,new Date(`${startDate}T12:00:00Z`).getUTCDay(),gameType,title,now,now),
    c.env.DB.prepare(`INSERT INTO reservation_series_participants (series_id,membership_id,participant_role) VALUES (?,?,'owner')`).bind(seriesId,ownerMembershipId),
  ];
  const seriesParticipantRows: unknown[][] = [[seriesId, ownerMembershipId, "owner"], ...participantIds.map((id) => [seriesId, id, "confirmed"])];
  statements.pop();
  statements.push(c.env.DB.prepare(`INSERT INTO reservation_series_participants (series_id,membership_id,participant_role) VALUES ${seriesParticipantRows.map(() => "(?,?,?)").join(",")}`).bind(...seriesParticipantRows.flat()));
  const reservationRows: unknown[][] = [];
  const participantRows: unknown[][] = [];
  const slotRows: unknown[][] = [];
  const busyRows: unknown[][] = [];
  for (const date of dates) {
    const time = validateBookingTime(date, first.start, first.end);
    const reservationId = crypto.randomUUID();
    reservationRows.push([reservationId,clubId,court.id,ownerMembershipId,date,first.start,first.end,gameType,complete?"confirmed":"searching",title||"Trvala rezervace",now,now,seriesId]);
    participantRows.push([reservationId,ownerMembershipId,"owner",actor.membershipId,now,now,now]);
    for (const participantId of participantIds) participantRows.push([reservationId,participantId,"confirmed",actor.membershipId,now,now,now]);
    for (const slot of time.slots) {
      slotRows.push([reservationId,court.id,slot]);
      for (const membershipId of [ownerMembershipId,...participantIds]) busyRows.push([clubId,membershipId,reservationId,slot]);
    }
  }
  statements.push(c.env.DB.prepare(`INSERT INTO reservations (id,club_id,court_id,owner_membership_id,reservation_date,start_time,end_time,game_type,status,title,created_at,updated_at,series_id) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]'),json_extract(value,'$[4]'),json_extract(value,'$[5]'),json_extract(value,'$[6]'),json_extract(value,'$[7]'),json_extract(value,'$[8]'),json_extract(value,'$[9]'),json_extract(value,'$[10]'),json_extract(value,'$[11]'),json_extract(value,'$[12]') FROM json_each(?)`).bind(JSON.stringify(reservationRows)));
  statements.push(c.env.DB.prepare(`INSERT INTO reservation_participants (reservation_id,membership_id,status,invited_by_membership_id,responded_at,created_at,updated_at) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]'),json_extract(value,'$[4]'),json_extract(value,'$[5]'),json_extract(value,'$[6]') FROM json_each(?)`).bind(JSON.stringify(participantRows)));
  statements.push(c.env.DB.prepare(`INSERT INTO reservation_slots (reservation_id,court_id,slot_at) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?)`).bind(JSON.stringify(slotRows)));
  statements.push(c.env.DB.prepare(`INSERT INTO member_busy_slots (club_id,membership_id,reservation_id,slot_at) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]') FROM json_each(?)`).bind(JSON.stringify(busyRows)));
  for (const membershipId of [ownerMembershipId,...participantIds]) statements.push(c.env.DB.prepare(`INSERT INTO member_notifications (id,club_id,recipient_membership_id,actor_membership_id,type,title,body,entity_type,entity_id,created_at) VALUES (?,?,?,?, 'recurring_reservation_created','Nova trvala rezervace',?,'reservation_series',?,?)`).bind(crypto.randomUUID(),clubId,membershipId,actor.membershipId,`${court.name}, kazdy tyden ${first.start}-${first.end}, ${startDate} az ${endDate}.`,seriesId,now));
  try { await c.env.DB.batch(statements); } catch (error) { databaseConflict(error); }
  return c.json({ ok:true, series:{ id:seriesId, occurrences:dates.length } }, 201);
});

reservationRoutes.delete("/:clubId/reservation-series/:seriesId", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]);
  const series=await c.env.DB.prepare(`SELECT id,start_date,end_date FROM reservation_series WHERE id=? AND club_id=? AND status='active'`).bind(c.req.param("seriesId"),clubId).first<{id:string;start_date:string;end_date:string}>(); if(!series) throw new AppError(404,"series_not_found","Active recurring reservation does not exist.");
  const from=typeof c.req.query("from")==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(c.req.query("from")||"")?c.req.query("from")!:series.start_date; const ids=await c.env.DB.prepare(`SELECT id FROM reservations WHERE series_id=? AND reservation_date>=? AND status!='completed'`).bind(series.id,from).all<{id:string}>(); const now=new Date().toISOString(); const statements:D1PreparedStatement[]=[];
  for(const row of ids.results||[]){statements.push(c.env.DB.prepare(`DELETE FROM member_busy_slots WHERE reservation_id=?`).bind(row.id)); statements.push(c.env.DB.prepare(`DELETE FROM reservation_slots WHERE reservation_id=?`).bind(row.id)); statements.push(c.env.DB.prepare(`UPDATE reservations SET status='cancelled',updated_at=? WHERE id=?`).bind(now,row.id));}
  const previous=new Date(`${from}T12:00:00Z`); previous.setUTCDate(previous.getUTCDate()-1); statements.push(c.env.DB.prepare(`UPDATE reservation_series SET status=?,end_date=?,updated_at=? WHERE id=?`).bind(from<=series.start_date?"cancelled":"completed",from<=series.start_date?series.end_date:previous.toISOString().slice(0,10),now,series.id)); await c.env.DB.batch(statements); return c.json({ok:true,cancelledOccurrences:(ids.results||[]).length});
});

reservationRoutes.post("/:clubId/reservations/:reservationId/remind", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const actor=await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager"]);
  const reservation=await c.env.DB.prepare(`SELECT r.id,r.reservation_date,r.start_time,r.end_time,c.name AS court_name FROM reservations r JOIN club_courts c ON c.id=r.court_id WHERE r.id=? AND r.club_id=? AND r.status IN ('pending','confirmed','searching')`).bind(c.req.param("reservationId"),clubId).first<any>();
  if(!reservation) throw new AppError(404,"reservation_not_found","Active reservation does not exist."); const now=new Date().toISOString();
  const result=await c.env.DB.prepare(`INSERT INTO member_notifications (id,club_id,recipient_membership_id,actor_membership_id,type,title,body,entity_type,entity_id,created_at) SELECT lower(hex(randomblob(16))),?,p.membership_id,?,'reservation_reminder','Pripominka rezervace',?,'reservation_reminder',?,? FROM reservation_participants p WHERE p.reservation_id=? AND p.status IN ('owner','pending','confirmed','replacement')`).bind(clubId,actor.membershipId,`${reservation.court_name}, ${reservation.reservation_date} ${reservation.start_time}-${reservation.end_time}.`,reservation.id,now,reservation.id).run();
  return c.json({ok:true,recipients:Number(result.meta.changes||0)});
});

reservationRoutes.post("/:clubId/reservations", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const body = await readJsonObject(c);
  const requestedOwnerId = typeof body.ownerMembershipId === "string" ? body.ownerMembershipId : "";
  const ownerMembershipId = requestedOwnerId && ["admin", "manager"].includes(membership.role) ? requestedOwnerId : membership.membershipId;
  if (ownerMembershipId !== membership.membershipId) {
    const owner = await activeMembers(c.env.DB, clubId, [ownerMembershipId]);
    if (owner.size !== 1) throw new AppError(400, "invalid_owner", "Reservation owner must be an active club player.");
  }
  const gameType = body.gameType === "single" || body.gameType === "double" ? body.gameType : null;
  if (!gameType) throw new AppError(400, "invalid_game_type", "gameType must be single or double.");
  const participantMode = body.participantMode === "confirmed" ? "confirmed" : "pending";
  const participantIds = Array.isArray(body.participantMembershipIds)
    ? [...new Set(body.participantMembershipIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  const targetPlayers = gameType === "single" ? 2 : 4;
  if (participantIds.includes(ownerMembershipId) || participantIds.length > targetPlayers - 1) {
    throw new AppError(400, "invalid_participants", "The selected participants do not match the game type.");
  }
  const validMembers = await activeMembers(c.env.DB, clubId, participantIds);
  if (validMembers.size !== participantIds.length) {
    throw new AppError(400, "invalid_participants", "Every participant must be an active member of this club.");
  }
  const courtId = typeof body.courtId === "string" ? body.courtId : "";
  const court = await c.env.DB.prepare(`
    SELECT id, name, surface, color, photo_url, open_time, close_time
    FROM club_courts WHERE id = ? AND club_id = ? AND active = 1
  `).bind(courtId, clubId).first<CourtRow>();
  if (!court) throw new AppError(404, "court_not_found", "The court does not exist in this club.");
  const time = validateBookingTime(body.date, body.start, body.end);
  if (time.start < court.open_time || time.end > court.close_time) {
    throw new AppError(400, "outside_opening_hours", "The reservation is outside this court's opening hours.");
  }
  const now = new Date().toISOString();
  const reservationId = crypto.randomUUID();
  const status = participantIds.length + 1 >= targetPlayers && participantMode === "confirmed" ? "confirmed" : "pending";
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`
      INSERT INTO reservations (id, club_id, court_id, owner_membership_id, reservation_date, start_time, end_time, game_type, status, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(reservationId, clubId, court.id, ownerMembershipId, time.date, time.start, time.end, gameType, status, typeof body.title === "string" ? body.title.slice(0, 120) : null, now, now),
    c.env.DB.prepare(`
      INSERT INTO reservation_participants (reservation_id, membership_id, status, invited_by_membership_id, created_at, updated_at)
      VALUES (?, ?, 'owner', ?, ?, ?)
    `).bind(reservationId, ownerMembershipId, membership.membershipId, now, now),
  ];
  for (const slot of time.slots) {
    statements.push(c.env.DB.prepare(`INSERT INTO reservation_slots (reservation_id, court_id, slot_at) VALUES (?, ?, ?)`).bind(reservationId, court.id, slot));
    statements.push(c.env.DB.prepare(`INSERT INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at) VALUES (?, ?, ?, ?)`).bind(clubId, ownerMembershipId, reservationId, slot));
  }
  for (const participantId of participantIds) {
    statements.push(c.env.DB.prepare(`
      INSERT INTO reservation_participants (reservation_id, membership_id, status, invited_by_membership_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(reservationId, participantId, participantMode, membership.membershipId, now, now));
    for (const slot of time.slots) {
      statements.push(c.env.DB.prepare(`INSERT INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at) VALUES (?, ?, ?, ?)`).bind(clubId, participantId, reservationId, slot));
    }
    if (participantMode === "pending") {
      statements.push(c.env.DB.prepare(`
        INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
        VALUES (?, ?, ?, ?, 'reservation_invite', 'Pozvanka na hru', ?, 'reservation', ?, ?)
      `).bind(crypto.randomUUID(), clubId, participantId, membership.membershipId, `${time.date} ${time.start}-${time.end}, ${court.name}`, reservationId, now));
    }
  }
  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    databaseConflict(error);
  }
  return c.json({ ok: true, reservation: { id: reservationId, status } }, 201);
});

reservationRoutes.get("/:clubId/me/reservations", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const result = await c.env.DB.prepare(`
    SELECT r.id, r.court_id, courts.name AS court_name, courts.surface, r.reservation_date, r.title, r.series_id, r.created_at,
      r.start_time, r.end_time, r.game_type, r.status, r.owner_membership_id,
      participants.status AS participant_status, 0 AS active_count
    FROM reservation_participants participants
    JOIN reservations r ON r.id = participants.reservation_id
    JOIN club_courts courts ON courts.id = r.court_id
    WHERE r.club_id = ? AND participants.membership_id = ?
      AND (
        participants.status IN ('owner','pending','confirmed','replacement')
        OR (participants.status = 'declined' AND participants.withdrawn_at IS NOT NULL)
      ) AND r.status != 'cancelled'
    ORDER BY r.reservation_date, r.start_time
  `).bind(clubId, membership.membershipId).all<ReservationRow>();
  const rows = result.results || [];
  const participants = await reservationParticipants(c.env.DB, clubId, rows.map((item) => item.id));
  const cancellationMinutes = await clubCancellationMinutes(c.env.DB, clubId);
  const now = Date.now();
  return c.json({ ok: true, reservations: rows.map((item) => ({
    id: item.id,
    seriesId: item.series_id,
    courtId: item.court_id,
    courtName: item.court_name,
    surface: item.surface,
    date: item.reservation_date,
    start: item.start_time,
    end: item.end_time,
    gameType: item.game_type,
    status: item.status,
    title: item.title,
    ownerMembershipId: item.owner_membership_id,
    participantStatus: item.participant_status,
    createdAt: item.created_at,
    canEditParticipants: item.owner_membership_id === membership.membershipId && item.status !== "completed",
    canCancel: item.owner_membership_id === membership.membershipId
      && cancellationMinutes > 0
      && now <= new Date(item.created_at).getTime() + cancellationMinutes * 60_000,
    canCancelUntil: cancellationDeadline(item.created_at, cancellationMinutes),
    participants: (participants.get(item.id) || []).map(participantJson),
  })), cancellationMinutes });
});

reservationRoutes.patch("/:clubId/reservations/:reservationId/participants", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const reservationId = c.req.param("reservationId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const body = await readJsonObject(c);
  const reservation = await c.env.DB.prepare(`
    SELECT id, owner_membership_id, game_type, status, reservation_date, start_time, end_time
    FROM reservations WHERE id = ? AND club_id = ?
  `).bind(reservationId, clubId).first<{
    id: string; owner_membership_id: string; game_type: "single" | "double"; status: string;
    reservation_date: string; start_time: string; end_time: string;
  }>();
  if (!reservation || ["cancelled", "completed"].includes(reservation.status)) {
    throw new AppError(404, "reservation_not_found", "Active reservation does not exist.");
  }
  const canManage = reservation.owner_membership_id === actor.membershipId || ["admin", "manager"].includes(actor.role);
  if (!canManage) throw new AppError(403, "reservation_owner_required", "Only the reservation owner or club manager can change players.");

  const requestedIds = Array.isArray(body.participantMembershipIds)
    ? [...new Set(body.participantMembershipIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  const target = reservation.game_type === "single" ? 2 : 4;
  if (requestedIds.includes(reservation.owner_membership_id) || requestedIds.length > target - 1) {
    throw new AppError(400, "invalid_participants", "The selected participants do not match the game type.");
  }
  const valid = await activeMembers(c.env.DB, clubId, requestedIds);
  if (valid.size !== requestedIds.length) {
    throw new AppError(400, "invalid_participants", "Every participant must be an active player of this club.");
  }
  const participantMode = body.participantMode === "confirmed" ? "confirmed" : "pending";
  const existingResult = await c.env.DB.prepare(`
    SELECT membership_id, status FROM reservation_participants
    WHERE reservation_id = ? AND membership_id != ?
  `).bind(reservationId, reservation.owner_membership_id).all<{ membership_id: string; status: string }>();
  const existing = new Map((existingResult.results || []).map((row) => [row.membership_id, row.status]));
  const requested = new Set(requestedIds);
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  let activeCount = 1;
  let pendingCount = 0;

  for (const [membershipId, previousStatus] of existing) {
    if (!requested.has(membershipId)) {
      statements.push(
        c.env.DB.prepare(`DELETE FROM member_busy_slots WHERE reservation_id = ? AND membership_id = ?`).bind(reservationId, membershipId),
        c.env.DB.prepare(`DELETE FROM reservation_participants WHERE reservation_id = ? AND membership_id = ?`).bind(reservationId, membershipId),
        c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE club_id = ? AND recipient_membership_id = ? AND entity_type = 'reservation' AND entity_id = ? AND acted_at IS NULL`)
          .bind(now, now, clubId, membershipId, reservationId),
      );
      if (["pending", "confirmed", "replacement"].includes(previousStatus)) {
        statements.push(c.env.DB.prepare(`
          INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
          VALUES (?, ?, ?, ?, 'reservation_lineup_removed', 'Zmena sestavy', ?, 'reservation', ?, ?)
        `).bind(crypto.randomUUID(), clubId, membershipId, actor.membershipId, `${reservation.reservation_date} ${reservation.start_time}-${reservation.end_time}: vlastnik rezervace zmenil sestavu.`, reservationId, now));
      }
      continue;
    }
    if (["confirmed", "replacement"].includes(previousStatus)) activeCount += 1;
    else {
      statements.push(
        c.env.DB.prepare(`UPDATE reservation_participants SET status = ?, withdrawn_at = NULL, responded_at = ?, updated_at = ? WHERE reservation_id = ? AND membership_id = ?`)
          .bind(participantMode, participantMode === "confirmed" ? now : null, now, reservationId, membershipId),
        c.env.DB.prepare(`INSERT OR IGNORE INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at) SELECT ?, ?, ?, slot_at FROM reservation_slots WHERE reservation_id = ?`)
          .bind(clubId, membershipId, reservationId, reservationId),
      );
      if (participantMode === "pending") pendingCount += 1;
      else activeCount += 1;
    }
  }

  for (const membershipId of requestedIds.filter((id) => !existing.has(id))) {
    statements.push(
      c.env.DB.prepare(`INSERT INTO reservation_participants (reservation_id, membership_id, status, invited_by_membership_id, responded_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(reservationId, membershipId, participantMode, actor.membershipId, participantMode === "confirmed" ? now : null, now, now),
      c.env.DB.prepare(`INSERT INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at) SELECT ?, ?, ?, slot_at FROM reservation_slots WHERE reservation_id = ?`)
        .bind(clubId, membershipId, reservationId, reservationId),
      c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'reservation', ?, ?)`)
        .bind(
          crypto.randomUUID(), clubId, membershipId, actor.membershipId,
          participantMode === "pending" ? "reservation_invite" : "reservation_lineup_added",
          participantMode === "pending" ? "Pozvanka na hru" : "Pridan do rezervace",
          `${reservation.reservation_date} ${reservation.start_time}-${reservation.end_time}.`, reservationId, now,
        ),
    );
    if (participantMode === "pending") pendingCount += 1;
    else activeCount += 1;
  }

  const nextStatus = activeCount >= target && pendingCount === 0 ? "confirmed" : pendingCount > 0 ? "pending" : "searching";
  statements.push(
    c.env.DB.prepare(`UPDATE reservations SET status = ?, updated_at = ? WHERE id = ? AND club_id = ?`).bind(nextStatus, now, reservationId, clubId),
    c.env.DB.prepare(`INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, 'reservation.participants.updated', 'reservation', ?, ?, ?)`)
      .bind(crypto.randomUUID(), clubId, auth.userId, reservationId, JSON.stringify({ participantMembershipIds: requestedIds, participantMode }), now),
  );
  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    databaseConflict(error);
  }
  return c.json({ ok: true, status: nextStatus });
});

reservationRoutes.delete("/:clubId/reservations/:reservationId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const reservationId = c.req.param("reservationId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const reservation = await c.env.DB.prepare(`
    SELECT id, owner_membership_id, status, reservation_date, start_time, end_time, created_at
    FROM reservations WHERE id = ? AND club_id = ?
  `).bind(reservationId, clubId).first<{
    id: string; owner_membership_id: string; status: string; reservation_date: string;
    start_time: string; end_time: string; created_at: string;
  }>();
  if (!reservation || ["cancelled", "completed"].includes(reservation.status)) {
    throw new AppError(404, "reservation_not_found", "Active reservation does not exist.");
  }
  const isManager = ["admin", "manager"].includes(actor.role);
  if (reservation.owner_membership_id !== actor.membershipId && !isManager) {
    throw new AppError(403, "reservation_owner_required", "Only the reservation owner or club manager can cancel it.");
  }
  const cancellationMinutes = await clubCancellationMinutes(c.env.DB, clubId);
  const deadline = cancellationDeadline(reservation.created_at, cancellationMinutes);
  if (!isManager && (cancellationMinutes === 0 || Date.now() > new Date(deadline).getTime())) {
    throw new AppError(409, "cancellation_window_expired", "The correction time for cancelling this reservation has expired.");
  }
  const recipients = await c.env.DB.prepare(`SELECT membership_id FROM reservation_participants WHERE reservation_id = ? AND membership_id != ? AND status IN ('pending','confirmed','replacement')`)
    .bind(reservationId, actor.membershipId).all<{ membership_id: string }>();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`DELETE FROM member_busy_slots WHERE reservation_id = ?`).bind(reservationId),
    c.env.DB.prepare(`DELETE FROM reservation_slots WHERE reservation_id = ?`).bind(reservationId),
    c.env.DB.prepare(`UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ? AND club_id = ?`).bind(now, reservationId, clubId),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE club_id = ? AND entity_type = 'reservation' AND entity_id = ? AND acted_at IS NULL`).bind(now, now, clubId, reservationId),
    c.env.DB.prepare(`INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, 'reservation.cancelled', 'reservation', ?, ?, ?)`)
      .bind(crypto.randomUUID(), clubId, auth.userId, reservationId, JSON.stringify({ cancellationMinutes, deadline, managerOverride: isManager }), now),
  ];
  for (const recipient of recipients.results || []) {
    statements.push(c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, 'reservation_cancelled', 'Rezervace zrusena', ?, 'reservation', ?, ?)`)
      .bind(crypto.randomUUID(), clubId, recipient.membership_id, actor.membershipId, `${reservation.reservation_date} ${reservation.start_time}-${reservation.end_time}.`, reservationId, now));
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true, cancelledAt: now });
});

reservationRoutes.get("/:clubId/me/notifications", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const result = await c.env.DB.prepare(`
    SELECT id, type, title, body, entity_type, entity_id, actor_membership_id, read_at, acted_at, created_at
    FROM member_notifications
    WHERE club_id = ? AND recipient_membership_id = ? AND acted_at IS NULL
    ORDER BY created_at DESC
  `).bind(clubId, membership.membershipId).all<{
    id: string; type: string; title: string; body: string; entity_type: string | null; actor_membership_id: string | null;
    entity_id: string | null; read_at: string | null; acted_at: string | null; created_at: string;
  }>();
  return c.json({ ok: true, notifications: result.results || [] });
});

reservationRoutes.post("/:clubId/me/notifications/:notificationId/dismiss", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`
    UPDATE member_notifications SET read_at = COALESCE(read_at, ?), acted_at = ?
    WHERE id = ? AND club_id = ? AND recipient_membership_id = ? AND acted_at IS NULL
  `).bind(now, now, c.req.param("notificationId"), clubId, membership.membershipId).run();
  if (!result.meta.changes) throw new AppError(404, "notification_not_found", "The active notification does not exist.");
  return c.json({ ok: true });
});

reservationRoutes.post("/:clubId/reservations/:reservationId/respond", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const reservationId = c.req.param("reservationId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const body = await readJsonObject(c);
  const response = body.response === "accept" || body.response === "decline" ? body.response : null;
  if (!response) throw new AppError(400, "invalid_response", "response must be accept or decline.");
  const participant = await c.env.DB.prepare(`
    SELECT participants.status, reservations.owner_membership_id, reservations.game_type,
      reservations.reservation_date, reservations.start_time, reservations.end_time
    FROM reservation_participants participants
    JOIN reservations ON reservations.id = participants.reservation_id
    WHERE participants.reservation_id = ? AND participants.membership_id = ?
      AND reservations.club_id = ? AND reservations.status != 'cancelled'
  `).bind(reservationId, membership.membershipId, clubId).first<{
    status: string; owner_membership_id: string; game_type: "single" | "double";
    reservation_date: string; start_time: string; end_time: string;
  }>();
  if (!participant || participant.status !== "pending") {
    throw new AppError(409, "invitation_not_pending", "This invitation is no longer waiting for a response.");
  }
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE reservation_participants SET status = ?, responded_at = ?, updated_at = ? WHERE reservation_id = ? AND membership_id = ? AND status = 'pending'`)
      .bind(response === "accept" ? "confirmed" : "declined", now, now, reservationId, membership.membershipId),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE recipient_membership_id = ? AND entity_type = 'reservation' AND entity_id = ? AND acted_at IS NULL`)
      .bind(now, now, membership.membershipId, reservationId),
  ];
  if (response === "decline") {
    statements.push(c.env.DB.prepare(`DELETE FROM member_busy_slots WHERE membership_id = ? AND reservation_id = ?`).bind(membership.membershipId, reservationId));
    statements.push(c.env.DB.prepare(`UPDATE reservations SET status = 'searching', updated_at = ? WHERE id = ? AND club_id = ?`).bind(now, reservationId, clubId));
    statements.push(c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'reservation_declined', 'Spoluhrac se omluvil', ?, 'reservation', ?, ?)
    `).bind(crypto.randomUUID(), clubId, participant.owner_membership_id, membership.membershipId, `${participant.reservation_date} ${participant.start_time}-${participant.end_time}`, reservationId, now));
  } else {
    const target = participant.game_type === "single" ? 2 : 4;
    statements.push(c.env.DB.prepare(`
      UPDATE reservations SET status = CASE WHEN (
        SELECT COUNT(*) FROM reservation_participants
        WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')
      ) >= ? THEN 'confirmed' ELSE 'pending' END, updated_at = ?
      WHERE id = ? AND club_id = ?
    `).bind(reservationId, target, now, reservationId, clubId));
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true, response });
});

reservationRoutes.post("/:clubId/reservations/:reservationId/withdraw", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const reservationId = c.req.param("reservationId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const participant = await c.env.DB.prepare(`
    SELECT participants.status, reservations.owner_membership_id, reservations.game_type,
      reservations.reservation_date, reservations.start_time, reservations.end_time
    FROM reservation_participants participants
    JOIN reservations ON reservations.id = participants.reservation_id
    WHERE participants.reservation_id = ? AND participants.membership_id = ?
      AND reservations.club_id = ? AND reservations.status != 'completed'
  `).bind(reservationId, membership.membershipId, clubId).first<{
    status: string; owner_membership_id: string; game_type: "single" | "double";
    reservation_date: string; start_time: string; end_time: string;
  }>();
  if (!participant || !["owner", "confirmed", "replacement"].includes(participant.status)) {
    throw new AppError(409, "participation_not_active", "This player is not active in the reservation.");
  }
  const now = new Date().toISOString();
  const activeOthers = await c.env.DB.prepare(`
    SELECT COUNT(*) AS count FROM reservation_participants
    WHERE reservation_id = ? AND membership_id != ? AND status IN ('owner','confirmed','replacement')
  `).bind(reservationId, membership.membershipId).first<{ count: number }>();
  const remaining = Number(activeOthers?.count || 0);
  const recipients = await c.env.DB.prepare(`
    SELECT membership_id FROM reservation_participants
    WHERE reservation_id = ? AND membership_id != ? AND status IN ('owner','confirmed','replacement')
  `).bind(reservationId, membership.membershipId).all<{ membership_id: string }>();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE reservation_participants SET status = 'declined', withdrawn_at = ?, responded_at = ?, updated_at = ? WHERE reservation_id = ? AND membership_id = ?`)
      .bind(now, now, now, reservationId, membership.membershipId),
    c.env.DB.prepare(`DELETE FROM member_busy_slots WHERE membership_id = ? AND reservation_id = ?`)
      .bind(membership.membershipId, reservationId),
    c.env.DB.prepare(`UPDATE reservations SET status = ?, updated_at = ? WHERE id = ? AND club_id = ?`)
      .bind(remaining > 0 ? "searching" : "cancelled", now, reservationId, clubId),
  ];
  for (const recipient of recipients.results || []) {
    statements.push(c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'participant_withdrew', 'Hrac se omluvil', ?, 'reservation', ?, ?)
    `).bind(crypto.randomUUID(), clubId, recipient.membership_id, membership.membershipId, `${participant.reservation_date} ${participant.start_time}-${participant.end_time}. System hleda nahradnika.`, reservationId, now));
  }
  if (remaining > 0) await appendAutomaticReplacementCandidates(c.env.DB, clubId, reservationId, membership, statements, now);
  await c.env.DB.batch(statements);
  return c.json({ ok: true, status: remaining > 0 ? "searching" : "cancelled", canUndo: true });
});

reservationRoutes.post("/:clubId/reservations/:reservationId/withdraw/undo", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const reservationId = c.req.param("reservationId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const reservation = await c.env.DB.prepare(`
    SELECT reservations.owner_membership_id, reservations.game_type, reservations.reservation_date,
      reservations.start_time, reservations.end_time, participants.status, participants.withdrawn_at
    FROM reservations JOIN reservation_participants participants ON participants.reservation_id = reservations.id
    WHERE reservations.id = ? AND reservations.club_id = ? AND participants.membership_id = ?
      AND reservations.status != 'completed'
  `).bind(reservationId, clubId, membership.membershipId).first<{
    owner_membership_id: string; game_type: "single" | "double"; reservation_date: string;
    start_time: string; end_time: string; status: string; withdrawn_at: string | null;
  }>();
  if (!reservation || reservation.status !== "declined" || !reservation.withdrawn_at) {
    throw new AppError(409, "withdrawal_not_active", "There is no withdrawal to undo.");
  }
  const target = reservation.game_type === "single" ? 2 : 4;
  const active = await c.env.DB.prepare(`
    SELECT COUNT(*) AS count FROM reservation_participants
    WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')
  `).bind(reservationId).first<{ count: number }>();
  if (Number(active?.count || 0) >= target) {
    throw new AppError(409, "replacement_already_filled", "A replacement has already filled this place.");
  }
  const conflict = await c.env.DB.prepare(`
    SELECT busy.reservation_id FROM member_busy_slots busy
    JOIN reservation_slots slots ON slots.slot_at = busy.slot_at
    WHERE busy.club_id = ? AND busy.membership_id = ? AND slots.reservation_id = ?
      AND busy.reservation_id != ? LIMIT 1
  `).bind(clubId, membership.membershipId, reservationId, reservationId).first<{ reservation_id: string }>();
  if (conflict) throw new AppError(409, "player_time_conflict", "The player already has another reservation at this time.");
  const now = new Date().toISOString();
  const restoredStatus = reservation.owner_membership_id === membership.membershipId ? "owner" : "confirmed";
  const nextActive = Number(active?.count || 0) + 1;
  const nextReservationStatus = nextActive >= target ? "confirmed" : "searching";
  const recipients = await c.env.DB.prepare(`
    SELECT membership_id FROM reservation_participants
    WHERE reservation_id = ? AND membership_id != ? AND status IN ('owner','confirmed','replacement')
  `).bind(reservationId, membership.membershipId).all<{ membership_id: string }>();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE reservation_participants SET status = ?, withdrawn_at = NULL, responded_at = ?, updated_at = ? WHERE reservation_id = ? AND membership_id = ? AND status = 'declined' AND withdrawn_at IS NOT NULL`)
      .bind(restoredStatus, now, now, reservationId, membership.membershipId),
    c.env.DB.prepare(`INSERT INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at)
      SELECT ?, ?, ?, slot_at FROM reservation_slots WHERE reservation_id = ?`)
      .bind(clubId, membership.membershipId, reservationId, reservationId),
    c.env.DB.prepare(`UPDATE reservations SET status = ?, updated_at = ? WHERE id = ? AND club_id = ?`)
      .bind(nextReservationStatus, now, reservationId, clubId),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?)
      WHERE club_id = ? AND entity_type = 'reservation' AND entity_id = ? AND type = 'participant_withdrew' AND acted_at IS NULL`)
      .bind(now, now, clubId, reservationId),
    c.env.DB.prepare(`DELETE FROM replacement_votes WHERE reservation_id = ?`).bind(reservationId),
    c.env.DB.prepare(`UPDATE replacement_candidates SET status = 'cancelled', responded_at = ? WHERE reservation_id = ? AND status IN ('invited','accepted')`).bind(now, reservationId),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ?, read_at = COALESCE(read_at, ?) WHERE club_id = ? AND entity_type = 'reservation' AND entity_id = ? AND type = 'replacement_invite' AND acted_at IS NULL`).bind(now, now, clubId, reservationId),
  ];
  for (const recipient of recipients.results || []) {
    statements.push(c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'participant_returned', 'Hrac zrusil omluvenku', ?, 'reservation', ?, ?)
    `).bind(crypto.randomUUID(), clubId, recipient.membership_id, membership.membershipId, `${reservation.reservation_date} ${reservation.start_time}-${reservation.end_time}. Hrac je znovu v sestave.`, reservationId, now));
  }
  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    databaseConflict(error);
  }
  return c.json({ ok: true, status: nextReservationStatus });
});
