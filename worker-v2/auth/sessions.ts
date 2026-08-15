import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import type { AppEnv, AuthContext } from "../types";
import { randomToken, sha256 } from "../lib/crypto";

const SESSION_SECONDS = 30 * 24 * 60 * 60;

function usesSecureCookie(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).protocol === "https:";
}

type SessionRow = {
  session_id: string;
  user_id: string;
  email: string;
  display_name: string;
};

function tokenFromRequest(c: Context<AppEnv>): string | null {
  const cookieToken = getCookie(c, c.env.SESSION_COOKIE_NAME);
  if (cookieToken) return cookieToken;

  const authorization = c.req.header("Authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim() || null;
  return null;
}

export async function createSession(c: Context<AppEnv>, userId: string): Promise<AuthContext> {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000);

  const user = await c.env.DB.prepare(`
    SELECT id, email, display_name
    FROM platform_users
    WHERE id = ? AND status = 'active'
  `).bind(userId).first<{ id: string; email: string; display_name: string }>();
  if (!user) throw new Error("Cannot create a session for an inactive user.");

  const retentionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`
      DELETE FROM auth_sessions
      WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)
    `).bind(retentionCutoff, retentionCutoff),
    c.env.DB.prepare(`
      INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      userId,
      tokenHash,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    ),
  ]);

  setCookie(c, c.env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: usesSecureCookie(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });

  return {
    sessionId,
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
  };
}

export async function loadSession(c: Context<AppEnv>): Promise<AuthContext | null> {
  const token = tokenFromRequest(c);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const row = await c.env.DB.prepare(`
    SELECT
      sessions.id AS session_id,
      users.id AS user_id,
      users.email,
      users.display_name
    FROM auth_sessions AS sessions
    JOIN platform_users AS users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
      AND sessions.revoked_at IS NULL
      AND sessions.expires_at > ?
      AND users.status = 'active'
  `).bind(tokenHash, now).first<SessionRow>();

  if (!row) return null;
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
  };
}

export async function revokeCurrentSession(c: Context<AppEnv>): Promise<void> {
  const token = tokenFromRequest(c);
  if (token) {
    const tokenHash = await sha256(token);
    await c.env.DB.prepare(`
      UPDATE auth_sessions
      SET revoked_at = ?
      WHERE token_hash = ? AND revoked_at IS NULL
    `).bind(new Date().toISOString(), tokenHash).run();
  }
  deleteCookie(c, c.env.SESSION_COOKIE_NAME, { path: "/", secure: usesSecureCookie(c) });
}
