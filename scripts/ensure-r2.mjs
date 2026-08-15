import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

const accountId = "b519d0c3f8d893d62d2ce70f452f038d";
const bucketName = process.argv[2] || "tenissiruch-media";
const configPath = join(
  process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
  "xdg.config",
  ".wrangler",
  "config",
  "default.toml",
);
const source = await readFile(configPath, "utf8");
const value = (key) => source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"))?.[1] || "";
let accessToken = value("oauth_token");
const expiration = Date.parse(value("expiration_time"));
if (!accessToken || !Number.isFinite(expiration) || expiration <= Date.now() + 60_000) {
  const refreshToken = value("refresh_token");
  if (!refreshToken) throw new Error("Cloudflare OAuth refresh token is missing.");
  const tokenResponse = await fetch("https://dash.cloudflare.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: "54d11594-84e4-41aa-b438-e81b8fa78ee7",
    }),
  });
  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error("Cloudflare login expired. Run npm run cf:login and retry.");
  }
  accessToken = tokenBody.access_token;
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
const authHeaders = { Authorization: `Bearer ${accessToken}` };
const existingResponse = await fetch(`${endpoint}/${bucketName}`, { headers: authHeaders });
if (existingResponse.ok) {
  console.log(`R2 bucket already exists: ${bucketName}`);
  process.exit(0);
}

const createResponse = await fetch(endpoint, {
  method: "POST",
  headers: { ...authHeaders, "Content-Type": "application/json", "cf-r2-jurisdiction": "eu" },
  body: JSON.stringify({ name: bucketName, locationHint: "weur", storageClass: "Standard" }),
});
const createBody = await createResponse.json().catch(() => null);
if (!createResponse.ok || createBody?.success === false) {
  const message = createBody?.errors?.map((error) => error.message).join("; ") || createResponse.statusText;
  throw new Error(`R2 bucket creation failed (${createResponse.status}): ${message}`);
}
console.log(`R2 bucket created in EU jurisdiction: ${bucketName}`);
