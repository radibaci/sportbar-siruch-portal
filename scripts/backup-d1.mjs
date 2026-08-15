import { execFileSync } from "node:child_process";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const remote = args.has("--remote");
const root = process.cwd();
const database = process.env.D1_DATABASE_NAME || "tennis_club_platform_v2_staging";
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = join(root, "wrangler.v2.jsonc");
const outputDir = resolve(root, process.env.BACKUP_DIR || "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const sqlPath = join(outputDir, `${database}-${remote ? "remote" : "local"}-${timestamp}.sql`);
const rawKey = process.env.BACKUP_ENCRYPTION_KEY || "";
const encryptionKey = rawKey ? Buffer.from(rawKey, "base64url") : null;
if (remote && encryptionKey?.length !== 32) {
  throw new Error("Remote backups require BACKUP_ENCRYPTION_KEY as a base64url-encoded 32-byte key.");
}
if (encryptionKey && encryptionKey.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes.");

mkdirSync(outputDir, { recursive: true });
execFileSync(process.execPath, [
  wrangler, "d1", "export", database, remote ? "--remote" : "--local",
  "--output", sqlPath, "--config", config, "--skip-confirmation",
], { cwd: root, stdio: "inherit" });

let backupPath = sqlPath;
let encryption = null;
if (encryptionKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(readFileSync(sqlPath)), cipher.final()]);
  const tag = cipher.getAuthTag();
  backupPath = `${sqlPath}.enc`;
  writeFileSync(backupPath, encrypted, { mode: 0o600 });
  rmSync(sqlPath, { force: true });
  encryption = { algorithm: "aes-256-gcm", iv: iv.toString("base64url"), authTag: tag.toString("base64url") };
}
const sha256 = createHash("sha256").update(readFileSync(backupPath)).digest("hex");
const manifest = {
  format: 1,
  database,
  source: remote ? "remote" : "local",
  createdAt: new Date().toISOString(),
  sqlFile: backupPath.split(/[\\/]/).pop(),
  sha256,
  encryption,
};
writeFileSync(`${backupPath}.json`, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`Backup ready: ${backupPath}`);
console.log(`SHA-256: ${sha256}`);
