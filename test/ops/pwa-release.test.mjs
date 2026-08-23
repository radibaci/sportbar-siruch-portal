import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("publishes a stable PWA URL and refreshes release files without query versions", () => {
  const app = read("app.js");
  const index = read("index.html");
  const manifest = read("manifest.webmanifest");
  const worker = read("sw.js");
  const headers = read("_headers");
  assert.match(index, /src="app\.js"/);
  assert.match(index, /href="styles\.css"/);
  assert.match(index, /href="manifest\.webmanifest"/);
  assert.match(manifest, /"start_url": "\.\/"/);
  assert.doesNotMatch(`${app}\n${index}\n${manifest}\n${worker}`, /\?v=\d+/);
  assert.match(worker, /self\.skipWaiting\(\)/);
  assert.match(worker, /clients\.claim\(\)/);
  assert.match(worker, /freshFirst/);
  assert.match(headers, /\/app\.js[\s\S]*?Cache-Control: no-cache, no-store/);
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
