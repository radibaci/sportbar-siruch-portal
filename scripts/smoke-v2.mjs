import { runApiSmoke } from "./lib/smoke-client.mjs";

const apiBase = String(process.env.PLATFORM_API_URL || "").replace(/\/$/, "");
console.log(`Smoke target: ${apiBase || "missing"}`);

const result = await runApiSmoke({
  apiBase,
  email: process.env.SMOKE_EMAIL,
  password: process.env.SMOKE_PASSWORD,
  origin: process.env.SMOKE_ORIGIN
});

console.log(`Smoke passed: ${result.clubName}, ${result.courtCount} court(s), session revoked.`);
