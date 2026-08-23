import assert from "node:assert/strict";

const apiBase = String(process.env.PLATFORM_API_URL || "").replace(/\/$/, "");
const clubId = process.env.SMOKE_CLUB_ID || "club-siruch";

if (!apiBase.startsWith("https://") && !apiBase.startsWith("http://localhost")) {
  throw new Error("PLATFORM_API_URL must use HTTPS, or localhost for a local smoke test.");
}

const accounts = {
  radim: ["radim@siruch.cz", "siruch-radim"],
  bob: ["bob@siruch.cz", "siruch-bob"],
};

function cookieFrom(response) {
  return (response.headers.get("set-cookie") || "").split(";", 1)[0];
}

async function request(path, cookie = "", options = {}) {
  return fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://tenissiruch.pages.dev",
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
}

async function login([email, password]) {
  const response = await request("/api/v2/auth/login", "", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, `Login failed for ${email}`);
  return cookieFrom(response);
}

function isoDate(daysFromToday) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function overlaps(item, date, start, end) {
  return item.date === date && item.start < end && item.end > start;
}

async function findTwoFreeCourts(cookie) {
  for (let offset = 21; offset <= 70; offset += 7) {
    const from = isoDate(offset);
    const response = await request(`/api/v2/clubs/${clubId}/schedule?from=${from}&days=7`, cookie);
    assert.equal(response.status, 200, "Schedule lookup failed");
    const schedule = await response.json();
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(`${from}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + day);
      const dayKey = date.toISOString().slice(0, 10);
      for (let hour = 9; hour <= 18; hour += 1) {
        const start = `${String(hour).padStart(2, "0")}:00`;
        const end = `${String(hour + 1).padStart(2, "0")}:00`;
        const free = schedule.courts.filter((court) =>
          court.openTime <= start && court.closeTime >= end &&
          !court.reservations.some((item) => overlaps(item, dayKey, start, end))
        );
        if (free.length >= 2) return { date: dayKey, start, end, courts: free.slice(0, 2) };
      }
    }
  }
  throw new Error("No two free courts found for the production smoke test.");
}

async function createReservation(cookie, body) {
  const response = await request(`/api/v2/clubs/${clubId}/reservations`, cookie, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (response.status !== 201) throw new Error(`Reservation creation failed (${response.status}): ${await response.text()}`);
  return (await response.json()).reservation;
}

async function removeReservation(cookie, reservationId) {
  const response = await request(`/api/v2/clubs/${clubId}/reservations/${reservationId}`, cookie, { method: "DELETE" });
  assert.equal(response.status, 200, `Reservation cleanup failed for ${reservationId}`);
}

const radim = await login(accounts.radim);
const bob = await login(accounts.bob);
const directoryResponse = await request(`/api/v2/clubs/${clubId}/directory`, radim);
assert.equal(directoryResponse.status, 200, "Player directory lookup failed");
const directory = await directoryResponse.json();
const directoryEntries = Object.values(directory).flatMap((value) => Array.isArray(value) ? value : []);
const bobEntry = directoryEntries.find((entry) => entry?.displayName === "Bob");
const bobMembershipId = bobEntry?.membershipId || bobEntry?.id;
assert.ok(bobMembershipId, "Bob membership was not found in the club directory");
const staleMine = await request(`/api/v2/clubs/${clubId}/me/reservations`, radim);
for (const reservation of (await staleMine.json()).reservations || []) {
  if ((reservation.externalParticipants || []).some((name) => name.startsWith("Testovaci "))) {
    await removeReservation(radim, reservation.id).catch(() => {});
  }
}
const slot = await findTwoFreeCourts(radim);
const cleanup = [];

try {
  const external = await createReservation(radim, {
    courtId: slot.courts[0].id,
    date: slot.date,
    start: slot.start,
    end: slot.end,
    gameType: "single",
    playerPlan: "external",
    externalParticipants: ["Testovaci host mimo portal"],
  });
  cleanup.push([radim, external.id]);
  assert.equal(external.status, "confirmed");

  const visible = await request(`/api/v2/clubs/${clubId}/schedule?from=${slot.date}&days=1`, radim);
  const visibleBody = await visible.json();
  const visibleReservation = visibleBody.courts.flatMap((court) => court.reservations).find((item) => item.id === external.id);
  assert.deepEqual(visibleReservation.externalParticipants, ["Testovaci host mimo portal"]);
  await removeReservation(radim, external.id);
  cleanup.pop();

  const openGame = await createReservation(radim, {
    courtId: slot.courts[0].id,
    date: slot.date,
    start: slot.start,
    end: slot.end,
    gameType: "single",
    playerPlan: "search",
  });
  cleanup.push([radim, openGame.id]);

  const conflicting = await createReservation(bob, {
    courtId: slot.courts[1].id,
    date: slot.date,
    start: slot.start,
    end: slot.end,
    gameType: "single",
    playerPlan: "external",
    externalParticipants: ["Testovaci partner"],
  });
  cleanup.push([bob, conflicting.id]);

  const collision = await request(`/api/v2/clubs/${clubId}/reservations/${openGame.id}/join-request`, bob, { method: "POST" });
  assert.equal(collision.status, 409, "Busy player was allowed to join another game");
  await removeReservation(bob, conflicting.id);
  cleanup.pop();

  const joined = await request(`/api/v2/clubs/${clubId}/reservations/${openGame.id}/join-request`, bob, { method: "POST" });
  if (joined.status !== 201) throw new Error(`Join request failed (${joined.status}): ${await joined.text()}`);
  const duplicate = await request(`/api/v2/clubs/${clubId}/reservations/${openGame.id}/join-request`, bob, { method: "POST" });
  assert.equal(duplicate.status, 409, "Duplicate join request was accepted");

  const vote = await request(`/api/v2/clubs/${clubId}/reservations/${openGame.id}/replacements/vote`, radim, {
    method: "POST",
    body: JSON.stringify({ candidateMembershipId: bobMembershipId }),
  });
  if (vote.status !== 200) throw new Error(`Lineup vote failed (${vote.status}): ${await vote.text()}`);
  assert.equal((await vote.json()).selectedMembershipId, bobMembershipId);

  const mine = await request(`/api/v2/clubs/${clubId}/me/reservations`, bob);
  const mineBody = await mine.json();
  assert.ok(mineBody.reservations.some((item) => item.id === openGame.id && item.status === "confirmed"));

  await removeReservation(radim, openGame.id);
  cleanup.pop();
  console.log(`Reservation lineup smoke passed at ${apiBase} (${slot.date} ${slot.start}-${slot.end}).`);
} finally {
  for (const [cookie, reservationId] of cleanup.reverse()) {
    await removeReservation(cookie, reservationId).catch(() => {});
  }
}
