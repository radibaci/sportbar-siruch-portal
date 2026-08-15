import assert from "node:assert/strict";
import test from "node:test";
import { resolveClubModules } from "../../scripts/lib/module-plan.mjs";

test("always provisions the required core", () => {
  assert.deepEqual(resolveClubModules([]), ["core"]);
});

test("expands transitive dependencies in stable catalog order", () => {
  assert.deepEqual(resolveClubModules(["tournaments", "stringing", "ai"]), [
    "core", "reservations", "community", "events", "tournaments", "shop", "stringing", "ai"
  ]);
});

test("deduplicates requested modules", () => {
  assert.deepEqual(resolveClubModules(["payments", "payments"]), ["core", "reservations", "payments"]);
});

test("rejects unknown modules before provisioning", () => {
  assert.throws(() => resolveClubModules(["reservations", "unknown"]), /Unknown module key: unknown/);
});
