import assert from "node:assert/strict";

export async function runApiSmoke({ apiBase, email, password, origin, fetchImpl = fetch }) {
  const base = String(apiBase || "").replace(/\/$/, "");
  const accountEmail = String(email || "").trim().toLowerCase();
  const accountPassword = String(password || "");
  const requestOrigin = String(origin || "https://radibaci.github.io").replace(/\/$/, "");

  if (!/^https:\/\//.test(base) && !/^http:\/\/localhost(?::\d+)?$/.test(base)) {
    throw new Error("PLATFORM_API_URL must be HTTPS, or localhost for a local smoke test.");
  }
  if (!accountEmail || !accountPassword) throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD for a dedicated smoke-test account.");

  let sessionCookie = "";
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    headers.set("Origin", requestOrigin);
    if (options.body) headers.set("Content-Type", "application/json");
    if (sessionCookie) headers.set("Cookie", sessionCookie);
    const response = await fetchImpl(`${base}${path}`, { ...options, headers, redirect: "error" });
    const setCookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
    const authCookie = setCookies.find((value) => /session/i.test(value));
    if (authCookie) sessionCookie = authCookie.split(";", 1)[0];
    return response;
  }

  async function json(response, expectedStatus, label) {
    assert.equal(response.status, expectedStatus, `${label}: expected HTTP ${expectedStatus}, received ${response.status}`);
    const body = await response.json();
    assert.equal(body?.ok, true, `${label}: API did not return ok=true`);
    return body;
  }

  await json(await request("/api/v2/health"), 200, "health");
  const login = await json(await request("/api/v2/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: accountEmail, password: accountPassword })
  }), 200, "login");
  assert.ok(login.user?.id, "login: authenticated user is missing");
  assert.ok(sessionCookie, "login: secure session cookie is missing");

  const me = await json(await request("/api/v2/me"), 200, "current user");
  assert.equal(String(me.user?.email || "").toLowerCase(), accountEmail, "current user: wrong account returned");

  const clubPayload = await json(await request("/api/v2/me/clubs"), 200, "club memberships");
  assert.ok(Array.isArray(clubPayload.clubs) && clubPayload.clubs.length > 0, "club memberships: smoke account has no club");
  const club = clubPayload.clubs[0];
  const clubId = club.clubId;
  assert.ok(clubId, "club memberships: club id is missing");

  const context = await json(await request(`/api/v2/clubs/${clubId}/context`), 200, "tenant context");
  assert.equal(context.club?.id, clubId, "tenant context: wrong club returned");
  assert.ok(Array.isArray(context.modules), "tenant context: module list is missing");

  const today = new Date().toISOString().slice(0, 10);
  const schedule = await json(await request(`/api/v2/clubs/${clubId}/schedule?from=${today}&days=1`), 200, "court schedule");
  assert.ok(Array.isArray(schedule.courts), "court schedule: court list is missing");

  await json(await request("/api/v2/auth/logout", { method: "POST" }), 200, "logout");
  const revoked = await request("/api/v2/me");
  assert.equal(revoked.status, 401, `session revocation: expected HTTP 401, received ${revoked.status}`);

  return { clubName: club.name || clubId, courtCount: schedule.courts.length };
}
