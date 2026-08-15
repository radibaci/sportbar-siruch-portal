import { Hono } from "hono";
import type { AppEnv, ClubRole } from "../types";
import { requireAuth } from "../middleware/auth";
import { revokeCurrentSession } from "../auth/sessions";
import { readJsonObject, readSecret } from "../lib/json";
import { AppError } from "../lib/errors";
import { hashPassword, verifyPassword } from "../security/password";

type ClubMembershipRow = {
  membership_id: string;
  club_id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  role: ClubRole;
};

export const meRoutes = new Hono<AppEnv>();
meRoutes.use("*", requireAuth);

meRoutes.get("/", (c) => {
  const auth = c.get("auth");
  return c.json({
    ok: true,
    user: { id: auth.userId, email: auth.email, displayName: auth.displayName },
  });
});

meRoutes.put("/password", async (c) => {
  const auth = c.get("auth");
  const body = await readJsonObject(c);
  const currentPassword = readSecret(body.currentPassword, "currentPassword", 256);
  const newPassword = readSecret(body.newPassword, "newPassword", 256);
  if (newPassword.length < 12) {
    throw new AppError(400, "weak_password", "New password must have at least 12 characters.");
  }
  if (newPassword === currentPassword) {
    throw new AppError(400, "password_unchanged", "New password must be different.");
  }

  const credential = await c.env.DB.prepare(`
    SELECT password_hash, password_salt, password_iterations
    FROM platform_users
    WHERE id = ? AND status = 'active'
  `).bind(auth.userId).first<{
    password_hash: string;
    password_salt: string;
    password_iterations: number;
  }>();
  if (!credential || !await verifyPassword(
    currentPassword,
    credential.password_hash,
    credential.password_salt,
    credential.password_iterations,
  )) {
    throw new AppError(401, "invalid_current_password", "Current password is incorrect.");
  }

  const password = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`
      UPDATE platform_users
      SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ?
      WHERE id = ?
    `).bind(password.hash, password.salt, password.iterations, now, auth.userId),
    c.env.DB.prepare(`
      UPDATE auth_sessions SET revoked_at = ?
      WHERE user_id = ? AND revoked_at IS NULL
    `).bind(now, auth.userId),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, NULL, ?, 'user.password.changed', 'platform_user', ?, '{}', ?)
    `).bind(crypto.randomUUID(), auth.userId, auth.userId, now),
  ]);
  await revokeCurrentSession(c);
  return c.json({ ok: true, sessionRevoked: true });
});

meRoutes.get("/clubs", async (c) => {
  const auth = c.get("auth");
  const result = await c.env.DB.prepare(`
    SELECT
      memberships.id AS membership_id,
      clubs.id AS club_id,
      clubs.slug,
      clubs.name,
      clubs.logo_url,
      clubs.primary_color,
      clubs.accent_color,
      memberships.role
    FROM club_memberships AS memberships
    JOIN clubs ON clubs.id = memberships.club_id
    WHERE memberships.user_id = ?
      AND memberships.status = 'active'
      AND clubs.status = 'active'
    ORDER BY clubs.name COLLATE NOCASE
  `).bind(auth.userId).all<ClubMembershipRow>();

  return c.json({
    ok: true,
    clubs: (result.results || []).map((row) => ({
      membershipId: row.membership_id,
      clubId: row.club_id,
      slug: row.slug,
      name: row.name,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      role: row.role,
    })),
  });
});

meRoutes.get("/agenda", async (c) => {
  const auth = c.get("auth");
  const from = /^\d{4}-\d{2}-\d{2}$/.test(c.req.query("from") || "") ? c.req.query("from")! : new Date().toISOString().slice(0, 10);
  const reservations = await c.env.DB.prepare(`
    SELECT r.id,r.reservation_date,r.start_time,r.end_time,r.game_type,r.status,c.name AS court_name,
      clubs.id AS club_id,clubs.name AS club_name,clubs.logo_url,p.status AS participant_status
    FROM reservation_participants p
    JOIN club_memberships m ON m.id=p.membership_id AND m.user_id=? AND m.status='active'
    JOIN reservations r ON r.id=p.reservation_id AND r.club_id=m.club_id
    JOIN club_courts c ON c.id=r.court_id
    JOIN clubs ON clubs.id=r.club_id AND clubs.status='active'
    WHERE r.reservation_date>=? AND r.status!='cancelled' AND p.status IN ('owner','pending','confirmed','replacement')
    ORDER BY r.reservation_date,r.start_time LIMIT 100
  `).bind(auth.userId,from).all();
  const events = await c.env.DB.prepare(`
    SELECT events.id,events.event_date,events.start_time,events.end_time,events.title,events.event_type,
      clubs.id AS club_id,clubs.name AS club_name,clubs.logo_url
    FROM event_registrations registrations
    JOIN club_memberships memberships ON memberships.id=registrations.membership_id AND memberships.user_id=? AND memberships.status='active'
    JOIN club_events events ON events.id=registrations.event_id AND events.club_id=memberships.club_id
    JOIN clubs ON clubs.id=events.club_id AND clubs.status='active'
    WHERE registrations.status='registered' AND events.event_date>=? AND events.status='published'
    ORDER BY events.event_date,events.start_time LIMIT 100
  `).bind(auth.userId,from).all();
  return c.json({ok:true,reservations:reservations.results||[],events:events.results||[]});
});
