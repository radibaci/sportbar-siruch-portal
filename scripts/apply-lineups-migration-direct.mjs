import { cloudflareApi, getCloudflareAccessToken } from "./cloudflare-auth.mjs";

const ACCOUNT_ID = "b519d0c3f8d893d62d2ce70f452f038d";
const DATABASE_ID = "461b4add-3284-4480-92d0-538133c90722";
const queryPath = `/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const token = await getCloudflareAccessToken();

async function query(sql, params = []) {
  return cloudflareApi(queryPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  }, token);
}

const tableInfo = await query("PRAGMA table_info(reservations)");
const columns = tableInfo?.[0]?.results || tableInfo?.results || [];
if (columns.some((column) => column.name === "external_participants_json")) {
  console.log("Reservation lineup migration is already applied.");
} else {
  await query("ALTER TABLE reservations ADD COLUMN external_participants_json TEXT NOT NULL DEFAULT '[]'");
  console.log("Reservation lineup migration applied.");
}

const migrationTable = await query("PRAGMA table_info(v2_d1_migrations)");
const migrationColumns = migrationTable?.[0]?.results || migrationTable?.results || [];
if (migrationColumns.some((column) => column.name === "name")) {
  await query("INSERT OR IGNORE INTO v2_d1_migrations (name) VALUES (?)", ["0019_reservation_lineups.sql"]);
}
