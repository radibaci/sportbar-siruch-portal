import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";
import { validateBookingTime } from "../reservations/time";

type EventRow = {
  id: string;
  event_type: string;
  title: string;
  detail: string;
  event_date: string;
  start_time: string;
  end_time: string;
  fee_label: string;
  capacity: number | null;
  image_url: string | null;
  status: string;
  cancellation_reason: string | null;
};

type RegistrationRow = { event_id: string; membership_id: string; display_name: string; status: string };

function eventInput(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 5000) : "";
  const time = validateBookingTime(body.date, body.start, body.end);
  const types = ["club", "demo", "tournament", "social", "training", "other"];
  const eventType = typeof body.eventType === "string" && types.includes(body.eventType) ? body.eventType : "club";
  const feeLabel = typeof body.feeLabel === "string" ? body.feeLabel.trim().slice(0, 80) || "Zdarma" : "Zdarma";
  const capacity = body.capacity === null || body.capacity === undefined || body.capacity === "" ? null : Number(body.capacity);
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!title) throw new AppError(400, "title_required", "Event title is required.");
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000)) {
    throw new AppError(400, "invalid_capacity", "Event capacity must be from 1 to 1000.");
  }
  if (imageUrl.length > 500_000 || (imageUrl && !/^(https:\/\/|assets\/|data:image\/(png|jpeg|webp);base64,)/i.test(imageUrl))) {
    throw new AppError(400, "invalid_image", "Event image must be an HTTPS URL or a supported image upload.");
  }
  return { title, detail, date: time.date, start: time.start, end: time.end, eventType, feeLabel, capacity, imageUrl: imageUrl || null };
}

async function eventRows(db: D1Database, clubId: string) {
  const events = await db.prepare(`
    SELECT id, event_type, title, detail, event_date, start_time, end_time, fee_label, capacity, image_url, status, cancellation_reason
    FROM club_events WHERE club_id = ? ORDER BY event_date, start_time, created_at
  `).bind(clubId).all<EventRow>();
  const registrations = await db.prepare(`
    SELECT registrations.event_id, registrations.membership_id,
      COALESCE(memberships.display_name_override, users.display_name) AS display_name,
      registrations.status
    FROM event_registrations registrations
    JOIN club_events events ON events.id = registrations.event_id AND events.club_id = ?
    JOIN club_memberships memberships ON memberships.id = registrations.membership_id
    JOIN platform_users users ON users.id = memberships.user_id
    ORDER BY registrations.registered_at
  `).bind(clubId).all<RegistrationRow>();
  return { events: events.results || [], registrations: registrations.results || [] };
}

export const eventRoutes = new Hono<AppEnv>();
eventRoutes.use("*", requireAuth);

eventRoutes.get("/:clubId/events", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const data = await eventRows(c.env.DB, clubId);
  const canManage = ["admin", "manager"].includes(membership.role);
  return c.json({
    ok: true,
    events: data.events.filter((event) => canManage || event.status === "published").map((event) => {
      const registrations = data.registrations.filter((item) => item.event_id === event.id && item.status === "registered");
      return {
        id: event.id,
        eventType: event.event_type,
        title: event.title,
        detail: event.detail,
        date: event.event_date,
        start: event.start_time,
        end: event.end_time,
        feeLabel: event.fee_label,
        capacity: event.capacity,
        imageUrl: event.image_url,
        status: event.status,
        cancellationReason: event.cancellation_reason,
        registrations: registrations.map((item) => ({ membershipId: item.membership_id, displayName: item.display_name })),
        isRegistered: registrations.some((item) => item.membership_id === membership.membershipId),
      };
    }),
  });
});

eventRoutes.post("/:clubId/events", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const input = eventInput(await readJsonObject(c));
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO club_events (id, club_id, created_by_user_id, event_type, title, detail, event_date, start_time, end_time, fee_label, capacity, image_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
    `).bind(id, clubId, auth.userId, input.eventType, input.title, input.detail, input.date, input.start, input.end, input.feeLabel, input.capacity, input.imageUrl, now, now),
    c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      SELECT lower(hex(randomblob(16))), ?, memberships.id, ?, 'event_announcement', 'Nova klubova akce', ?, 'event', ?, ?
      FROM club_memberships memberships
      WHERE memberships.club_id = ? AND memberships.status = 'active' AND memberships.role = 'player'
    `).bind(clubId, actor.membershipId, `${input.date} ${input.start}-${input.end}, ${input.title}`, id, now, clubId),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'club.event.created', 'event', ?, ?, ?)
    `).bind(crypto.randomUUID(), clubId, auth.userId, id, JSON.stringify({ title: input.title, date: input.date }), now),
  ]);
  return c.json({ ok: true, event: { id, ...input, status: "published", registrations: [] } }, 201);
});

eventRoutes.put("/:clubId/events/:eventId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const eventId = c.req.param("eventId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const input = eventInput(await readJsonObject(c));
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`
    UPDATE club_events SET event_type = ?, title = ?, detail = ?, event_date = ?, start_time = ?, end_time = ?,
      fee_label = ?, capacity = ?, image_url = ?, updated_at = ?
    WHERE id = ? AND club_id = ? AND status != 'cancelled'
  `).bind(input.eventType, input.title, input.detail, input.date, input.start, input.end, input.feeLabel, input.capacity, input.imageUrl, now, eventId, clubId).run();
  if (!result.meta.changes) throw new AppError(404, "event_not_found", "The active event does not exist.");
  await c.env.DB.prepare(`
    INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, 'club.event.updated', 'event', ?, ?, ?)
  `).bind(crypto.randomUUID(), clubId, auth.userId, eventId, JSON.stringify({ title: input.title, date: input.date }), now).run();
  return c.json({ ok: true });
});

eventRoutes.post("/:clubId/events/:eventId/register", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const eventId = c.req.param("eventId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const event = await c.env.DB.prepare(`
    SELECT id, capacity, status FROM club_events WHERE id = ? AND club_id = ?
  `).bind(eventId, clubId).first<{ id: string; capacity: number | null; status: string }>();
  if (!event || event.status !== "published") throw new AppError(404, "event_not_available", "The event is not available for registration.");
  const count = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM event_registrations WHERE event_id = ? AND status = 'registered'`)
    .bind(eventId).first<{ count: number }>();
  if (event.capacity && Number(count?.count || 0) >= event.capacity) throw new AppError(409, "event_full", "The event is full.");
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO event_registrations (event_id, membership_id, status, registered_at, updated_at)
      VALUES (?, ?, 'registered', ?, ?)
      ON CONFLICT(event_id, membership_id) DO UPDATE SET status = 'registered', updated_at = excluded.updated_at
    `).bind(eventId, membership.membershipId, now, now),
    c.env.DB.prepare(`UPDATE member_notifications SET acted_at = ? WHERE recipient_membership_id = ? AND entity_type = 'event' AND entity_id = ? AND acted_at IS NULL`)
      .bind(now, membership.membershipId, eventId),
  ]);
  return c.json({ ok: true });
});

eventRoutes.delete("/:clubId/events/:eventId/register", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const result = await c.env.DB.prepare(`UPDATE event_registrations SET status = 'cancelled', updated_at = ? WHERE event_id = ? AND membership_id = ?`)
    .bind(new Date().toISOString(), c.req.param("eventId"), membership.membershipId).run();
  if (!result.meta.changes) throw new AppError(404, "registration_not_found", "The event registration does not exist.");
  return c.json({ ok: true });
});

eventRoutes.post("/:clubId/events/:eventId/cancel", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const eventId = c.req.param("eventId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const body = await readJsonObject(c);
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (!reason) throw new AppError(400, "reason_required", "A cancellation reason is required.");
  const event = await c.env.DB.prepare(`SELECT title, event_date, start_time FROM club_events WHERE id = ? AND club_id = ? AND status = 'published'`)
    .bind(eventId, clubId).first<{ title: string; event_date: string; start_time: string }>();
  if (!event) throw new AppError(404, "event_not_found", "The published event does not exist.");
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE club_events SET status = 'cancelled', cancellation_reason = ?, updated_at = ? WHERE id = ? AND club_id = ?`)
      .bind(reason, now, eventId, clubId),
    c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      SELECT lower(hex(randomblob(16))), ?, registrations.membership_id, ?, 'event_cancelled', 'Akce zrusena', ?, 'event', ?, ?
      FROM event_registrations registrations WHERE registrations.event_id = ? AND registrations.status = 'registered'
    `).bind(clubId, actor.membershipId, `${event.event_date} ${event.start_time}, ${event.title}. Duvod: ${reason}`, eventId, now, eventId),
    c.env.DB.prepare(`UPDATE event_registrations SET status = 'cancelled', updated_at = ? WHERE event_id = ? AND status = 'registered'`).bind(now, eventId),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'club.event.cancelled', 'event', ?, ?, ?)
    `).bind(crypto.randomUUID(), clubId, auth.userId, eventId, JSON.stringify({ reason }), now),
  ]);
  return c.json({ ok: true });
});
