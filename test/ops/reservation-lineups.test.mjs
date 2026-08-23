import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../../app.js", import.meta.url), "utf8");
const reservations = readFileSync(new URL("../../worker-v2/routes/reservations.ts", import.meta.url), "utf8");
const coordination = readFileSync(new URL("../../worker-v2/routes/coordination.ts", import.meta.url), "utf8");

test("offers external lineup, confirmed friends, and public search in that order", () => {
  const external = app.indexOf("Mám vlastní sestavu");
  const friends = app.indexOf("Pozvat moje kamarády");
  const search = app.indexOf("Hledám spoluhráče");
  assert.ok(external >= 0 && friends > external && search > friends);
  assert.match(app, /friendsForPlayer\(\)/);
  assert.match(app, /bookingExternalConfirmed/);
});

test("validates friendships and player availability on the API", () => {
  assert.match(reservations, /ensureFriendParticipants/);
  assert.match(reservations, /ensureMembersAvailable/);
  assert.match(reservations, /friend-availability/);
  assert.match(reservations, /external_participants_json/);
});

test("persists public join requests and requires lineup voting", () => {
  assert.match(coordination, /join-request/);
  assert.match(coordination, /join_request_exists/);
  assert.match(coordination, /replacement_vote/);
  assert.match(app, /joinPlatformOpenGame/);
});

test("hides attendance reminders after their reservation has ended", () => {
  assert.match(app, /\["reservation", "reservation_reminder"\]\.includes\(item\.entity_type\)/);
  assert.match(app, /item\.reservationId && reservationHasEnded\(reservationById\(item\.reservationId\)\)/);
});
