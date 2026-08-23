import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";
const oauthPath = join(
  process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
  "xdg.config",
  ".wrangler",
  "config",
  "default.toml",
);

function readTomlString(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match?.[1] || "";
}

export async function getCloudflareAccessToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  if (process.env.CLOUDFLARE_API_TOKEN_FILE) {
    return (await readFile(resolve(process.env.CLOUDFLARE_API_TOKEN_FILE), "utf8")).trim();
  }

  let source = await readFile(oauthPath, "utf8");
  const storedToken = readTomlString(source, "oauth_token");
  const expiration = Date.parse(readTomlString(source, "expiration_time"));
  if (storedToken && Number.isFinite(expiration) && expiration > Date.now() + 60_000) return storedToken;

  const refreshToken = readTomlString(source, "refresh_token");
  if (!refreshToken) throw new Error("Cloudflare OAuth refresh token is missing.");
  const response = await fetch("https://dash.cloudflare.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: CLIENT_ID }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    const reason = [body?.error, body?.error_description].filter(Boolean).join(": ");
    throw new Error(`Cloudflare OAuth refresh failed (${response.status})${reason ? `: ${reason}` : "."}`);
  }

  const replacements = {
    oauth_token: body.access_token,
    expiration_time: new Date(Date.now() + Number(body.expires_in || 3600) * 1000).toISOString(),
    ...(body.refresh_token ? { refresh_token: body.refresh_token } : {}),
    ...(body.scope ? { scopes: body.scope } : {}),
  };
  for (const [key, value] of Object.entries(replacements)) {
    const line = `${key} = ${JSON.stringify(value)}`;
    const expression = new RegExp(`^${key}\\s*=.*$`, "m");
    source = expression.test(source) ? source.replace(expression, line) : `${source.trimEnd()}\n${line}\n`;
  }
  await writeFile(oauthPath, source, { encoding: "utf8", mode: 0o600 });
  return body.access_token;
}

export async function cloudflareApi(path, init = {}, token = "") {
  const accessToken = token || await getCloudflareAccessToken();
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const message = body?.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`Cloudflare API failed (${response.status}): ${message}`);
  }
  return body?.result;
}
