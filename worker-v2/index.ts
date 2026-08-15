import { Hono } from "hono";
import type { AppEnv } from "./types";
import { AppError } from "./lib/errors";
import { securityMiddleware } from "./middleware/security";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { protectedClubRoutes, publicClubRoutes } from "./routes/clubs";
import { reservationRoutes } from "./routes/reservations";
import { creditRoutes } from "./routes/credits";
import { eventRoutes } from "./routes/events";
import { relationshipRoutes } from "./routes/relationships";
import { orderRoutes } from "./routes/orders";
import { stringingRoutes } from "./routes/stringing";
import { coordinationRoutes } from "./routes/coordination";
import { pollRoutes } from "./routes/polls";
import { tournamentRoutes } from "./routes/tournaments";
import { supplierRoutes } from "./routes/suppliers";
import { operationRoutes } from "./routes/operations";
import { globalRelationshipRoutes } from "./routes/global-relationships";
import { mediaRoutes } from "./routes/media";
import { runScheduledWork } from "./services/scheduled";

const app = new Hono<AppEnv>();
app.use("*", securityMiddleware);

app.get("/api/v2/health", (c) => c.json({ ok: true, api: "v2", mode: "modular-core" }));
app.route("/api/v2/auth", authRoutes);
app.route("/api/v2/me", meRoutes);
app.route("/api/v2/clubs", publicClubRoutes);
app.route("/api/v2/clubs", protectedClubRoutes);
app.route("/api/v2/clubs", reservationRoutes);
app.route("/api/v2/clubs", creditRoutes);
app.route("/api/v2/clubs", eventRoutes);
app.route("/api/v2/clubs", relationshipRoutes);
app.route("/api/v2/clubs", orderRoutes);
app.route("/api/v2/clubs", stringingRoutes);
app.route("/api/v2/clubs", coordinationRoutes);
app.route("/api/v2/clubs", pollRoutes);
app.route("/api/v2/clubs", tournamentRoutes);
app.route("/api/v2/clubs", supplierRoutes);
app.route("/api/v2", operationRoutes);
app.route("/api/v2", globalRelationshipRoutes);
app.route("/api/v2", mediaRoutes);

app.notFound((c) => c.json({ ok: false, error: { code: "not_found", message: "API endpoint not found." } }, 404));

app.onError((error, c) => {
  const requestId = c.get("requestId") || crypto.randomUUID();
  if (error instanceof AppError) {
    return c.json({ ok: false, error: { code: error.code, message: error.message }, requestId }, error.status);
  }

  console.error(JSON.stringify({
    message: "Unhandled v2 API error",
    requestId,
    path: new URL(c.req.url).pathname,
    error: error instanceof Error ? error.message : String(error),
  }));
  return c.json({
    ok: false,
    error: { code: "internal_error", message: "The server could not complete the request." },
    requestId,
  }, 500);
});

export default {
  fetch: app.fetch,
  scheduled(controller: ScheduledController, env: AppEnv["Bindings"], ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledWork(env, controller.scheduledTime));
  },
};
