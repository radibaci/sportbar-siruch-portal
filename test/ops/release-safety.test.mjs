import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("requires an encrypted backup before a remote API release", () => {
  const release = read("scripts/release-v2.mjs");
  const backup = read("scripts/backup-d1.mjs");
  assert.match(release, /RELEASE_CONFIRM/);
  assert.match(release, /backup-d1\.mjs/);
  assert.match(release, /v2:check/);
  assert.match(release, /smoke-v2\.mjs/);
  assert.match(backup, /Remote backups require BACKUP_ENCRYPTION_KEY/);
  assert.match(backup, /aes-256-gcm/);
});

test("blocks accidental production restore and verifies backup integrity", () => {
  const restore = read("scripts/restore-d1.mjs");
  assert.match(restore, /--confirm-remote/);
  assert.match(restore, /--allow-in-place/);
  assert.match(restore, /checksum mismatch/i);
  assert.match(restore, /--verify-only/);
  assert.match(restore, /D1_RESTORE_DATABASE_ID/);
});

test("derives the direct Pages deployment version from the application", () => {
  const deploy = read("scripts/deploy-pages-direct.mjs");
  assert.match(deploy, /const releaseVersion = appSource\.match/);
  assert.match(deploy, /Public HTML does not reference app\.js v\$\{releaseVersion\}/);
  assert.doesNotMatch(deploy, /Publish portal v123/);
});
