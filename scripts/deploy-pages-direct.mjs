import { createRequire } from "node:module";
import { homedir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const blake3 = require("blake3-wasm");

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const pagesConfig = JSON.parse(
  await readFile(join(root, "node_modules", ".cache", "wrangler", "pages.json"), "utf8"),
);
const oauthPath = join(
  process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
  "xdg.config",
  ".wrangler",
  "config",
  "default.toml",
);

const PROJECT = pagesConfig.project_name;
const ACCOUNT = pagesConfig.account_id;
const API_ROOT = "https://api.cloudflare.com/client/v4";
const CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";
const appSource = await readFile(join(root, "app.js"), "utf8");

function readTomlString(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match?.[1] || "";
}

async function getAccessToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN;
  }
  if (process.env.CLOUDFLARE_API_TOKEN_FILE) {
    return (await readFile(resolve(process.env.CLOUDFLARE_API_TOKEN_FILE), "utf8")).trim();
  }

  let source = await readFile(oauthPath, "utf8");
  const storedToken = readTomlString(source, "oauth_token");
  const expiration = Date.parse(readTomlString(source, "expiration_time"));
  if (storedToken && Number.isFinite(expiration) && expiration > Date.now() + 60_000) {
    return storedToken;
  }

  const refreshToken = readTomlString(source, "refresh_token");
  if (!refreshToken) throw new Error("Cloudflare OAuth refresh token is missing.");

  const response = await fetch("https://dash.cloudflare.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Cloudflare OAuth refresh failed (${response.status}).`);
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

async function api(path, init, token) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const message = body?.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`Cloudflare API ${path} failed (${response.status}): ${message}`);
  }
  return body?.result;
}

async function collectFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await collectFiles(fullPath)));
    else if (entry.isFile() && !["_headers", "_redirects", "_worker.js"].includes(entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
}

function contentType(filePath) {
  return {
    ".css": "text/css",
    ".html": "text/html",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webmanifest": "application/manifest+json",
    ".webp": "image/webp",
  }[extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function createAsset(filePath) {
  const bytes = await readFile(filePath);
  const extension = extname(filePath).slice(1);
  const hash = blake3.hash(`${bytes.toString("base64")}${extension}`).toString("hex").slice(0, 32);
  const pathname = `/${relative(dist, filePath).split(sep).join("/")}`;
  return { bytes, hash, pathname, contentType: contentType(filePath) };
}

async function uploadAssets(assets, uploadToken) {
  const missing = await api(
    "/pages/assets/check-missing",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${uploadToken}` },
      body: JSON.stringify({ hashes: assets.map(({ hash }) => hash) }),
    },
    uploadToken,
  );
  const missingHashes = new Set(missing);
  const pending = assets.filter(({ hash }) => missingHashes.has(hash));

  for (let start = 0; start < pending.length; start += 40) {
    const chunk = pending.slice(start, start + 40);
    await api(
      "/pages/assets/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${uploadToken}` },
        body: JSON.stringify(
          chunk.map(({ bytes, contentType: type, hash }) => ({
            key: hash,
            value: bytes.toString("base64"),
            metadata: { contentType: type },
            base64: true,
          })),
        ),
      },
      uploadToken,
    );
  }

  await api(
    "/pages/assets/upsert-hashes",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${uploadToken}` },
      body: JSON.stringify({ hashes: assets.map(({ hash }) => hash) }),
    },
    uploadToken,
  );
}

async function workerBundle() {
  const source = `
const UPSTREAM_API = "https://tenissiruch-api.bacik.workers.dev";

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    if (incomingUrl.pathname === "/api" || incomingUrl.pathname.startsWith("/api/")) {
      const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, UPSTREAM_API);
      const headers = new Headers(request.headers);
      headers.delete("host");
      headers.delete("referer");
      const upstreamRequest = new Request(upstreamUrl, {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
      });
      const response = await fetch(upstreamRequest);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    return env.ASSETS.fetch(request);
  },
};
`.trim();

  const bundle = new FormData();
  bundle.append("metadata", JSON.stringify({ main_module: "_worker.js" }));
  bundle.append(
    "_worker.js",
    new Blob([source], { type: "application/javascript+module" }),
    "_worker.js",
  );
  const response = new Response(bundle);
  return new Blob([await response.arrayBuffer()], {
    type: response.headers.get("content-type"),
  });
}

const token = await getAccessToken();
await api(`/accounts/${ACCOUNT}/pages/projects/${PROJECT}`, {}, token);
const uploadTokenResult = await api(
  `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/upload-token`,
  {},
  token,
);
const uploadToken = uploadTokenResult.jwt;
if (!uploadToken) throw new Error("Cloudflare Pages upload token is missing.");
const assets = await Promise.all((await collectFiles(dist)).map(createAsset));
await uploadAssets(assets, uploadToken);

const manifest = Object.fromEntries(assets.map(({ pathname, hash }) => [pathname, hash]));
const deploymentForm = new FormData();
deploymentForm.append("manifest", JSON.stringify(manifest));
deploymentForm.append("branch", "main");
deploymentForm.append("commit_dirty", "true");
deploymentForm.append("commit_message", "Publish portal");

const headersPath = join(dist, "_headers");
if ((await stat(headersPath).catch(() => null))?.isFile()) {
  deploymentForm.append("_headers", new Blob([await readFile(headersPath)]), "_headers");
}
deploymentForm.append("_worker.bundle", await workerBundle(), "_worker.bundle");

const deployment = await api(
  `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments`,
  { method: "POST", body: deploymentForm },
  token,
);

let status = deployment.latest_stage?.status;
let current = deployment;
for (let attempt = 0; attempt < 30 && !["success", "failure"].includes(status); attempt += 1) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  current = await api(
    `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments/${deployment.id}`,
    {},
    token,
  );
  status = current.latest_stage?.status;
}
if (status !== "success") throw new Error(`Pages deployment ended with status: ${status || "unknown"}.`);

const publicUrl = `https://${PROJECT}.pages.dev`;
async function verifyRelease(baseUrl, attempts = 1) {
  let lastReason = "unknown verification error";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cacheBust = Date.now();
    const [htmlResponse, scriptResponse, healthResponse] = await Promise.all([
      fetch(`${baseUrl}/?published=${cacheBust}`, { cache: "no-store" }),
      fetch(`${baseUrl}/app.js?published=${cacheBust}`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/v2/health?published=${cacheBust}`, { cache: "no-store" }),
    ]);
    const html = await htmlResponse.text();
    const script = await scriptResponse.text();
    if (!html.includes(`src="app.js"`)) lastReason = "Public HTML does not reference the stable app.js URL";
    else if (script !== appSource) lastReason = "app.js has not propagated yet";
    else if (!healthResponse.ok) lastReason = `API proxy health check returned ${healthResponse.status}`;
    else return healthResponse.status;
    if (attempt + 1 < attempts) await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  }
  throw new Error(`${baseUrl}: ${lastReason}.`);
}

await verifyRelease(String(current.url).replace(/\/$/, ""));
const healthStatus = await verifyRelease(publicUrl, 20);

console.log(`Published ${PROJECT} successfully.`);
console.log(`URL: ${publicUrl}/`);
console.log(`Deployment: ${current.url}`);
console.log(`Assets: ${assets.length}; API health: ${healthStatus}`);
