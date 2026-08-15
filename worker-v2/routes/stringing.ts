import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";

type StringingStatus = "waiting_dropoff" | "at_club" | "with_stringer" | "returned_to_club" | "ready_for_pickup" | "delivered" | "cancelled";
type StringingRow = {
  id: string; order_id: string; player_membership_id: string; player_name: string;
  assigned_stringer_membership_id: string | null; stringer_name: string | null; reservation_id: string | null;
  reservation_date: string | null; reservation_start: string | null; racket_label: string; string_name: string;
  tension: string; status: StringingStatus; player_note: string; staff_note: string; created_at: string; updated_at: string;
  handover_media_id: string | null;
};

const transitions: Record<StringingStatus, StringingStatus[]> = {
  waiting_dropoff: ["at_club", "cancelled"], at_club: ["with_stringer", "cancelled"],
  with_stringer: ["returned_to_club"], returned_to_club: ["ready_for_pickup"],
  ready_for_pickup: ["delivered"], delivered: [], cancelled: [],
};

function jobJson(row: StringingRow) {
  return {
    id: row.id, orderId: row.order_id, playerMembershipId: row.player_membership_id, playerName: row.player_name,
    assignedStringerMembershipId: row.assigned_stringer_membership_id, stringerName: row.stringer_name,
    reservationId: row.reservation_id, reservationDate: row.reservation_date, reservationStart: row.reservation_start,
    racketLabel: row.racket_label, stringName: row.string_name, tension: row.tension, status: row.status,
    playerNote: row.player_note, staffNote: row.staff_note, handoverMediaId: row.handover_media_id, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function jobsFor(db: D1Database, clubId: string, membershipId?: string, stringerOnly = false) {
  let filter = "jobs.club_id = ?";
  const values: unknown[] = [clubId];
  if (membershipId) {
    filter += stringerOnly ? " AND jobs.assigned_stringer_membership_id = ?" : " AND jobs.player_membership_id = ?";
    values.push(membershipId);
  }
  const result = await db.prepare(`
    SELECT jobs.*, COALESCE(pm.display_name_override, pu.display_name) AS player_name,
      COALESCE(sm.display_name_override, su.display_name) AS stringer_name,
      reservations.reservation_date, reservations.start_time AS reservation_start
    FROM stringing_jobs jobs
    JOIN club_memberships pm ON pm.id = jobs.player_membership_id JOIN platform_users pu ON pu.id = pm.user_id
    LEFT JOIN club_memberships sm ON sm.id = jobs.assigned_stringer_membership_id LEFT JOIN platform_users su ON su.id = sm.user_id
    LEFT JOIN reservations ON reservations.id = jobs.reservation_id
    WHERE ${filter}
    ORDER BY CASE jobs.status WHEN 'waiting_dropoff' THEN 1 WHEN 'at_club' THEN 2 WHEN 'with_stringer' THEN 3
      WHEN 'returned_to_club' THEN 4 WHEN 'ready_for_pickup' THEN 5 ELSE 6 END, jobs.updated_at DESC
  `).bind(...values).all<StringingRow>();
  return (result.results || []).map(jobJson);
}

export const stringingRoutes = new Hono<AppEnv>();
stringingRoutes.use("*", requireAuth);

stringingRoutes.get("/:clubId/stringing-runs", async (c) => {
  const auth=c.get("auth"); const clubId=c.req.param("clubId"); const actor=await requireClubMembership(c.env.DB,auth.userId,clubId,["admin","manager","stringer"]);
  const filter=actor.role==="stringer"?"AND jobs.assigned_stringer_membership_id=?":"";
  const rows=await c.env.DB.prepare(`SELECT jobs.assigned_stringer_membership_id,COALESCE(m.display_name_override,u.display_name,'Neprirazeno') AS stringer,COUNT(*) AS rackets,MIN(jobs.updated_at) AS waiting_since,GROUP_CONCAT(jobs.racket_label,' | ') AS labels FROM stringing_jobs jobs LEFT JOIN club_memberships m ON m.id=jobs.assigned_stringer_membership_id LEFT JOIN platform_users u ON u.id=m.user_id WHERE jobs.club_id=? AND jobs.status='at_club' ${filter} GROUP BY jobs.assigned_stringer_membership_id ORDER BY waiting_since`).bind(clubId,...(actor.role==="stringer"?[actor.membershipId]:[])).all();
  return c.json({ok:true,runs:(rows.results||[]).map((row:any)=>({...row,rackets:Number(row.rackets||0)}))});
});

stringingRoutes.get("/:clubId/me/stringing-jobs", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId");
  const member = await requireClubMembership(c.env.DB, auth.userId, clubId, ["player"]);
  return c.json({ ok: true, jobs: await jobsFor(c.env.DB, clubId, member.membershipId) });
});

stringingRoutes.get("/:clubId/stringing-jobs", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId");
  const member = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager", "stringer"]);
  return c.json({ ok: true, jobs: member.role === "stringer" ? await jobsFor(c.env.DB, clubId, member.membershipId, true) : await jobsFor(c.env.DB, clubId) });
});

stringingRoutes.post("/:clubId/stringing-jobs/:jobId/transition", async (c) => {
  const auth = c.get("auth"); const clubId = c.req.param("clubId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager", "stringer", "player"]);
  const body = await readJsonObject(c); const nextStatus = String(body.status || "") as StringingStatus;
  const staffNote = typeof body.staffNote === "string" ? body.staffNote.trim().slice(0, 2000) : "";
  const handoverMediaId = typeof body.handoverMediaId === "string" ? body.handoverMediaId : "";
  const job = await c.env.DB.prepare(`
    SELECT jobs.*, reservations.reservation_date, reservations.start_time AS reservation_start
    FROM stringing_jobs jobs LEFT JOIN reservations ON reservations.id = jobs.reservation_id
    WHERE jobs.id = ? AND jobs.club_id = ?
  `).bind(c.req.param("jobId"), clubId).first<StringingRow>();
  if (!job) throw new AppError(404, "stringing_job_not_found", "The stringing job does not exist in this club.");
  if (!transitions[job.status]?.includes(nextStatus)) throw new AppError(409, "invalid_stringing_transition", "This stringing state cannot follow the current state.");

  const playerCanCancel = actor.role === "player" && actor.membershipId === job.player_membership_id && job.status === "waiting_dropoff" && nextStatus === "cancelled";
  const clubTransition = ["admin", "manager"].includes(actor.role) && ((job.status === "waiting_dropoff" && nextStatus === "at_club")
    || (job.status === "returned_to_club" && nextStatus === "ready_for_pickup") || (job.status === "ready_for_pickup" && nextStatus === "delivered") || nextStatus === "cancelled");
  const stringerTransition = actor.role === "stringer" && actor.membershipId === job.assigned_stringer_membership_id
    && ((job.status === "at_club" && nextStatus === "with_stringer") || (job.status === "with_stringer" && nextStatus === "returned_to_club"));
  if (!playerCanCancel && !clubTransition && !stringerTransition) throw new AppError(403, "stringing_transition_denied", "This role cannot perform the requested hand-off.");
  if (handoverMediaId) {
    const media=await c.env.DB.prepare(`SELECT id FROM media_assets WHERE id=? AND club_id=? AND status='active'`).bind(handoverMediaId,clubId).first();
    if(!media) throw new AppError(400,"invalid_handover_media","Handover proof must be an active club image.");
  }

  const orderStatus = nextStatus === "cancelled" ? "cancelled" : nextStatus === "delivered" ? "completed" : nextStatus === "ready_for_pickup" ? "ready" : "preparing";
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE stringing_jobs SET status = ?, staff_note = CASE WHEN ? = '' THEN staff_note ELSE ? END, handover_media_id=CASE WHEN ?='' THEN handover_media_id ELSE ? END, updated_at = ? WHERE id = ? AND club_id = ?`).bind(nextStatus, staffNote, staffNote,handoverMediaId,handoverMediaId,now,c.req.param("jobId"),clubId),
    c.env.DB.prepare(`UPDATE club_orders SET status = ?, updated_at = ? WHERE id = ? AND club_id = ?`).bind(orderStatus, now, job.order_id, clubId),
    c.env.DB.prepare(`INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, 'stringing.transition', 'stringing_job', ?, ?, ?)`).bind(crypto.randomUUID(), clubId, auth.userId, c.req.param("jobId"), JSON.stringify({ from: job.status, to: nextStatus }), now),
  ];
  if (nextStatus === "at_club" && job.assigned_stringer_membership_id) statements.push(c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, 'stringing_pickup', 'Raketu lze vyzvednout na klubu', ?, 'stringing_job', ?, ?)`).bind(crypto.randomUUID(), clubId, job.assigned_stringer_membership_id, actor.membershipId, `${job.racket_label} hrace je pripravena k prevzeti na klubu.`, c.req.param("jobId"), now));
  if (nextStatus === "returned_to_club") {
    const admins = await c.env.DB.prepare(`SELECT id FROM club_memberships WHERE club_id = ? AND role IN ('admin','manager') AND status = 'active'`).bind(clubId).all<{ id: string }>();
    for (const admin of admins.results || []) statements.push(c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, 'stringing_returned', 'Vypletac vratil raketu', ?, 'stringing_job', ?, ?)`).bind(crypto.randomUUID(), clubId, admin.id, actor.membershipId, `${job.racket_label} hrace je zpet na klubu. Nachystejte ji k predani.`, c.req.param("jobId"), now));
  }
  if (nextStatus === "ready_for_pickup") {
    const when = job.reservation_date ? `${job.reservation_date}${job.reservation_start ? ` v ${job.reservation_start}` : ""}` : "pred pristi hrou";
    statements.push(c.env.DB.prepare(`INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, 'stringing_ready', 'Vyplet je hotovy', ?, 'stringing_job', ?, ?)`).bind(crypto.randomUUID(), clubId, job.player_membership_id, actor.membershipId, `Vyplet je hotovy, muzete si raketu vyzvednout pred hrou ${when} na recepci.`, c.req.param("jobId"), now));
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});
