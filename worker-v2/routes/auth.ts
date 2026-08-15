import { Hono } from "hono";
import type { AppEnv } from "../types";
import { assertLoginAllowed, clearLoginFailures, recordLoginFailure } from "../auth/login-limit";
import { createSession, revokeCurrentSession } from "../auth/sessions";
import { readJsonObject, readSecret, readString } from "../lib/json";
import { AppError } from "../lib/errors";
import { verifyPassword, verifyPasswordWithoutUser } from "../security/password";

type UserCredentialRow = {
  id: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
};

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/login", async (c) => {
  const body = await readJsonObject(c);
  const email = readString(body.email, "email", 254).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
    throw new AppError(400, "invalid_email", "Email has an invalid format.");
  }
  const password = readSecret(body.password, "password", 256);
  const loginKey = await assertLoginAllowed(c, email);

  const user = await c.env.DB.prepare(`
    SELECT id, password_hash, password_salt, password_iterations
    FROM platform_users
    WHERE email = ? COLLATE NOCASE AND status = 'active'
  `).bind(email).first<UserCredentialRow>();

  if (!user) {
    await verifyPasswordWithoutUser(password);
    await recordLoginFailure(c, loginKey);
    throw new AppError(401, "invalid_credentials", "Email or password is incorrect.");
  }

  const valid = await verifyPassword(password, user.password_hash, user.password_salt, user.password_iterations);
  if (!valid) {
    await recordLoginFailure(c, loginKey);
    throw new AppError(401, "invalid_credentials", "Email or password is incorrect.");
  }

  await clearLoginFailures(c, loginKey);
  const auth = await createSession(c, user.id);
  return c.json({
    ok: true,
    user: { id: auth.userId, email: auth.email, displayName: auth.displayName },
  });
});

authRoutes.post("/logout", async (c) => {
  await revokeCurrentSession(c);
  return c.json({ ok: true });
});
