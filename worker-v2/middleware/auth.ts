import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";
import { AppError } from "../lib/errors";
import { loadSession } from "../auth/sessions";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = await loadSession(c);
  if (!auth) throw new AppError(401, "authentication_required", "Authentication is required.");
  c.set("auth", auth);
  await next();
});
