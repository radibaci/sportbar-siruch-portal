import { Hono } from "hono";
import type { AppEnv, ClubRole } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";
import { changeClubModule, clubModuleStates } from "../modules/service";
import { hashPassword } from "../security/password";
import { validateOpeningHours } from "../reservations/time";

type PublicClubRow = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  public_config_json: string;
};

type MemberRow = {
  membership_id: string;
  display_name: string;
  display_name_override: string | null;
  avatar_url: string | null;
  role: ClubRole;
  status: string;
  joined_at: string;
  email: string;
  account_type: string | null;
  base_discount_pct: number | null;
  loyalty_discount_pct: number | null;
  discount_reason: string | null;
  admin_note: string | null;
};

export const publicClubRoutes = new Hono<AppEnv>();

publicClubRoutes.get("/", (c) => c.json({
  ok: false,
  error: { code: "club_directory_unavailable", message: "There is no public club directory." },
}, 404));

publicClubRoutes.get("/:slug/public", async (c) => {
  const slug = c.req.param("slug").toLowerCase();
  const club = await c.env.DB.prepare(`
    SELECT id, slug, name, logo_url, primary_color, accent_color, public_config_json
    FROM clubs
    WHERE slug = ? COLLATE NOCASE AND status = 'active'
  `).bind(slug).first<PublicClubRow>();
  if (!club) throw new AppError(404, "club_not_found", "The club does not exist.");

  const parsedConfig: unknown = JSON.parse(club.public_config_json);
  const publicConfig = parsedConfig && typeof parsedConfig === "object" && !Array.isArray(parsedConfig)
    ? parsedConfig
    : {};
  return c.json({
    ok: true,
    club: {
      id: club.id,
      slug: club.slug,
      name: club.name,
      logoUrl: club.logo_url,
      primaryColor: club.primary_color,
      accentColor: club.accent_color,
      publicConfig,
    },
  });
});

export const protectedClubRoutes = new Hono<AppEnv>();
protectedClubRoutes.use("*", requireAuth);

protectedClubRoutes.get("/:clubId/context", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const club = await c.env.DB.prepare(`
    SELECT id, slug, name, logo_url, primary_color, accent_color
    FROM clubs
    WHERE id = ? AND status = 'active'
  `).bind(clubId).first<{
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    primary_color: string;
    accent_color: string;
  }>();
  if (!club) throw new AppError(404, "club_not_found", "The club does not exist.");

  return c.json({
    ok: true,
    club: {
      id: club.id,
      slug: club.slug,
      name: club.name,
      logoUrl: club.logo_url,
      primaryColor: club.primary_color,
      accentColor: club.accent_color,
    },
    membership: { id: membership.membershipId, role: membership.role },
    modules: await clubModuleStates(c.env.DB, clubId),
  });
});

protectedClubRoutes.get("/:clubId/members", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin", "manager"]);
  const result = await c.env.DB.prepare(`
    SELECT
      memberships.id AS membership_id,
      users.display_name, users.email,
      memberships.display_name_override,
      users.avatar_url,
      memberships.role,
      memberships.status,
      memberships.joined_at,
      profiles.account_type, profiles.base_discount_pct, profiles.loyalty_discount_pct,
      profiles.discount_reason, profiles.admin_note
    FROM club_memberships AS memberships
    JOIN platform_users AS users ON users.id = memberships.user_id
    LEFT JOIN member_club_profiles profiles ON profiles.membership_id = memberships.id
    WHERE memberships.club_id = ?
      AND memberships.status IN ('active', 'invited', 'suspended')
      AND users.status != 'deleted'
    ORDER BY COALESCE(memberships.display_name_override, users.display_name) COLLATE NOCASE
  `).bind(clubId).all<MemberRow>();

  return c.json({
    ok: true,
    members: (result.results || []).map((row) => ({
      membershipId: row.membership_id,
      displayName: row.display_name_override || row.display_name,
      avatarUrl: row.avatar_url,
      email: row.email,
      role: row.role,
      status: row.status,
      joinedAt: row.joined_at,
      accountType: row.account_type || "club",
      baseDiscountPct: Number(row.base_discount_pct || 0),
      loyaltyDiscountPct: Number(row.loyalty_discount_pct || 0),
      discountReason: row.discount_reason || "",
      adminNote: row.admin_note || "",
    })),
  });
});

protectedClubRoutes.get("/:clubId/directory", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId);
  const result = await c.env.DB.prepare(`
    SELECT memberships.id AS membership_id,
      COALESCE(memberships.display_name_override, users.display_name) AS display_name,
      users.avatar_url, memberships.role
    FROM club_memberships memberships
    JOIN platform_users users ON users.id = memberships.user_id
    WHERE memberships.club_id = ? AND memberships.status = 'active' AND users.status = 'active'
      AND memberships.role = 'player'
    ORDER BY display_name COLLATE NOCASE
  `).bind(clubId).all<{
    membership_id: string; display_name: string; avatar_url: string | null; role: ClubRole;
  }>();
  return c.json({
    ok: true,
    members: (result.results || []).map((row) => ({
      membershipId: row.membership_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      role: row.role,
    })),
  });
});

protectedClubRoutes.put("/:clubId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const body = await readJsonObject(c);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";
  const openTime = typeof body.openTime === "string" ? body.openTime : "";
  const closeTime = typeof body.closeTime === "string" ? body.closeTime : "";
  if (!name) throw new AppError(400, "invalid_club_name", "Club name is required.");
  if (logoUrl.length > 500_000 || (logoUrl && !/^(https:\/\/|assets\/|data:image\/(png|jpeg|webp);base64,)/i.test(logoUrl))) {
    throw new AppError(400, "invalid_logo", "Club logo must be an HTTPS URL or a supported image upload.");
  }
  validateOpeningHours(openTime, closeTime);
  const current = await c.env.DB.prepare(`SELECT public_config_json FROM clubs WHERE id = ? AND status = 'active'`).bind(clubId).first<{ public_config_json: string }>();
  if (!current) throw new AppError(404, "club_not_found", "The club does not exist.");
  const config = JSON.parse(current.public_config_json) as Record<string, unknown>;
  config.openingHours = `${openTime}-${closeTime}`;
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE clubs SET name = ?, logo_url = ?, public_config_json = ?, updated_at = ? WHERE id = ?`)
      .bind(name, logoUrl || null, JSON.stringify(config), now, clubId),
    c.env.DB.prepare(`UPDATE club_courts SET open_time = ?, close_time = ?, updated_at = ? WHERE club_id = ? AND active = 1`)
      .bind(openTime, closeTime, now, clubId),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'club.settings.updated', 'club', ?, ?, ?)
    `).bind(crypto.randomUUID(), clubId, auth.userId, clubId, JSON.stringify({ name, openTime, closeTime }), now),
  ]);
  return c.json({ ok: true, club: { id: clubId, name, logoUrl: logoUrl || null, openTime, closeTime } });
});

protectedClubRoutes.post("/:clubId/members", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const body = await readJsonObject(c);
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 100) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const allowedRoles: ClubRole[] = ["manager", "player", "coach", "stringer", "seller"];
  const role = allowedRoles.find((item) => item === body.role) || "player";
  const accountTypes = ["club", "credit", "guest"];
  const accountType = typeof body.accountType === "string" && accountTypes.includes(body.accountType) ? body.accountType : "club";
  const baseDiscountPct = Number(body.baseDiscountPct || 0);
  if (!displayName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
    throw new AppError(400, "invalid_member", "A valid display name and email are required.");
  }
  if (password.length < 10 || password.length > 256) {
    throw new AppError(400, "weak_password", "The temporary password must have at least 10 characters.");
  }
  if (!Number.isInteger(baseDiscountPct) || baseDiscountPct < 0 || baseDiscountPct > 60) {
    throw new AppError(400, "invalid_discount", "The base discount must be an integer from 0 to 60.");
  }
  const existing = await c.env.DB.prepare(`SELECT id FROM platform_users WHERE email = ? COLLATE NOCASE`).bind(email).first<{ id: string }>();
  if (existing) throw new AppError(409, "email_exists", "This email already belongs to a platform account. Use a club invitation instead.");
  const credentials = await hashPassword(password);
  const userId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO platform_users (id, email, display_name, password_hash, password_salt, password_iterations, status, discoverability, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 'private', ?, ?)
      `).bind(userId, email, displayName, credentials.hash, credentials.salt, credentials.iterations, now, now),
      c.env.DB.prepare(`
        INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `).bind(membershipId, clubId, userId, role, now, now),
      c.env.DB.prepare(`
        INSERT INTO member_credit_accounts (membership_id, club_id, paid_balance_minor, bonus_balance_minor, updated_at)
        VALUES (?, ?, 0, 0, ?)
      `).bind(membershipId, clubId, now),
      c.env.DB.prepare(`
        INSERT INTO member_club_profiles (membership_id, club_id, account_type, base_discount_pct, loyalty_discount_pct, discount_reason, updated_by_user_id, updated_at)
        VALUES (?, ?, ?, ?, 0, 'Nastaveno pri zalozeni hrace.', ?, ?)
      `).bind(membershipId, clubId, accountType, baseDiscountPct, auth.userId, now),
      c.env.DB.prepare(`
        INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
        VALUES (?, ?, ?, 'club.member.created', 'membership', ?, ?, ?)
      `).bind(crypto.randomUUID(), clubId, auth.userId, membershipId, JSON.stringify({ role }), now),
    ]);
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error instanceof Error ? error.message : String(error))) {
      throw new AppError(409, "member_exists", "The player already exists.");
    }
    throw error;
  }
  return c.json({ ok: true, member: { membershipId, userId, displayName, email, role, status: "active", accountType, baseDiscountPct } }, 201);
});

protectedClubRoutes.put("/:clubId/members/:membershipId/profile", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membershipId = c.req.param("membershipId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const body = await readJsonObject(c);
  const accountTypes = ["club", "credit", "guest"];
  const accountType = typeof body.accountType === "string" && accountTypes.includes(body.accountType) ? body.accountType : "club";
  const baseDiscountPct = Number(body.baseDiscountPct || 0);
  if (!Number.isInteger(baseDiscountPct) || baseDiscountPct < 0 || baseDiscountPct > 60) {
    throw new AppError(400, "invalid_discount", "The base discount must be an integer from 0 to 60.");
  }
  const reason = typeof body.discountReason === "string" ? body.discountReason.trim().slice(0, 500) : "";
  const note = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 2000) : "";
  const target = await c.env.DB.prepare(`SELECT id FROM club_memberships WHERE id = ? AND club_id = ? AND status != 'left'`)
    .bind(membershipId, clubId).first<{ id: string }>();
  if (!target) throw new AppError(404, "member_not_found", "The member does not exist in this club.");
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO member_club_profiles (membership_id, club_id, account_type, base_discount_pct, loyalty_discount_pct, discount_reason, admin_note, updated_by_user_id, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
      ON CONFLICT(membership_id) DO UPDATE SET account_type = excluded.account_type,
        base_discount_pct = excluded.base_discount_pct, discount_reason = excluded.discount_reason,
        admin_note = excluded.admin_note, updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at
    `).bind(membershipId, clubId, accountType, baseDiscountPct, reason || null, note || null, auth.userId, now),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'club.member.profile.updated', 'membership', ?, ?, ?)
    `).bind(crypto.randomUUID(), clubId, auth.userId, membershipId, JSON.stringify({ accountType, baseDiscountPct }), now),
  ]);
  return c.json({ ok: true, profile: { membershipId, accountType, baseDiscountPct, discountReason: reason, adminNote: note } });
});

protectedClubRoutes.put("/:clubId/modules/:moduleKey", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const moduleKey = c.req.param("moduleKey");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const body = await readJsonObject(c);
  if (typeof body.enabled !== "boolean") {
    throw new AppError(400, "invalid_field", "enabled must be true or false.");
  }
  const rawConfig = body.config ?? {};
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    throw new AppError(400, "invalid_field", "config must be an object.");
  }
  const config = rawConfig as Record<string, unknown>;
  const modules = await changeClubModule(c.env.DB, clubId, moduleKey, body.enabled, config, auth.userId);
  return c.json({ ok: true, modules });
});
