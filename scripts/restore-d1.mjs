import { execFileSync } from "node:child_process";
import { createDecipheriv, createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const rawArgs = process.argv.slice(2);
const backupArg = rawArgs.find((item) => !item.startsWith("--"));
const remote = rawArgs.includes("--remote");
if (!backupArg) throw new Error("Usage: npm run db:restore -- backups/file.sql[.enc] [--remote --confirm-remote]");
if (remote && !rawArgs.includes("--confirm-remote")) {
  throw new Error("Remote restore requires --confirm-remote. Restore into staging and verify it before production use.");
}

const root = process.cwd();
const sqlPath = resolve(root, backupArg);
const manifestPath = `${sqlPath}.json`;
if (!existsSync(sqlPath) || !existsSync(manifestPath)) throw new Error("The SQL backup or its checksum manifest is missing.");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const actualHash = createHash("sha256").update(readFileSync(sqlPath)).digest("hex");
if (actualHash !== manifest.sha256) throw new Error("Backup checksum mismatch. Restore stopped.");

let restoreSqlPath = sqlPath;
if (manifest.encryption) {
  const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY || "", "base64url");
  if (key.length !== 32) throw new Error("Encrypted backup requires the original 32-byte BACKUP_ENCRYPTION_KEY.");
  if (manifest.encryption.algorithm !== "aes-256-gcm") throw new Error("Unsupported backup encryption algorithm.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(manifest.encryption.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(manifest.encryption.authTag, "base64url"));
  const plaintext = Buffer.concat([decipher.update(readFileSync(sqlPath)), decipher.final()]);
  restoreSqlPath = resolve(root, `.tmp-restore-${randomUUID()}.sql`);
  writeFileSync(restoreSqlPath, plaintext, { mode: 0o600 });
}
if (rawArgs.includes("--verify-only")) {
  if (restoreSqlPath !== sqlPath) rmSync(restoreSqlPath, { force: true });
  console.log(`Backup verified: ${basename(sqlPath)}. Checksum and authenticated decryption succeeded.`);
  process.exit(0);
}

// D1 exports interleave CREATE TABLE and INSERT statements. A later migration
// can add a foreign key to a table that appears farther down in the export, so
// restore every schema object before inserting any rows.
const importSqlPath = resolve(root, `.tmp-restore-import-${randomUUID()}.sql`);
const exportedLines = readFileSync(restoreSqlPath, "utf8").split(/\r?\n/);
const inserts = exportedLines.filter((line) => /^INSERT INTO\s/i.test(line));
const schema = exportedLines.filter((line) => !/^INSERT INTO\s/i.test(line));
writeFileSync(importSqlPath, `${schema.join("\n")}\n${inserts.join("\n")}\n`, { mode: 0o600 });
if (restoreSqlPath !== sqlPath) rmSync(restoreSqlPath, { force: true });
restoreSqlPath = importSqlPath;

const database = process.env.D1_RESTORE_DATABASE || manifest.database;
if (database === manifest.database && !rawArgs.includes("--allow-in-place")) {
  throw new Error("Restore into a separate empty database by setting D1_RESTORE_DATABASE. In-place restore additionally requires --allow-in-place.");
}
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = join(root, "wrangler.v2.jsonc");
let restoreConfig = config;
let restoreTarget = database;
let temporaryConfig = null;
if (database !== manifest.database) {
  const databaseId = process.env.D1_RESTORE_DATABASE_ID || (remote ? "" : randomUUID());
  if (!databaseId) throw new Error("Remote restore into staging requires D1_RESTORE_DATABASE_ID for the pre-created target database.");
  temporaryConfig = resolve(root, `.tmp-restore-config-${randomUUID()}.json`);
  writeFileSync(temporaryConfig, `${JSON.stringify({
    name: "tennis-club-restore-helper",
    compatibility_date: "2026-08-06",
    d1_databases: [{ binding: "DB", database_name: database, database_id: databaseId }],
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  restoreConfig = temporaryConfig;
  restoreTarget = "DB";
}
console.log(`Restoring ${basename(sqlPath)} into ${database} (${remote ? "remote" : "local"}).`);
try {
  execFileSync(process.execPath, [
    wrangler, "d1", "execute", restoreTarget, remote ? "--remote" : "--local",
    "--file", restoreSqlPath, "--config", restoreConfig,
  ], { cwd: root, stdio: "inherit" });
  if (!remote) {
    execFileSync(process.execPath, [
      wrangler, "d1", "execute", restoreTarget, "--local",
      "--command", "SELECT COUNT(*) AS tables_restored FROM sqlite_master WHERE type='table';", "--config", restoreConfig,
    ], { cwd: root, stdio: "inherit" });
  }
  console.log("Restore completed. Run npm run v2:check and the smoke tests before serving traffic.");
} finally {
  if (restoreSqlPath !== sqlPath) rmSync(restoreSqlPath, { force: true });
  if (temporaryConfig) rmSync(temporaryConfig, { force: true });
}
