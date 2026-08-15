import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  "icon.svg",
  "_headers",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((file) => cp(resolve(root, file), resolve(output, file))));
await cp(resolve(root, "assets"), resolve(output, "assets"), { recursive: true });

console.log(`Cloudflare Pages bundle created in ${output}`);
