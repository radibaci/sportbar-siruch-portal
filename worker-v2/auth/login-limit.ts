import type { Context } from "hono";
import type { AppEnv } from "../types";
import { sha256 } from "../lib/crypto";
import { AppError } from "../lib/errors";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptRow = {
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
};

async function loginKey(c: Context<AppEnv>, email: string): Promise<string> {
  const ip = c.req.header("CF-Connecting-IP") || "local";
  return sha256(`${ip}\n${email}`);
}

export async function assertLoginAllowed(c: Context<AppEnv>, email: string): Promise<string> {
  const keyHash = await loginKey(c, email);
  const retentionCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await c.env.DB.prepare("DELETE FROM auth_login_attempts WHERE updated_at < ?")
    .bind(retentionCutoff)
    .run();
  const row = await c.env.DB.prepare(`
    SELECT attempt_count, window_started_at, blocked_until
    FROM auth_login_attempts
    WHERE key_hash = ?
  `).bind(keyHash).first<AttemptRow>();

  if (row?.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
    throw new AppError(429, "login_temporarily_blocked", "Too many login attempts. Try again later.");
  }
  return keyHash;
}

export async function recordLoginFailure(c: Context<AppEnv>, keyHash: string): Promise<void> {
  const now = new Date();
  const existing = await c.env.DB.prepare(`
    SELECT attempt_count, window_started_at, blocked_until
    FROM auth_login_attempts
    WHERE key_hash = ?
  `).bind(keyHash).first<AttemptRow>();

  const windowExpired = !existing || now.getTime() - new Date(existing.window_started_at).getTime() > WINDOW_MS;
  const attemptCount = windowExpired ? 1 : existing.attempt_count + 1;
  const blockedUntil = attemptCount >= MAX_ATTEMPTS
    ? new Date(now.getTime() + BLOCK_MS).toISOString()
    : null;

  await c.env.DB.prepare(`
    INSERT INTO auth_login_attempts (key_hash, attempt_count, window_started_at, blocked_until, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempt_count = excluded.attempt_count,
      window_started_at = excluded.window_started_at,
      blocked_until = excluded.blocked_until,
      updated_at = excluded.updated_at
  `).bind(
    keyHash,
    attemptCount,
    windowExpired ? now.toISOString() : existing.window_started_at,
    blockedUntil,
    now.toISOString(),
  ).run();
}

export async function clearLoginFailures(c: Context<AppEnv>, keyHash: string): Promise<void> {
  await c.env.DB.prepare("DELETE FROM auth_login_attempts WHERE key_hash = ?").bind(keyHash).run();
}
