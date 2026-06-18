import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const dataDir = join(root, "data");
const dbPath = join(dataDir, "portal-db.json");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function ensureDb() {
  mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, JSON.stringify({
      updatedAt: new Date().toISOString(),
      state: null
    }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(readFileSync(dbPath, "utf8"));
}

function writeDb(nextDb) {
  ensureDb();
  const tmpPath = `${dbPath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(nextDb, null, 2));
  renameSync(tmpPath, dbPath);
}

function stateSummary(state) {
  return {
    club: state?.club?.name || "nenastaveno",
    courts: state?.courts?.length || 0,
    players: state?.players?.length || 0,
    reservations: state?.personalReservations?.length || 0,
    notifications: state?.notifications?.length || 0,
    orders: state?.playerOrders?.length || 0
  };
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return true;
  }

  if (url.pathname === "/api/health") {
    const db = readDb();
    sendJson(response, 200, {
      ok: true,
      mode: "local-json-db",
      updatedAt: db.updatedAt || null,
      summary: stateSummary(db.state)
    });
    return true;
  }

  if (url.pathname === "/api/state" && request.method === "GET") {
    const db = readDb();
    sendJson(response, 200, {
      ok: true,
      updatedAt: db.updatedAt || null,
      state: db.state
    });
    return true;
  }

  if (url.pathname === "/api/state" && request.method === "POST") {
    try {
      const payload = JSON.parse(await readBody(request) || "{}");
      if (!payload || typeof payload !== "object" || !payload.state) {
        sendJson(response, 400, { ok: false, error: "Missing state" });
        return true;
      }
      const current = readDb();
      if (payload.baseUpdatedAt && current.updatedAt && payload.baseUpdatedAt !== current.updatedAt) {
        sendJson(response, 409, {
          ok: false,
          error: "State conflict",
          updatedAt: current.updatedAt,
          state: current.state
        });
        return true;
      }
      const db = {
        updatedAt: new Date().toISOString(),
        state: payload.state
      };
      writeDb(db);
      sendJson(response, 200, {
        ok: true,
        updatedAt: db.updatedAt,
        summary: stateSummary(db.state)
      });
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message || "Invalid JSON" });
    }
    return true;
  }

  return false;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);
  if (url.pathname.startsWith("/api/")) {
    if (await handleApi(request, response, url)) return;
    sendJson(response, 404, { ok: false, error: "API endpoint not found" });
    return;
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Tennis club portal running at http://localhost:${port}`);
});
