import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("uses a same-origin API proxy on Cloudflare Pages", () => {
  const app = read("app.js");
  const proxy = read("functions/api/[[path]].js");
  const styles = read("styles.css");
  assert.match(app, /hostname\.endsWith\("\.pages\.dev"\) \? window\.location\.origin/);
  assert.match(proxy, /tenissiruch-api\.bacik\.workers\.dev/);
  assert.doesNotMatch(proxy, /headers\.delete\("origin"\)/);
  assert.match(proxy, /new Response\(response\.body/);
  assert.match(styles, /\.role-switch-bar\[hidden\]\s*\{\s*display:\s*none;/);
});

test("adds browser hardening headers to every public page", () => {
  const headers = read("_headers");
  assert.match(headers, /Content-Security-Policy:/);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
  assert.match(headers, /frame-ancestors 'self'/);
  assert.match(headers, /object-src 'none'/);
});

test("keeps the production API on its own EU database", () => {
  const config = read("wrangler.production.jsonc");
  assert.match(config, /"name": "tenissiruch-api"/);
  assert.match(config, /"database_name": "tenissiruch_portal"/);
  assert.match(config, /461b4add-3284-4480-92d0-538133c90722/);
  assert.match(config, /https:\/\/tenissiruch\.pages\.dev/);
  assert.doesNotMatch(config, /00000000-0000-0000-0000-000000000002/);
});

test("builds and deploys only the public Pages bundle", () => {
  const packageJson = JSON.parse(read("package.json"));
  const build = read("scripts/build-pages.mjs");
  assert.match(packageJson.scripts["pages:deploy"], /--project-name tenissiruch/);
  assert.match(packageJson.scripts["pages:deploy"], /--branch main/);
  assert.match(build, /"assets"/);
  assert.doesNotMatch(build, /worker-v2/);
  assert.doesNotMatch(build, /migrations-v2/);
});
