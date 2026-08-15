import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
if (!args.has("--remote") || process.env.RELEASE_CONFIRM !== "DEPLOY_V2") {
  throw new Error("Remote release requires --remote and RELEASE_CONFIRM=DEPLOY_V2.");
}

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const git = process.platform === "win32" ? "git.exe" : "git";
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = join(root, "wrangler.v2.jsonc");
const database = process.env.D1_DATABASE_NAME || "tennis_club_platform_v2_staging";
if (!process.env.PLATFORM_API_URL || !process.env.SMOKE_EMAIL || !process.env.SMOKE_PASSWORD) {
  throw new Error("Remote release requires PLATFORM_API_URL, SMOKE_EMAIL and SMOKE_PASSWORD for the post-deploy smoke test.");
}

const status = execFileSync(git, ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
if (status.trim() && !args.has("--allow-dirty")) {
  throw new Error("The release workspace is dirty. Commit reviewed changes first, or explicitly pass --allow-dirty for an emergency release.");
}

console.log("1/5 Running the complete release gate...");
execFileSync(npm, ["run", "v2:check"], { cwd: root, stdio: "inherit" });

console.log("2/5 Exporting the remote database before any schema change...");
execFileSync(process.execPath, [join(root, "scripts", "backup-d1.mjs"), "--remote"], { cwd: root, stdio: "inherit" });

console.log("3/5 Applying additive D1 migrations...");
execFileSync(process.execPath, [wrangler, "d1", "migrations", "apply", database, "--remote", "--config", config], { cwd: root, stdio: "inherit" });

console.log("4/5 Deploying the compatible API...");
execFileSync(process.execPath, [wrangler, "deploy", "--strict", "--keep-vars", "--config", config], { cwd: root, stdio: "inherit" });

console.log("5/5 Running authenticated read-only API smoke tests...");
execFileSync(process.execPath, [join(root, "scripts", "smoke-v2.mjs")], { cwd: root, stdio: "inherit", env: process.env });

console.log("V2 API release and authenticated smoke test completed. The compatible frontend cache version can now be published.");
