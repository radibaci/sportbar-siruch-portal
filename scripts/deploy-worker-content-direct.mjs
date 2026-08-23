import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCloudflareAccessToken } from "./cloudflare-auth.mjs";

const ACCOUNT_ID = "b519d0c3f8d893d62d2ce70f452f038d";
const SCRIPT_NAME = "tenissiruch-api";
const API_ROOT = "https://api.cloudflare.com/client/v4";
const token = await getCloudflareAccessToken();

const bundlePath = resolve(process.argv[2] || "dist/worker-v2.js");
const bundle = await readFile(bundlePath);
const form = new FormData();
form.append("metadata", JSON.stringify({ main_module: "worker-v2.js" }));
form.append(
  "worker-v2.js",
  new Blob([bundle], { type: "application/javascript+module" }),
  "worker-v2.js",
);

const response = await fetch(
  `${API_ROOT}/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/content`,
  {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  },
);
const body = await response.json().catch(() => null);
if (!response.ok || body?.success === false) {
  const message = body?.errors?.map((error) => error.message).join("; ") || response.statusText;
  throw new Error(`Worker content deployment failed (${response.status}): ${message}`);
}

const healthUrl = `https://${SCRIPT_NAME}.bacik.workers.dev/api/v2/health?published=${Date.now()}`;
const health = await fetch(healthUrl);
if (!health.ok) throw new Error(`Worker health check failed (${health.status}).`);

console.log(`Published ${SCRIPT_NAME} content successfully.`);
console.log(`API health: ${health.status}`);
