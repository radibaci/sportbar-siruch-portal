import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveClubModules } from "./lib/module-plan.mjs";

const rawArgs = process.argv.slice(2);
const option = (name, fallback = "") => rawArgs.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const remote = rawArgs.includes("--remote");
const slug = option("slug").toLowerCase();
const name = option("name");
const adminEmail = option("admin-email").toLowerCase();
const adminName = option("admin-name", "Spravce");
const planOnly = rawArgs.includes("--plan");
const requestedModules = option("modules", "reservations,community,events,tournaments,payments,shop,stringing,operations,analytics").split(",").map((item) => item.trim()).filter(Boolean);
const modules = resolveClubModules(requestedModules);
const courtCount = Math.min(20, Math.max(1, Number.parseInt(option("courts", "1"), 10) || 1));
const password = process.env.CLUB_ADMIN_PASSWORD || "";
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
  throw new Error("Required: --slug=club-name --name=\"Club Name\" --admin-email=admin@example.com");
}
if (planOnly) {
  console.log(JSON.stringify({ slug, name, adminEmail, adminName, courtCount, requestedModules, effectiveModules: modules }, null, 2));
  process.exit(0);
}
if (password.length < 12) throw new Error("Set CLUB_ADMIN_PASSWORD to at least 12 characters. It is never accepted as a command argument.");

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const now = new Date().toISOString();
const clubId = randomUUID();
const userId = randomUUID();
const membershipId = randomUUID();
const salt = randomBytes(16);
const iterations = 210_000;
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const sql = [
  `INSERT INTO clubs (id, slug, name, primary_color, accent_color, public_config_json, status, created_at, updated_at) VALUES (${quote(clubId)}, ${quote(slug)}, ${quote(name)}, '#1f684e', '#d7a846', '{"openingHours":"08:00-21:00","currency":"CZK"}', 'active', ${quote(now)}, ${quote(now)})`,
  `INSERT INTO platform_users (id, email, display_name, password_hash, password_salt, password_iterations, status, discoverability, created_at, updated_at) VALUES (${quote(userId)}, ${quote(adminEmail)}, ${quote(adminName)}, ${quote(hash.toString("base64url"))}, ${quote(salt.toString("base64url"))}, ${iterations}, 'active', 'private', ${quote(now)}, ${quote(now)})`,
  `INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES (${quote(membershipId)}, ${quote(clubId)}, ${quote(userId)}, 'admin', 'active', ${quote(now)}, ${quote(now)})`,
  ...modules.map((moduleKey) => `INSERT INTO club_modules (club_id, module_key, enabled, config_json, updated_by_user_id, updated_at) VALUES (${quote(clubId)}, ${quote(moduleKey)}, 1, '{}', ${quote(userId)}, ${quote(now)})`),
  ...Array.from({ length: courtCount }, (_, index) => {
    const courtId = randomUUID();
    const surface = index % 3 === 1 ? "hard" : index % 3 === 2 ? "grass" : "clay";
    const color = surface === "hard" ? "#2d79c7" : surface === "grass" ? "#3d8f51" : "#c66532";
    return [
      `INSERT INTO club_courts (id, club_id, name, surface, color, open_time, close_time, active, sort_order, created_at, updated_at) VALUES (${quote(courtId)}, ${quote(clubId)}, ${quote(`Kurt ${index + 1}`)}, ${quote(surface)}, ${quote(color)}, '08:00', '21:00', 1, ${index + 1}, ${quote(now)}, ${quote(now)})`,
      `INSERT INTO court_price_rules (id, club_id, court_id, day_key, start_time, end_time, price_minor, created_by_user_id, created_at, updated_at) VALUES (${quote(randomUUID())}, ${quote(clubId)}, ${quote(courtId)}, 'all', '08:00', '21:00', 18000, ${quote(userId)}, ${quote(now)}, ${quote(now)})`,
    ];
  }).flat(),
  `INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (${quote(randomUUID())}, ${quote(clubId)}, ${quote(userId)}, 'club.provisioned', 'club', ${quote(clubId)}, ${quote(JSON.stringify({ modules }))}, ${quote(now)})`,
].join(";\n") + ";\n";

const root = process.cwd();
const tempFile = join(root, `.tmp-provision-${slug}.sql`);
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = join(root, "wrangler.v2.jsonc");
const database = process.env.D1_DATABASE_NAME || "tennis_club_platform_v2_staging";
try {
  writeFileSync(tempFile, sql, { encoding: "utf8", mode: 0o600 });
  execFileSync(process.execPath, [wrangler, "d1", "execute", database, remote ? "--remote" : "--local", "--file", tempFile, "--config", config], { cwd: root, stdio: "inherit" });
  console.log(`Club provisioned: ${name} (${slug}), ${courtCount} court(s), modules: ${modules.join(", ")}.`);
  console.log(`Admin login: ${adminEmail}. Password was read only from CLUB_ADMIN_PASSWORD.`);
} finally {
  rmSync(tempFile, { force: true });
}
