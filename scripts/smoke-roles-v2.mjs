const baseUrl = (process.env.PLATFORM_API_URL || "https://tenissiruch.pages.dev").replace(/\/$/, "");
if (!baseUrl.startsWith("https://") && !baseUrl.startsWith("http://localhost")) {
  throw new Error("Role smoke target must use HTTPS or localhost.");
}

const accounts = [
  ["Radim", "radim@siruch.cz", "siruch-radim", "player"],
  ["Robin", "robin@siruch.cz", "siruch-robin", "player"],
  ["Bob", "bob@siruch.cz", "siruch-bob", "player"],
  ["Honza", "honza@siruch.cz", "siruch-honza", "player"],
  ["Marek", "marek@siruch.cz", "siruch-marek", "player"],
  ["Darek", "darek@siruch.cz", "siruch-darek", "player"],
  ["Filip", "filip@siruch.cz", "siruch-filip", "player"],
  ["Zbyna", "zbyna@siruch.cz", "siruch-zbyna", "player"],
  ["Handa", "handa@siruch.cz", "siruch-handa", "player"],
  ["Prema", "prema@siruch.cz", "siruch-prema", "player"],
  ["Viki", "viki@siruch.cz", "siruch-viki", "player"],
  ["Spravce", "spravce@siruch.cz", "siruch-admin", "admin"],
  ["Spravce klubu", "provoz@siruch.cz", "siruch-provoz", "manager"],
  ["Vypletac", "vypletac@siruch.cz", "siruch-vyplet", "stringer"],
  ["Obchod", "obchod@siruch.cz", "siruch-obchod", "seller"],
];

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";", 1)[0] || "";
}

async function request(path, cookie, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers || {}),
    },
    redirect: "manual",
  });
}

async function json(response, expected, label) {
  const body = await response.json().catch(() => null);
  if (response.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${response.status} (${body?.error?.code || "invalid response"}).`);
  }
  return body;
}

for (const [label, email, password, expectedRole] of accounts) {
  const loginResponse = await request("/api/v2/auth/login", "", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const login = await json(loginResponse, 200, `${label} login`);
  const setCookie = loginResponse.headers.get("set-cookie") || "";
  if (baseUrl.startsWith("https://") && (!/Secure/i.test(setCookie) || !/HttpOnly/i.test(setCookie) || !/SameSite=Lax/i.test(setCookie))) {
    throw new Error(`${label}: production session cookie is missing a security attribute.`);
  }
  const cookie = cookieFrom(loginResponse);
  if (!cookie) throw new Error(`${label}: session cookie is missing.`);

  const me = await json(await request("/api/v2/me", cookie), 200, `${label} identity`);
  if (me.user?.email !== email) throw new Error(`${label}: another user's identity was returned.`);
  const clubs = await json(await request("/api/v2/me/clubs", cookie), 200, `${label} clubs`);
  const membership = clubs.clubs?.[0];
  if (!membership?.clubId) throw new Error(`${label}: club membership is missing.`);
  if (membership.role !== expectedRole) {
    throw new Error(`${label}: expected role ${expectedRole}, received ${membership.role}.`);
  }

  const clubId = membership.clubId;
  await json(await request(`/api/v2/clubs/${clubId}/context`, cookie), 200, `${label} context`);
  if (expectedRole === "player") {
    await Promise.all([
      json(await request(`/api/v2/clubs/${clubId}/me/notifications`, cookie), 200, `${label} notifications`),
      json(await request(`/api/v2/clubs/${clubId}/me/reservations`, cookie), 200, `${label} reservations`),
      json(await request(`/api/v2/clubs/${clubId}/directory`, cookie), 200, `${label} directory`),
      json(await request(`/api/v2/clubs/${clubId}/me/orders`, cookie), 200, `${label} orders`),
    ]);
  } else if (expectedRole === "admin" || expectedRole === "manager") {
    await Promise.all([
      json(await request(`/api/v2/clubs/${clubId}/members`, cookie), 200, `${label} members`),
      json(await request(`/api/v2/clubs/${clubId}/orders`, cookie), 200, `${label} orders`),
    ]);
    if (expectedRole === "manager") {
      await json(await request(`/api/v2/clubs/${clubId}/modules/core`, cookie, {
        method: "PUT",
        body: JSON.stringify({ enabled: true, config: {} }),
      }), 403, `${label} module isolation`);
    }
  } else if (expectedRole === "stringer") {
    await json(await request(`/api/v2/clubs/${clubId}/stringing-jobs`, cookie), 200, `${label} stringing jobs`);
  } else if (expectedRole === "seller") {
    await json(await request(`/api/v2/clubs/${clubId}/supplier-requests`, cookie), 200, `${label} supplier requests`);
  }

  await json(await request("/api/v2/auth/logout", cookie, { method: "POST" }), 200, `${label} logout`);
  await json(await request("/api/v2/me", cookie), 401, `${label} revoked session`);
  console.log(`OK ${label} (${expectedRole})`);
}

console.log(`Role smoke passed for ${accounts.length} isolated accounts at ${baseUrl}.`);
