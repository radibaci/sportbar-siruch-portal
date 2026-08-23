import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("connects reservation teammate corrections and full cancellation across UI and API", () => {
  const app = read("app.js");
  const reservations = read("worker-v2/routes/reservations.ts");
  const clubs = read("worker-v2/routes/clubs.ts");
  assert.match(app, /reservation-participants-save/);
  assert.match(app, /method: "PATCH"/);
  assert.match(app, /reservation-cancel/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /clubCancellationMinutesInput/);
  assert.match(reservations, /reservations\/:reservationId\/participants/);
  assert.match(reservations, /reservationCancellationMinutes/);
  assert.match(clubs, /cancellationMinutes/);
});
