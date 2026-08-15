import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";

type OrderRow = {
  id: string; membership_id: string; display_name: string; product_name: string; product_type: string;
  amount_minor: number; delivery_mode: string; pickup_date: string | null; reservation_id: string | null;
  event_id: string | null; note: string; source: string; status: string; created_at: string; updated_at: string;
  reservation_date: string | null; reservation_start: string | null; event_title: string | null;
};

function orderJson(row: OrderRow) {
  return {
    id: row.id,
    membershipId: row.membership_id,
    displayName: row.display_name,
    productName: row.product_name,
    productType: row.product_type,
    amountMinor: Number(row.amount_minor),
    deliveryMode: row.delivery_mode,
    pickupDate: row.pickup_date,
    reservationId: row.reservation_id,
    reservationDate: row.reservation_date,
    reservationStart: row.reservation_start,
    eventId: row.event_id,
    eventTitle: row.event_title,
    note: row.note,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ordersFor(db: D1Database, clubId: string, membershipId?: string) {
  const where = membershipId ? "orders.club_id = ? AND orders.membership_id = ?" : "orders.club_id = ?";
  const result = await db.prepare(`
    SELECT orders.*, COALESCE(memberships.display_name_override, users.display_name) AS display_name,
      reservations.reservation_date, reservations.start_time AS reservation_start, events.title AS event_title
    FROM club_orders orders
    JOIN club_memberships memberships ON memberships.id = orders.membership_id AND memberships.club_id = orders.club_id
    JOIN platform_users users ON users.id = memberships.user_id
    LEFT JOIN reservations ON reservations.id = orders.reservation_id
    LEFT JOIN club_events events ON events.id = orders.event_id
    WHERE ${where}
    ORDER BY orders.created_at DESC
  `).bind(clubId, ...(membershipId ? [membershipId] : [])).all<OrderRow>();
  return (result.results || []).map(orderJson);
}

export const orderRoutes = new Hono<AppEnv>();
orderRoutes.use("*", requireAuth);

orderRoutes.get("/:clubId/me/orders", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  return c.json({ ok: true, orders: await ordersFor(c.env.DB, clubId, membership.membershipId) });
});

orderRoutes.get("/:clubId/orders", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager", "stringer", "seller"]);
  return c.json({ ok: true, orders: await ordersFor(c.env.DB, clubId) });
});

orderRoutes.post("/:clubId/orders", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]);
  const body = await readJsonObject(c);
  const productName = typeof body.productName === "string" ? body.productName.trim().slice(0, 160) : "";
  const productType = ["product", "service", "demo"].includes(String(body.productType)) ? String(body.productType) : "product";
  const amountMinor = Number(body.amountMinor || 0);
  const deliveryMode = ["pickup", "reservation", "event"].includes(String(body.deliveryMode)) ? String(body.deliveryMode) : "";
  const pickupDate = typeof body.pickupDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.pickupDate) ? body.pickupDate : null;
  const reservationId = typeof body.reservationId === "string" ? body.reservationId : null;
  const eventId = typeof body.eventId === "string" ? body.eventId : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!productName || !deliveryMode || !Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new AppError(400, "invalid_order", "Product, delivery and price are required.");
  }
  if (deliveryMode === "pickup" && !pickupDate) throw new AppError(400, "pickup_date_required", "Choose a pickup date.");
  if (deliveryMode === "reservation") {
    const reservation = await c.env.DB.prepare(`
      SELECT reservations.id FROM reservations
      JOIN reservation_participants participants ON participants.reservation_id = reservations.id
      WHERE reservations.id = ? AND reservations.club_id = ? AND participants.membership_id = ?
        AND participants.status IN ('owner','confirmed','replacement') AND reservations.status != 'cancelled'
    `).bind(reservationId, clubId, membership.membershipId).first();
    if (!reservation) throw new AppError(400, "invalid_order_reservation", "Choose one of your active reservations.");
  }
  if (deliveryMode === "event") {
    const event = await c.env.DB.prepare(`SELECT id FROM club_events WHERE id = ? AND club_id = ? AND status = 'published'`).bind(eventId, clubId).first();
    if (!event) throw new AppError(400, "invalid_order_event", "Choose an active club event.");
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`
      INSERT INTO club_orders (id, club_id, membership_id, product_name, product_type, amount_minor, delivery_mode, pickup_date, reservation_id, event_id, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, clubId, membership.membershipId, productName, productType, amountMinor, deliveryMode, deliveryMode === "pickup" ? pickupDate : null, deliveryMode === "reservation" ? reservationId : null, deliveryMode === "event" ? eventId : null, note, now, now),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'club.order.created', 'order', ?, ?, ?)
    `).bind(crypto.randomUUID(), clubId, auth.userId, id, JSON.stringify({ productName, deliveryMode }), now),
  ];
  if (productType === "service") {
    const stringer = await c.env.DB.prepare(`
      SELECT id FROM club_memberships
      WHERE club_id = ? AND role = 'stringer' AND status = 'active'
      ORDER BY joined_at ASC LIMIT 1
    `).bind(clubId).first<{ id: string }>();
    const jobId = crypto.randomUUID();
    statements.push(c.env.DB.prepare(`
      INSERT INTO stringing_jobs (
        id, club_id, order_id, player_membership_id, assigned_stringer_membership_id,
        reservation_id, racket_label, player_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Moje raketa', ?, ?, ?)
    `).bind(jobId, clubId, id, membership.membershipId, stringer?.id || null, deliveryMode === "reservation" ? reservationId : null, note, now, now));
    if (stringer?.id) {
      statements.push(c.env.DB.prepare(`INSERT INTO member_notifications
        (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
        VALUES (?, ?, ?, ?, 'stringing_assigned', 'Novy pozadavek na vyplet', ?, 'stringing_job', ?, ?)`)
        .bind(crypto.randomUUID(), clubId, stringer.id, membership.membershipId, `${productName}: hrac zatim preda raketu klubu.`, jobId, now));
    }
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true, order: { id } }, 201);
});

orderRoutes.put("/:clubId/orders/:orderId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const body = await readJsonObject(c);
  const source = ["unassigned", "stock", "supplier", "check"].includes(String(body.source)) ? String(body.source) : "";
  const status = ["new", "checking", "ordered", "preparing", "ready", "completed", "cancelled"].includes(String(body.status)) ? String(body.status) : "";
  if (!source || !status) throw new AppError(400, "invalid_order_state", "Choose a valid source and status.");
  const existing = await c.env.DB.prepare(`SELECT membership_id, product_name, status FROM club_orders WHERE id = ? AND club_id = ?`)
    .bind(c.req.param("orderId"), clubId).first<{ membership_id: string; product_name: string; status: string }>();
  if (!existing) throw new AppError(404, "order_not_found", "The order does not exist in this club.");
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE club_orders SET source = ?, status = ?, updated_at = ? WHERE id = ? AND club_id = ?`)
      .bind(source, status, now, c.req.param("orderId"), clubId),
  ];
  if (status === "ready" && existing.status !== "ready") {
    statements.push(c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'order_ready', 'Objednavka je pripravena', ?, 'order', ?, ?)
    `).bind(crypto.randomUUID(), clubId, existing.membership_id, actor.membershipId, `${existing.product_name} je pripraveno k predani na klubu.`, c.req.param("orderId"), now));
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});
