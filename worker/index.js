import { buildPushPayload } from "@block65/webcrypto-web-push";

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

function newNotifications(previousState, nextState) {
  const existing = new Set((previousState?.notifications || []).map((item) => item.id));
  return (nextState?.notifications || []).filter((item) => item?.id && !existing.has(item.id));
}

function notificationPayload(notification, state) {
  const unread = (state?.notifications || []).filter((item) =>
    Array.isArray(item.recipients) && item.recipients.some((id) => notification.recipients?.includes(id))
  ).length;
  return JSON.stringify({
    title: notification.title || state?.club?.name || "Sportbar Siruch",
    body: notification.meta || notification.status || "Nova zprava v klubovem portalu.",
    badge: Math.max(1, unread),
    notificationId: notification.id,
    url: "./index.html"
  });
}

async function sendPush(env, subscription, notification, state) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  const payload = await buildPushPayload({
    data: notificationPayload(notification, state),
    options: { ttl: 86400, urgency: "high" }
  }, subscription, {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  });
  const response = await fetch(subscription.endpoint, payload);
  if (response.status === 404 || response.status === 410) {
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
      .bind(subscription.endpoint)
      .run();
  }
}

async function deliverNewNotifications(env, previousState, nextState) {
  const fresh = newNotifications(previousState, nextState);
  await Promise.all(fresh.flatMap((notification) => {
    const recipients = [...new Set(notification.recipients || [])];
    return recipients.map(async (playerId) => {
      const rows = await env.DB.prepare("SELECT subscription FROM push_subscriptions WHERE player_id = ?")
        .bind(playerId)
        .all();
      await Promise.all((rows.results || []).map(async (row) => {
        try {
          await sendPush(env, JSON.parse(row.subscription), notification, nextState);
        } catch (error) {
          console.error("Push delivery failed", playerId, error?.message || error);
        }
      }));
    });
  }));
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

  if (url.pathname === "/api/push/vapid-public-key" && request.method === "GET") {
    return json({ ok: true, publicKey: env.VAPID_PUBLIC_KEY || "" });
  }

  if (url.pathname === "/api/push/subscribe" && request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }
    const playerId = String(payload?.playerId || "").trim();
    const subscription = payload?.subscription;
    if (!playerId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return json({ ok: false, error: "Invalid push subscription" }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO push_subscriptions (endpoint, player_id, subscription, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        player_id = excluded.player_id,
        subscription = excluded.subscription,
        updated_at = excluded.updated_at
    `).bind(subscription.endpoint, playerId, JSON.stringify(subscription), new Date().toISOString()).run();
    return json({ ok: true });
  }

  if (url.pathname === "/api/push/unsubscribe" && request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }
    const endpoint = String(payload?.endpoint || "").trim();
    if (!endpoint) return json({ ok: false, error: "Missing endpoint" }, 400);
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
    return json({ ok: true });
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
    await deliverNewNotifications(env, current.state, payload.state);
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
