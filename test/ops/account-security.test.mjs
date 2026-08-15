import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../../app.js", import.meta.url), "utf8");
const meRoutes = readFileSync(new URL("../../worker-v2/routes/me.ts", import.meta.url), "utf8");

test("offers an authenticated password change and revokes every session", () => {
  assert.match(app, /data-confirm="password-change"/);
  assert.match(app, /autocomplete="current-password"/);
  assert.match(app, /autocomplete="new-password"/);
  assert.match(meRoutes, /meRoutes\.put\("\/password"/);
  assert.match(meRoutes, /newPassword\.length < 12/);
  assert.match(meRoutes, /UPDATE auth_sessions SET revoked_at/);
  assert.match(meRoutes, /user\.password\.changed/);
});
