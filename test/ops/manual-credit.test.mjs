import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../../app.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} source is missing`);
  return app.slice(start, end);
}

test("keeps Tennis Siruch player credit read-only", () => {
  const profile = functionSource("renderProfile", "renderNavigation");
  assert.match(profile, /Kredit pripisuje klub/);
  assert.match(profile, /Penize prijme klub a kredit pripise spravce/);
  assert.doesNotMatch(profile, /data-action="pay"/);
  assert.doesNotMatch(profile, /QR/);
});

test("books courts against club credit without a payment selector", () => {
  const booking = functionSource("bookingModal", "cancelModal");
  assert.match(booking, /Po odehrani se odecte z kluboveho kreditu/);
  assert.doesNotMatch(booking, /QR/);
  assert.doesNotMatch(booking, /label>Platba/);
});

test("preserves club module configuration when toggling a module", () => {
  assert.match(app, /config:current\?\.config\|\|\{\}/);
});
