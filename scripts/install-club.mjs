import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args=process.argv.slice(2); const remote=args.includes("--remote"); const root=process.cwd();
const required=["slug","name","admin-email"]; const option=(name)=>args.find((item)=>item.startsWith(`--${name}=`))?.slice(name.length+3)||"";
for(const name of required) if(!option(name)) throw new Error(`Missing --${name}=...`);
if(!process.env.CLUB_ADMIN_PASSWORD||process.env.CLUB_ADMIN_PASSWORD.length<12) throw new Error("Set CLUB_ADMIN_PASSWORD to a unique password of at least 12 characters.");
if(remote&&process.env.INSTALL_CONFIRM!=="CREATE_CLUB") throw new Error("Remote installation requires INSTALL_CONFIRM=CREATE_CLUB.");
const npm=process.platform==="win32"?"npm.cmd":"npm"; const wrangler=join(root,"node_modules","wrangler","bin","wrangler.js"); const config=join(root,"wrangler.v2.jsonc"); const database=process.env.D1_DATABASE_NAME||"tennis_club_platform_v2_staging";
console.log("1/4 Verifying API, migrations and integration tests..."); execFileSync(npm,["run","v2:check"],{cwd:root,stdio:"inherit"});
if(remote){console.log("2/4 Creating encrypted pre-change backup...");execFileSync(npm,["run","db:backup","--","--remote"],{cwd:root,stdio:"inherit"});}else console.log("2/4 Local installation does not require a remote backup.");
console.log("3/4 Applying all additive migrations...");execFileSync(process.execPath,[wrangler,"d1","migrations","apply",database,remote?"--remote":"--local","--config",config],{cwd:root,stdio:"inherit"});
console.log("4/4 Creating tenant, administrator, modules, courts and initial prices...");execFileSync(process.execPath,[join(root,"scripts","provision-club.mjs"),...args],{cwd:root,stdio:"inherit",env:process.env});
const frontend=(process.env.FRONTEND_URL||"http://localhost:4173").replace(/\/$/,"");const api=(process.env.PLATFORM_API_URL||"http://localhost:8788").replace(/\/$/,"");console.log(`Club is ready: ${frontend}/?platformApi=${encodeURIComponent(api)}`);
