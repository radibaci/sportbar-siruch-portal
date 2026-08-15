import assert from "node:assert/strict";
import test from "node:test";
import { runApiSmoke } from "../../scripts/lib/smoke-client.mjs";

const jsonResponse = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", ...headers }
});

test("runs the authenticated read-only smoke flow and verifies logout", async () => {
  const calls = [];
  let loggedOut = false;
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    const cookie = options.headers.get("Cookie") || "";
    calls.push({ path, method: options.method || "GET", cookie, origin: options.headers.get("Origin") });
    if (path === "/api/v2/health") return jsonResponse({ ok: true });
    if (path === "/api/v2/auth/login") return jsonResponse({ ok: true, user: { id: "user-smoke" } }, 200, { "set-cookie": "portal_session=abc; Path=/; HttpOnly" });
    if (path === "/api/v2/me" && loggedOut) return jsonResponse({ ok: false }, 401);
    if (path === "/api/v2/me") return jsonResponse({ ok: true, user: { email: "smoke@example.cz" } });
    if (path === "/api/v2/me/clubs") return jsonResponse({ ok: true, clubs: [{ clubId: "club-1", name: "Smoke Club" }] });
    if (path === "/api/v2/clubs/club-1/context") return jsonResponse({ ok: true, club: { id: "club-1" }, modules: [] });
    if (path.startsWith("/api/v2/clubs/club-1/schedule?")) return jsonResponse({ ok: true, courts: [{ id: "court-1" }] });
    if (path === "/api/v2/auth/logout") {
      loggedOut = true;
      return jsonResponse({ ok: true }, 200, { "set-cookie": "portal_session=; Path=/; Max-Age=0" });
    }
    throw new Error(`Unexpected smoke request: ${path}`);
  };

  const result = await runApiSmoke({
    apiBase: "https://api.example.cz",
    email: "smoke@example.cz",
    password: "secret",
    origin: "https://portal.example.cz",
    fetchImpl
  });

  assert.deepEqual(result, { clubName: "Smoke Club", courtCount: 1 });
  assert.equal(calls.length, 8);
  assert.equal(calls[0].cookie, "");
  assert.equal(calls[2].cookie, "portal_session=abc");
  assert.equal(calls.at(-1).cookie, "portal_session=");
  assert.ok(calls.every((call) => call.origin === "https://portal.example.cz"));
});

test("rejects an unsafe remote API URL", async () => {
  await assert.rejects(() => runApiSmoke({ apiBase: "http://api.example.cz", email: "a@b.cz", password: "secret" }), /must be HTTPS/);
});
