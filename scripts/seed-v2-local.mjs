import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const config = join(root, "wrangler.v2.jsonc");
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const database = "tennis_club_platform_v2_staging";
const now = new Date().toISOString();
const sqlPath = join(root, ".tmp-v2-seed.sql");
const writeOnly = process.argv.includes("--write-only");

const accounts = [
  ["admin", "spravce@siruch.cz", "Spravce", "admin", "siruch-admin", 0],
  ["manager", "provoz@siruch.cz", "Spravce klubu", "manager", "siruch-provoz", 0],
  ["robin", "robin@siruch.cz", "Robin", "player", "siruch-robin", 1200],
  ["bob", "bob@siruch.cz", "Bob", "player", "siruch-bob", 1100],
  ["honza", "honza@siruch.cz", "Honza", "player", "siruch-honza", 980],
  ["marek", "marek@siruch.cz", "Marek", "player", "siruch-marek", 900],
  ["darek", "darek@siruch.cz", "Darek", "player", "siruch-darek", 850],
  ["filip", "filip@siruch.cz", "Filip", "player", "siruch-filip", 1450],
  ["radim", "radim@siruch.cz", "Radim", "player", "siruch-radim", 1840],
  ["zbyna", "zbyna@siruch.cz", "Zbyna", "player", "siruch-zbyna", 760],
  ["handa", "handa@siruch.cz", "Handa", "player", "siruch-handa", 1300],
  ["prema", "prema@siruch.cz", "Prema", "player", "siruch-prema", 700],
  ["viki", "viki@siruch.cz", "Viki", "player", "siruch-viki", 1180],
  ["stringer", "vypletac@siruch.cz", "Vypletac", "stringer", "siruch-vyplet", 0],
  ["seller", "obchod@siruch.cz", "Obchod", "seller", "siruch-obchod", 0],
];

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function password(passwordValue) {
  const salt = randomBytes(16);
  const iterations = 100_000;
  const hash = pbkdf2Sync(passwordValue, salt, iterations, 32, "sha256");
  return { hash: hash.toString("base64url"), salt: salt.toString("base64url"), iterations };
}

function nextFridayIso() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  let offset = (5 - date.getDay() + 7) % 7;
  if (offset < 1) offset += 7;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const statements = [
  "PRAGMA foreign_keys = ON",
  ...[
    "global_notifications", "processor_records", "privacy_requests", "privacy_consents", "media_assets",
    "notification_deliveries", "notification_preferences", "push_subscriptions", "reservation_charges",
    "reservation_series_participants", "reservation_series",
    "supplier_event_requests",
    "tournament_matches", "tournament_group_teams", "tournament_group_entries", "tournament_groups", "tournament_team_members", "tournament_teams", "tournament_participants", "club_tournaments",
    "club_poll_votes", "club_poll_options", "club_polls", "replacement_votes", "replacement_candidates", "game_counterproposals", "stringing_jobs", "club_orders", "club_friendships", "friend_requests", "credit_transactions", "member_credit_accounts", "club_credit_rules", "member_notifications", "event_registrations", "club_events",
    "member_busy_slots", "reservation_participants", "reservation_slots", "reservations", "court_block_slots", "court_blocks", "court_price_rules", "member_club_profiles", "club_courts",
    "audit_events", "privacy_preferences", "user_connections", "auth_login_attempts", "auth_sessions",
    "club_modules", "club_memberships", "clubs", "platform_users",
  ].map((table) => `DELETE FROM ${table}`),
  `INSERT INTO clubs (id, slug, name, logo_url, primary_color, accent_color, public_config_json, status, created_at, updated_at)
   VALUES ('club-siruch', 'sportbar-siruch', 'Sportbar Siruch', 'assets/club-logo-dm-192.png', '#1f684e', '#d7a846', '{"openingHours":"08:00-21:00","currency":"CZK"}', 'active', ${quote(now)}, ${quote(now)})`,
];

for (const [id, email, displayName, role, rawPassword, credit] of accounts) {
  const credentials = password(rawPassword);
  statements.push(`INSERT INTO platform_users (
    id, email, display_name, password_hash, password_salt, password_iterations, status, discoverability, created_at, updated_at
  ) VALUES (${quote(`user-${id}`)}, ${quote(email)}, ${quote(displayName)}, ${quote(credentials.hash)}, ${quote(credentials.salt)}, ${credentials.iterations}, 'active', 'private', ${quote(now)}, ${quote(now)})`);
  statements.push(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at)
    VALUES (${quote(`member-${id}`)}, 'club-siruch', ${quote(`user-${id}`)}, ${quote(role)}, 'active', ${quote(now)}, ${quote(now)})`);
  if (role === "player") {
    statements.push(`INSERT INTO member_club_profiles (membership_id, club_id, account_type, base_discount_pct, loyalty_discount_pct, discount_reason, updated_by_user_id, updated_at)
      VALUES (${quote(`member-${id}`)}, 'club-siruch', 'club', 0, 0, 'Vychozi klubovy profil', 'user-admin', ${quote(now)})`);
    statements.push(`INSERT INTO member_credit_accounts (membership_id, club_id, paid_balance_minor, bonus_balance_minor, updated_at)
      VALUES (${quote(`member-${id}`)}, 'club-siruch', ${Number(credit) * 100}, 0, ${quote(now)})`);
  }
}

for (const [id, name, surface, color, order] of [
  ["court-1", "Kurt 1", "clay", "#c66532", 1],
  ["court-2", "Kurt 2", "hard", "#2d79c7", 2],
  ["court-3", "Kurt 3", "grass", "#3d8f51", 3],
  ["court-4", "Kurt 4", "clay", "#c66532", 4],
]) {
  statements.push(`INSERT INTO club_courts (id, club_id, name, surface, color, photo_url, open_time, close_time, active, sort_order, created_at, updated_at)
    VALUES (${quote(id)}, 'club-siruch', ${quote(name)}, ${quote(surface)}, ${quote(color)}, 'assets/court-top-view.png', '08:00', '21:00', 1, ${order}, ${quote(now)}, ${quote(now)})`);
  statements.push(`INSERT INTO court_price_rules (id, club_id, court_id, day_key, start_time, end_time, price_minor, created_by_user_id, created_at, updated_at)
    VALUES (${quote(`price-${id}`)}, 'club-siruch', ${quote(id)}, 'all', '08:00', '21:00', 18000, 'user-admin', ${quote(now)}, ${quote(now)})`);
}

for (const [id, label, threshold, bonus] of [
  ["credit-rule-3000", "Dobiti 3 000 Kc", 300_000, 10_000],
  ["credit-rule-5000", "Dobiti 5 000 Kc", 500_000, 22_000],
  ["credit-rule-10000", "Dobiti 10 000 Kc", 1_000_000, 55_000],
]) {
  statements.push(`INSERT INTO club_credit_rules (id, club_id, label, threshold_minor, bonus_minor, active, note, created_at, updated_at)
    VALUES (${quote(id)}, 'club-siruch', ${quote(label)}, ${threshold}, ${bonus}, 1, 'Automaticky bonus Sportbar Siruch', ${quote(now)}, ${quote(now)})`);
}

for (const moduleKey of ["reservations", "community", "events", "tournaments", "payments", "shop", "stringing", "operations", "analytics"]) {
  statements.push(`INSERT INTO club_modules (club_id, module_key, enabled, config_json, updated_by_user_id, updated_at)
    VALUES ('club-siruch', ${quote(moduleKey)}, 1, '{}', 'user-admin', ${quote(now)})`);
}

const friday = nextFridayIso();
statements.push(`INSERT INTO reservations (id, club_id, court_id, owner_membership_id, reservation_date, start_time, end_time, game_type, status, title, created_at, updated_at)
  VALUES ('reservation-friday-double', 'club-siruch', 'court-1', 'member-radim', ${quote(friday)}, '17:00', '19:00', 'double', 'confirmed', 'Patecni double', ${quote(now)}, ${quote(now)})`);
for (const [member, status] of [["radim", "owner"], ["robin", "confirmed"], ["bob", "confirmed"], ["honza", "confirmed"]]) {
  statements.push(`INSERT INTO reservation_participants (reservation_id, membership_id, status, invited_by_membership_id, responded_at, created_at, updated_at)
    VALUES ('reservation-friday-double', ${quote(`member-${member}`)}, ${quote(status)}, 'member-radim', ${quote(now)}, ${quote(now)}, ${quote(now)})`);
}
for (const time of ["17:00", "17:30", "18:00", "18:30"]) {
  const slot = `${friday}T${time}`;
  statements.push(`INSERT INTO reservation_slots (reservation_id, court_id, slot_at) VALUES ('reservation-friday-double', 'court-1', ${quote(slot)})`);
  for (const member of ["radim", "robin", "bob", "honza"]) {
    statements.push(`INSERT INTO member_busy_slots (club_id, membership_id, reservation_id, slot_at)
      VALUES ('club-siruch', ${quote(`member-${member}`)}, 'reservation-friday-double', ${quote(slot)})`);
  }
}

if (writeOnly) {
  writeFileSync(sqlPath, `${statements.join(";\n")};\n`, "utf8");
  console.log(`Prepared seed SQL for ${accounts.length} accounts, 4 courts and the Friday double in ${sqlPath}.`);
} else try {
  execFileSync(process.execPath, [wrangler, "d1", "migrations", "apply", database, "--local", "--config", config], { cwd: root, stdio: "inherit" });
  writeFileSync(sqlPath, `${statements.join(";\n")};\n`, "utf8");
  execFileSync(process.execPath, [wrangler, "d1", "execute", database, "--local", "--config", config, "--file", sqlPath], { cwd: root, stdio: "inherit" });
  console.log(`Seeded ${accounts.length} accounts, 4 courts and the Friday double into local D1.`);
} finally {
  rmSync(sqlPath, { force: true });
}
