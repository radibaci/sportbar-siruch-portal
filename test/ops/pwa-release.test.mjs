import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("keeps the frontend, manifest and service-worker cache on one immutable version", () => {
  const app = read("app.js");
  const index = read("index.html");
  const manifest = read("manifest.webmanifest");
  const worker = read("sw.js");
  const version = app.match(/const DEMO_VERSION = (\d+);/)?.[1];
  assert.ok(version, "app version is missing");
  assert.match(index, new RegExp(`app\\.js\\?v=${version}`));
  assert.match(index, new RegExp(`styles\\.css\\?v=${version}`));
  assert.match(index, new RegExp(`manifest\\.webmanifest\\?v=${version}`));
  assert.match(manifest, new RegExp(`v=${version}`));
  assert.match(worker, new RegExp(`tennis-club-portal-v${version}`));
  assert.match(worker, new RegExp(`app\\.js\\?v=${version}`));
});

test("refreshes live platform data after resume and keeps an offline navigation shell", () => {
  const app = read("app.js");
  const worker = read("sw.js");
  assert.match(app, /visibilitychange/);
  assert.match(app, /window\.addEventListener\("focus"/);
  assert.match(app, /window\.addEventListener\("online"/);
  assert.match(app, /syncPlatformLiveData/);
  assert.match(app, /navigator\.serviceWorker\.addEventListener\("controllerchange"/);
  assert.match(worker, /caches\.match\(APP_START_URL\)/);
  assert.match(worker, /caches\.match\("\.\/index\.html"\)/);
});

test("redraws the court schedule when a date is selected from the month calendar", () => {
  const app = read("app.js");
  assert.match(app, /if \(calendarDate\) \{[\s\S]*?state\.selectedBookingDate[\s\S]*?render\(\);\s*openModal\("book"/);
});
