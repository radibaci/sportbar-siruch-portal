import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";
import { AppError } from "../lib/errors";

function allowedOrigins(value: string): Set<string> {
  return new Set(value.split(",").map((origin) => origin.trim()).filter(Boolean));
}

export const securityMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);

  const origin = c.req.header("Origin");
  const allowed = allowedOrigins(c.env.ALLOWED_ORIGINS);
  if (origin && !allowed.has(origin)) {
    throw new AppError(403, "origin_denied", "This web origin is not allowed.");
  }

  if (c.req.method === "OPTIONS") {
    if (!origin) throw new AppError(400, "origin_required", "Preflight requests require an origin.");
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    c.header("Access-Control-Max-Age", "600");
    return c.body(null, 204);
  }

  if (origin) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-Request-Id", requestId);

  await next();
});
