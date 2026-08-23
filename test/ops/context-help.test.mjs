import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("provides contextual help entry points for every portal role", () => {
  const app = read("app.js");
  for (const role of ["player", "admin", "guest", "stringer", "seller"]) {
    assert.match(app, new RegExp(`roles: \\[.*?"${role}"`), `missing help topic for ${role}`);
  }
  assert.match(app, /function helpTopicsForCurrentView\(\)/);
  assert.match(app, /views\.includes\(state\.view\)/);
});

test("renders an accessible help center and an in-place walkthrough", () => {
  const app = read("app.js");
  const index = read("index.html");
  const styles = read("styles.css");
  assert.match(index, /data-action="help"[^>]*aria-label="Napoveda"/);
  assert.match(index, /id="helpCoachmark"[^>]*aria-live="polite"[^>]*hidden/);
  assert.match(app, /HELP_PROGRESS_KEY/);
  assert.match(app, /data-confirm="help-start"/);
  assert.match(app, /scrollIntoView/);
  assert.match(styles, /\.help-coachmark\s*\{/);
  assert.match(styles, /\.help-target-active\s*\{/);
});

test("keeps contextual help local and deterministic without an AI request", () => {
  const app = read("app.js");
  const helpBlock = app.slice(app.indexOf("const HELP_PROGRESS_KEY"), app.indexOf("const demoLoginAccounts"));
  assert.doesNotMatch(helpBlock, /fetch\(|platformRequest\(|WebSocket|EventSource/);
  assert.match(helpBlock, /localStorage\.setItem\(HELP_PROGRESS_KEY/);
});

test("explains the complete player booking flow", () => {
  const app = read("app.js");
  assert.match(app, /Single potrebuje celkem 2 hrace, double celkem 4 hrace/);
  assert.match(app, /Mam vlastni sestavu pouzij pro domluvene hosty mimo portal/);
  assert.match(app, /Pozvat moje kamarady nabidne jen potvrzene pratele, kteri maji v terminu volno/);
  assert.match(app, /Hledam spoluhrace pouzij az jako verejnou poptavku/);
  assert.match(app, /musi sestava noveho zajemce potvrdit hlasovanim/);
  assert.match(app, /muzes zmenit spoluhrace nebo rezervaci zrusit/);
});

test("keeps every stable walkthrough target connected to a rendered section", () => {
  const app = read("app.js");
  const helpBlock = app.slice(app.indexOf("const HELP_PROGRESS_KEY"), app.indexOf("const demoLoginAccounts"));
  const targets = [...helpBlock.matchAll(/target: "\[data-help-target='([^']+)'\]"/g)].map((match) => match[1]);
  assert.ok(targets.length >= 20, "expected role-specific stable help targets");
  for (const target of new Set(targets)) {
    assert.match(app, new RegExp(`data-help-target=["']${target}["']`), `missing rendered target ${target}`);
  }
  assert.match(app, /if \(!topic\.views\.includes\(state\.view\)\)/);
  assert.match(app, /state\.view = topic\.views\[0\]/);
  assert.doesNotMatch(app, /document\.querySelector\(step\.target\) \|\| content/);
});
