const STATE_KEY = "portal-state";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
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

async function getStoredState(env) {
  const row = await env.DB
    .prepare("SELECT value, updated_at FROM app_state WHERE key = ?")
    .bind(STATE_KEY)
    .first();

  if (!row) return { state: null, updatedAt: null };
  return {
    state: JSON.parse(row.value),
    updatedAt: row.updated_at
  };
}

async function saveState(env, state) {
  const updatedAt = new Date().toISOString();
  await env.DB
    .prepare(`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)
    .bind(STATE_KEY, JSON.stringify(state), updatedAt)
    .run();

  return updatedAt;
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (url.pathname === "/api/health") {
    const stored = await getStoredState(env);
    return json({
      ok: true,
      mode: "cloudflare-d1",
      updatedAt: stored.updatedAt,
      summary: stateSummary(stored.state)
    });
  }

  if (url.pathname === "/api/state" && request.method === "GET") {
    const stored = await getStoredState(env);
    return json({
      ok: true,
      updatedAt: stored.updatedAt,
      state: stored.state
    });
  }

  if (url.pathname === "/api/state" && request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    if (!payload || typeof payload !== "object" || !payload.state) {
      return json({ ok: false, error: "Missing state" }, 400);
    }

    const current = await getStoredState(env);
    if (payload.baseUpdatedAt && current.updatedAt && payload.baseUpdatedAt !== current.updatedAt) {
      return json({
        ok: false,
        error: "State conflict",
        updatedAt: current.updatedAt,
        state: current.state
      }, 409);
    }

    const updatedAt = await saveState(env, payload.state);
    return json({
      ok: true,
      updatedAt,
      summary: stateSummary(payload.state)
    });
  }

  return json({ ok: false, error: "API endpoint not found" }, 404);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
