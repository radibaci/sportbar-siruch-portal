import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import { applyD1Migrations, env, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "../../worker-v2/security/password";
import { runScheduledWork } from "../../worker-v2/services/scheduled";

const TEST_PASSWORD = "Test-pass-2026!";
let password: Awaited<ReturnType<typeof hashPassword>>;

async function seedDatabase(): Promise<void> {
  const now = "2026-08-06T10:00:00.000Z";
  const cleanup = [
    "global_notifications",
    "processor_records",
    "privacy_requests",
    "privacy_consents",
    "media_assets",
    "notification_deliveries",
    "notification_preferences",
    "push_subscriptions",
    "reservation_charges",
    "reservation_series_participants",
    "reservation_series",
    "supplier_event_requests",
    "tournament_matches",
    "tournament_group_teams",
    "tournament_group_entries",
    "tournament_groups",
    "tournament_team_members",
    "tournament_teams",
    "tournament_participants",
    "club_tournaments",
    "club_poll_votes",
    "club_poll_options",
    "club_polls",
    "replacement_votes",
    "replacement_candidates",
    "game_counterproposals",
    "stringing_jobs",
    "club_orders",
    "club_friendships",
    "friend_requests",
    "member_notifications",
    "event_registrations",
    "club_events",
    "credit_transactions",
    "member_credit_accounts",
    "club_credit_rules",
    "member_busy_slots",
    "reservation_participants",
    "reservation_slots",
    "reservations",
    "court_block_slots",
    "court_blocks",
    "court_price_rules",
    "member_club_profiles",
    "club_courts",
    "audit_events",
    "privacy_preferences",
    "user_connections",
    "auth_login_attempts",
    "auth_sessions",
    "club_modules",
    "club_memberships",
    "clubs",
    "platform_users",
  ].map((table) => env.DB.prepare(`DELETE FROM ${table}`));
  await env.DB.batch(cleanup);

  const users = [
    ["user-admin", "spravce@siruch.test", "Spravce Siruch"],
    ["user-manager", "provoz@siruch.test", "Spravce klubu"],
    ["user-radim", "radim@siruch.test", "Radim"],
    ["user-viki", "viki@siruch.test", "Viki"],
    ["user-bob", "bob@siruch.test", "Bob"],
    ["user-honza", "honza@siruch.test", "Honza"],
    ["user-stringer", "vypletac@siruch.test", "Vypletac"],
    ["user-seller", "obchod@siruch.test", "Obchod"],
    ["user-rival", "spravce@rival.test", "Spravce Rival"],
  ];
  await env.DB.batch(users.map(([id, email, displayName]) => env.DB.prepare(`
    INSERT INTO platform_users (
      id, email, display_name, password_hash, password_salt, password_iterations,
      status, discoverability, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', 'private', ?, ?)
  `).bind(id, email, displayName, password.hash, password.salt, password.iterations, now, now)));

  await env.DB.batch([ 
    env.DB.prepare(`
      INSERT INTO clubs (id, slug, name, primary_color, accent_color, public_config_json, status, created_at, updated_at)
      VALUES ('club-siruch', 'sportbar-siruch', 'Sportbar Siruch', '#1f6b4f', '#d7a846', '{"openingHours":"08:00-21:00"}', 'active', ?, ?)
    `).bind(now, now),
    env.DB.prepare(`
      INSERT INTO clubs (id, slug, name, primary_color, accent_color, public_config_json, status, created_at, updated_at)
      VALUES ('club-rival', 'rival-tenis', 'Rival Tenis', '#375a8c', '#f2c14e', '{}', 'active', ?, ?)
    `).bind(now, now),
  ]);

  await env.DB.prepare(`
    INSERT INTO club_courts (id, club_id, name, surface, color, open_time, close_time, active, sort_order, created_at, updated_at)
    VALUES ('court-1', 'club-siruch', 'Kurt 1', 'clay', '#c66532', '08:00', '21:00', 1, 1, ?, ?)
  `).bind(now, now).run();
  await env.DB.prepare(`
    INSERT INTO club_courts (id, club_id, name, surface, color, open_time, close_time, active, sort_order, created_at, updated_at)
    VALUES ('court-2', 'club-siruch', 'Kurt 2', 'hard', '#2d79c7', '08:00', '21:00', 1, 2, ?, ?)
  `).bind(now, now).run();

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-admin', 'club-siruch', 'user-admin', 'admin', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-manager', 'club-siruch', 'user-manager', 'manager', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-radim', 'club-siruch', 'user-radim', 'player', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-viki', 'club-siruch', 'user-viki', 'player', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-bob', 'club-siruch', 'user-bob', 'player', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-honza', 'club-siruch', 'user-honza', 'player', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-stringer', 'club-siruch', 'user-stringer', 'stringer', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-seller', 'club-siruch', 'user-seller', 'seller', 'active', ?, ?)`).bind(now, now),
    env.DB.prepare(`INSERT INTO club_memberships (id, club_id, user_id, role, status, joined_at, updated_at) VALUES ('m-rival', 'club-rival', 'user-rival', 'admin', 'active', ?, ?)`).bind(now, now),
  ]);

  await env.DB.batch(["reservations", "community", "events"].map((moduleKey) => env.DB.prepare(`
    INSERT INTO club_modules (club_id, module_key, enabled, config_json, updated_by_user_id, updated_at)
    VALUES ('club-siruch', ?, 1, '{}', 'user-admin', ?)
  `).bind(moduleKey, now)));
}

async function login(email: string, origin = "http://localhost:4213"): Promise<{
  response: Response;
  cookie: string;
}> {
  const response = await SELF.fetch("https://platform.test/api/v2/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  const cookie = response.headers.get("Set-Cookie")?.split(";", 1)[0] || "";
  return { response, cookie };
}

async function api(path: string, cookie: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookie);
  headers.set("Origin", "http://localhost:4213");
  if (init.body) headers.set("Content-Type", "application/json");
  return SELF.fetch(`https://platform.test${path}`, { ...init, headers });
}

beforeAll(async () => {
  const testEnv = env as typeof env & { TEST_MIGRATIONS: D1Migration[] };
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  password = await hashPassword(TEST_PASSWORD, 100_000);
});

beforeEach(async () => {
  await seedDatabase();
});

describe("platform v2 isolation", () => {
  it("keeps production cookies secure and permits local HTTP development", async () => {
    const production = await login("radim@siruch.test");
    expect(production.response.headers.get("Set-Cookie")).toContain("Secure");

    const local = await SELF.fetch("http://localhost:8788/api/v2/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:4213" },
      body: JSON.stringify({ email: "radim@siruch.test", password: TEST_PASSWORD }),
    });
    expect(local.status).toBe(200);
    expect(local.headers.get("Set-Cookie")).not.toContain("Secure");
  });

  it("publishes an exact club entry without exposing a club directory", async () => {
    const publicResponse = await SELF.fetch("https://platform.test/api/v2/clubs/sportbar-siruch/public");
    expect(publicResponse.status).toBe(200);
    const publicBody = await publicResponse.json<{ club: { name: string } }>();
    expect(publicBody.club.name).toBe("Sportbar Siruch");

    const directoryResponse = await SELF.fetch("https://platform.test/api/v2/clubs");
    expect(directoryResponse.status).toBe(404);
  });

  it("returns only clubs belonging to the signed-in player", async () => {
    const { response, cookie } = await login("radim@siruch.test");
    expect(response.status).toBe(200);
    expect(cookie).not.toBe("");

    const clubsResponse = await api("/api/v2/me/clubs", cookie);
    expect(clubsResponse.status).toBe(200);
    const body = await clubsResponse.json<{ clubs: Array<{ clubId: string }> }>();
    expect(body.clubs.map((club) => club.clubId)).toEqual(["club-siruch"]);
  });

  it("exposes only the signed-in club directory to its members", async () => {
    const player = await login("radim@siruch.test");
    const own = await api("/api/v2/clubs/club-siruch/directory", player.cookie);
    expect(own.status).toBe(200);
    const body = await own.json<{ members: Array<{ displayName: string }> }>();
    expect(body.members.map((member) => member.displayName).sort()).toEqual(["Bob", "Honza", "Radim", "Viki"]);

    const rival = await api("/api/v2/clubs/club-rival/directory", player.cookie);
    expect(rival.status).toBe(403);
  });

  it("prevents a club administrator from reading another club", async () => {
    const { cookie } = await login("spravce@siruch.test");
    const ownMembers = await api("/api/v2/clubs/club-siruch/members", cookie);
    expect(ownMembers.status).toBe(200);
    const ownBody = await ownMembers.json<{ members: Array<{ displayName: string }> }>();
    expect(ownBody.members.map((member) => member.displayName).sort()).toEqual(["Bob", "Honza", "Obchod", "Radim", "Spravce Siruch", "Spravce klubu", "Viki", "Vypletac"]);

    const rivalMembers = await api("/api/v2/clubs/club-rival/members", cookie);
    expect(rivalMembers.status).toBe(403);
  });

  it("prevents a player from using administrator endpoints", async () => {
    const { cookie } = await login("radim@siruch.test");
    const response = await api("/api/v2/clubs/club-siruch/members", cookie);
    expect(response.status).toBe(403);
  });

  it("allows only a club admin to change that club's modules and audits the change", async () => {
    const admin = await login("spravce@siruch.test");
    const changed = await api("/api/v2/clubs/club-siruch/modules/shop", admin.cookie, {
      method: "PUT",
      body: JSON.stringify({ enabled: true, config: { pickup: true } }),
    });
    expect(changed.status).toBe(200);

    const moduleRow = await env.DB.prepare(`SELECT enabled FROM club_modules WHERE club_id = 'club-siruch' AND module_key = 'shop'`).first<{ enabled: number }>();
    expect(moduleRow?.enabled).toBe(1);
    const audit = await env.DB.prepare(`SELECT action FROM audit_events WHERE club_id = 'club-siruch'`).first<{ action: string }>();
    expect(audit?.action).toBe("club.module.changed");

    const player = await login("radim@siruch.test");
    const denied = await api("/api/v2/clubs/club-siruch/modules/analytics", player.cookie, {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
    });
    expect(denied.status).toBe(403);
  });

  it("gives a club manager operational overview but reserves module switches for the primary admin", async () => {
    const manager = await login("provoz@siruch.test");
    expect((await api("/api/v2/clubs/club-siruch/analytics", manager.cookie)).status).toBe(200);
    expect((await api("/api/v2/clubs/club-siruch/members", manager.cookie)).status).toBe(200);
    expect((await api("/api/v2/clubs/club-siruch/modules/events", manager.cookie, {
      method: "PUT", body: JSON.stringify({ enabled: false, config: {} }),
    })).status).toBe(403);
  });

  it("rejects browser requests from an unapproved origin", async () => {
    const { response } = await login("radim@siruch.test", "https://malicious.example");
    expect(response.status).toBe(403);
  });

  it("revokes the current session on logout", async () => {
    const { cookie } = await login("radim@siruch.test");
    const beforeLogout = await api("/api/v2/me", cookie);
    expect(beforeLogout.status).toBe(200);

    const logout = await api("/api/v2/auth/logout", cookie, { method: "POST" });
    expect(logout.status).toBe(200);

    const afterLogout = await api("/api/v2/me", cookie);
    expect(afterLogout.status).toBe(401);
  });

  it("changes a password only with the current secret and revokes every session", async () => {
    const first = await login("radim@siruch.test");
    const second = await login("radim@siruch.test");
    const denied = await api("/api/v2/me/password", first.cookie, {
      method: "PUT",
      body: JSON.stringify({ currentPassword: "wrong-password", newPassword: "New-test-pass-2026!" }),
    });
    expect(denied.status).toBe(401);

    const changed = await api("/api/v2/me/password", first.cookie, {
      method: "PUT",
      body: JSON.stringify({ currentPassword: TEST_PASSWORD, newPassword: "New-test-pass-2026!" }),
    });
    expect(changed.status).toBe(200);
    expect((await api("/api/v2/me", first.cookie)).status).toBe(401);
    expect((await api("/api/v2/me", second.cookie)).status).toBe(401);

    const oldLogin = await login("radim@siruch.test");
    expect(oldLogin.response.status).toBe(401);
    const newLogin = await SELF.fetch("https://platform.test/api/v2/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:4213" },
      body: JSON.stringify({ email: "radim@siruch.test", password: "New-test-pass-2026!" }),
    });
    expect(newLogin.status).toBe(200);
    const audit = await env.DB.prepare(`SELECT action FROM audit_events WHERE actor_user_id='user-radim' AND action='user.password.changed'`).first<{ action: string }>();
    expect(audit?.action).toBe("user.password.changed");
  });

  it("temporarily blocks repeated invalid login attempts", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await SELF.fetch("https://platform.test/api/v2/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:4213" },
        body: JSON.stringify({ email: "radim@siruch.test", password: "wrong-password" }),
      });
      expect(response.status).toBe(401);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:4213");
    }

    const blocked = await SELF.fetch("https://platform.test/api/v2/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:4213" },
      body: JSON.stringify({ email: "radim@siruch.test", password: TEST_PASSWORD }),
    });
    expect(blocked.status).toBe(429);
  });

  it("creates a pending booking, notifies the invited player, and confirms it", async () => {
    const radim = await login("radim@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({
        courtId: "court-1",
        date: "2026-08-08",
        start: "10:00",
        end: "11:30",
        gameType: "single",
        participantMembershipIds: ["m-viki"],
        participantMode: "pending",
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json<{ reservation: { id: string; status: string } }>();
    expect(createdBody.reservation.status).toBe("pending");

    const schedule = await api("/api/v2/clubs/club-siruch/schedule?from=2026-08-08&days=7", radim.cookie);
    expect(schedule.status).toBe(200);
    const scheduleBody = await schedule.json<{ courts: Array<{ reservations: Array<{ id: string; date: string; status: string }> }> }>();
    expect(scheduleBody.courts.flatMap((court) => court.reservations)).toContainEqual(
      expect.objectContaining({ id: createdBody.reservation.id, date: "2026-08-08", status: "pending" }),
    );

    const viki = await login("viki@siruch.test");
    const before = await api("/api/v2/clubs/club-siruch/me/reservations", viki.cookie);
    const pendingReservations = (await before.json<{ reservations: Array<{ participantStatus: string }> }>()).reservations;
    expect(pendingReservations).toMatchObject([{ participantStatus: "pending" }]);
    const notifications = await api("/api/v2/clubs/club-siruch/me/notifications", viki.cookie);
    const notices = (await notifications.json<{ notifications: Array<{ entity_id: string; body: string }> }>()).notifications;
    expect(notices).toHaveLength(1);
    expect(notices.at(0)?.body).toContain("2026-08-08 10:00-11:30");

    const accepted = await api(`/api/v2/clubs/club-siruch/reservations/${createdBody.reservation.id}/respond`, viki.cookie, {
      method: "POST",
      body: JSON.stringify({ response: "accept" }),
    });
    expect(accepted.status).toBe(200);
    const after = await api("/api/v2/clubs/club-siruch/me/reservations", viki.cookie);
    const reservations = (await after.json<{ reservations: Array<{
      status: string;
      participantStatus: string;
      participants: Array<{ displayName: string; status: string }>;
    }> }>()).reservations;
    expect(reservations).toMatchObject([{ status: "confirmed", participantStatus: "confirmed" }]);
    expect(reservations[0]!.participants).toEqual([
      expect.objectContaining({ displayName: "Radim", status: "owner" }),
      expect.objectContaining({ displayName: "Viki", status: "confirmed" }),
    ]);
    const afterNotices = await api("/api/v2/clubs/club-siruch/me/notifications", viki.cookie);
    expect((await afterNotices.json<{ notifications: unknown[] }>()).notifications).toHaveLength(0);

    const withdrawn = await api(`/api/v2/clubs/club-siruch/reservations/${createdBody.reservation.id}/withdraw`, viki.cookie, { method: "POST" });
    expect(withdrawn.status).toBe(200);
    expect(await withdrawn.json()).toMatchObject({ status: "searching", canUndo: true });
    const declinedView = await api("/api/v2/clubs/club-siruch/me/reservations", viki.cookie);
    expect((await declinedView.json<{ reservations: Array<{ participantStatus: string; status: string }> }>()).reservations)
      .toMatchObject([{ participantStatus: "declined", status: "searching" }]);
    const ownerNotices = await api("/api/v2/clubs/club-siruch/me/notifications", radim.cookie);
    expect((await ownerNotices.json<{ notifications: Array<{ type: string }> }>()).notifications)
      .toContainEqual(expect.objectContaining({ type: "participant_withdrew" }));

    const restored = await api(`/api/v2/clubs/club-siruch/reservations/${createdBody.reservation.id}/withdraw/undo`, viki.cookie, { method: "POST" });
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ status: "confirmed" });
    const restoredView = await api("/api/v2/clubs/club-siruch/me/reservations", viki.cookie);
    expect((await restoredView.json<{ reservations: Array<{ participantStatus: string; status: string }> }>()).reservations)
      .toMatchObject([{ participantStatus: "confirmed", status: "confirmed" }]);
  });

  it("lets the owner correct teammates without duplicate participants", async () => {
    const radim = await login("radim@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({
        courtId: "court-1", date: "2026-08-16", start: "15:00", end: "16:30", gameType: "single",
        participantMembershipIds: ["m-viki"], participantMode: "pending",
      }),
    });
    const reservationId = (await created.json<{ reservation: { id: string } }>()).reservation.id;
    const bob = await login("bob@siruch.test");
    expect((await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/participants`, bob.cookie, {
      method: "PATCH", body: JSON.stringify({ participantMembershipIds: ["m-bob"], participantMode: "confirmed" }),
    })).status).toBe(403);

    const updated = await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/participants`, radim.cookie, {
      method: "PATCH", body: JSON.stringify({ participantMembershipIds: ["m-bob"], participantMode: "confirmed" }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ status: "confirmed" });
    const participants = await env.DB.prepare(`SELECT membership_id, status FROM reservation_participants WHERE reservation_id = ? ORDER BY membership_id`)
      .bind(reservationId).all<{ membership_id: string; status: string }>();
    expect(participants.results).toEqual([
      { membership_id: "m-bob", status: "confirmed" },
      { membership_id: "m-radim", status: "owner" },
    ]);
    const vikiLocks = await env.DB.prepare(`SELECT COUNT(*) AS count FROM member_busy_slots WHERE reservation_id = ? AND membership_id = 'm-viki'`)
      .bind(reservationId).first<{ count: number }>();
    expect(Number(vikiLocks?.count)).toBe(0);
  });

  it("cancels a new booking only inside the club-configured correction window", async () => {
    const radim = await login("radim@siruch.test");
    const createReservation = async (start: string, end: string) => {
      const response = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
        method: "POST",
        body: JSON.stringify({ courtId: "court-1", date: "2026-08-17", start, end, gameType: "single", participantMembershipIds: ["m-viki"], participantMode: "confirmed" }),
      });
      return (await response.json<{ reservation: { id: string } }>()).reservation.id;
    };
    const firstId = await createReservation("10:00", "11:00");
    const mine = await api("/api/v2/clubs/club-siruch/me/reservations", radim.cookie);
    expect(await mine.json()).toMatchObject({ cancellationMinutes: 30, reservations: [expect.objectContaining({ id: firstId, canCancel: true })] });
    expect((await api(`/api/v2/clubs/club-siruch/reservations/${firstId}`, radim.cookie, { method: "DELETE" })).status).toBe(200);
    expect(Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM reservation_slots WHERE reservation_id = ?`).bind(firstId).first<{ count: number }>())?.count)).toBe(0);

    const secondId = await createReservation("12:00", "13:00");
    await env.DB.prepare(`UPDATE reservations SET created_at = datetime('now', '-31 minutes') WHERE id = ?`).bind(secondId).run();
    const expired = await api(`/api/v2/clubs/club-siruch/reservations/${secondId}`, radim.cookie, { method: "DELETE" });
    expect(expired.status).toBe(409);

    const admin = await login("spravce@siruch.test");
    const settings = await api("/api/v2/clubs/club-siruch", admin.cookie, {
      method: "PUT",
      body: JSON.stringify({ name: "Sportbar Siruch", logoUrl: "", openTime: "08:00", closeTime: "21:00", cancellationMinutes: 60 }),
    });
    expect(settings.status).toBe(200);
    expect(await settings.json()).toMatchObject({ club: { cancellationMinutes: 60 } });
    expect((await api(`/api/v2/clubs/club-siruch/reservations/${secondId}`, radim.cookie, { method: "DELETE" })).status).toBe(200);
  });

  it("invites an eligible replacement and selects the accepted candidate by active-player vote", async () => {
    const radim = await login("radim@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({
        courtId: "court-2", date: "2026-08-24", start: "17:00", end: "18:00", gameType: "single",
        participantMembershipIds: ["m-viki"], participantMode: "confirmed",
      }),
    });
    const reservationId = (await created.json<{ reservation: { id: string } }>()).reservation.id;
    const viki = await login("viki@siruch.test");
    expect((await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/withdraw`, viki.cookie, { method: "POST" })).status).toBe(200);

    const bob = await login("bob@siruch.test");
    const bobNotices = await api("/api/v2/clubs/club-siruch/me/notifications", bob.cookie);
    expect((await bobNotices.json<{ notifications: Array<{ type: string; entity_id: string }> }>()).notifications)
      .toContainEqual(expect.objectContaining({ type: "replacement_invite", entity_id: reservationId }));
    const accepted = await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/replacements/respond`, bob.cookie, {
      method: "POST", body: JSON.stringify({ response: "accept" }),
    });
    expect(accepted.status).toBe(200);

    const vote = await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/replacements/vote`, radim.cookie, {
      method: "POST", body: JSON.stringify({ candidateMembershipId: "m-bob" }),
    });
    expect(vote.status).toBe(200);
    expect(await vote.json()).toMatchObject({ selectedMembershipId: "m-bob" });
    const participant = await env.DB.prepare(`SELECT status FROM reservation_participants WHERE reservation_id = ? AND membership_id = 'm-bob'`)
      .bind(reservationId).first<{ status: string }>();
    expect(participant?.status).toBe("replacement");
    const state = await env.DB.prepare(`SELECT status FROM reservations WHERE id = ?`).bind(reservationId).first<{ status: string }>();
    expect(state?.status).toBe("confirmed");
  });

  it("moves the reservation and every participant lock when the owner accepts a counterproposal", async () => {
    const radim = await login("radim@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST", body: JSON.stringify({
        courtId: "court-1", date: "2026-08-25", start: "10:00", end: "11:00", gameType: "single",
        participantMembershipIds: ["m-viki"], participantMode: "pending", title: "Navrh hry",
      }),
    });
    const reservationId = (await created.json<{ reservation: { id: string } }>()).reservation.id;
    const viki = await login("viki@siruch.test");
    const proposed = await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/counterproposals`, viki.cookie, {
      method: "POST", body: JSON.stringify({ courtId: "court-2", date: "2026-08-25", start: "12:00", end: "13:30" }),
    });
    expect(proposed.status).toBe(201);
    const proposalId = (await proposed.json<{ counterproposal: { id: string } }>()).counterproposal.id;
    const accepted = await api(`/api/v2/clubs/club-siruch/counterproposals/${proposalId}/respond`, radim.cookie, {
      method: "POST", body: JSON.stringify({ response: "accept" }),
    });
    expect(accepted.status).toBe(200);
    const reservation = await env.DB.prepare(`SELECT court_id, reservation_date, start_time, end_time FROM reservations WHERE id = ?`).bind(reservationId).first();
    expect(reservation).toMatchObject({ court_id: "court-2", reservation_date: "2026-08-25", start_time: "12:00", end_time: "13:30" });
    const locks = await env.DB.prepare(`SELECT COUNT(*) AS count FROM member_busy_slots WHERE reservation_id = ?`).bind(reservationId).first<{ count: number }>();
    expect(Number(locks?.count)).toBe(6);
  });

  it("rejects overlapping courts and overlapping player reservations", async () => {
    const radim = await login("radim@siruch.test");
    const first = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-1", date: "2026-08-09", start: "12:00", end: "13:30", gameType: "single" }),
    });
    expect(first.status).toBe(201);

    const viki = await login("viki@siruch.test");
    const overlap = await api("/api/v2/clubs/club-siruch/reservations", viki.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-1", date: "2026-08-09", start: "13:00", end: "14:00", gameType: "single" }),
    });
    expect(overlap.status).toBe(409);

    const playerOverlap = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-2", date: "2026-08-09", start: "12:30", end: "13:00", gameType: "single" }),
    });
    expect(playerOverlap.status).toBe(409);
    const surviving = await env.DB.prepare(`SELECT COUNT(*) AS count FROM reservations WHERE reservation_date = '2026-08-09'`).first<{ count: number }>();
    expect(surviving?.count).toBe(1);
  });

  it("keeps an invitation out of reservations after decline and releases the player time", async () => {
    const radim = await login("radim@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({
        courtId: "court-1", date: "2026-08-10", start: "18:00", end: "19:00", gameType: "single",
        participantMembershipIds: ["m-viki"], participantMode: "pending",
      }),
    });
    const id = (await created.json<{ reservation: { id: string } }>()).reservation.id;
    const viki = await login("viki@siruch.test");
    const declined = await api(`/api/v2/clubs/club-siruch/reservations/${id}/respond`, viki.cookie, {
      method: "POST",
      body: JSON.stringify({ response: "decline" }),
    });
    expect(declined.status).toBe(200);
    const mine = await api("/api/v2/clubs/club-siruch/me/reservations", viki.cookie);
    expect((await mine.json<{ reservations: unknown[] }>()).reservations).toHaveLength(0);
    const busy = await env.DB.prepare(`SELECT COUNT(*) AS count FROM member_busy_slots WHERE membership_id = 'm-viki'`).first<{ count: number }>();
    expect(busy?.count).toBe(0);
    const reservation = await env.DB.prepare(`SELECT status FROM reservations WHERE id = ?`).bind(id).first<{ status: string }>();
    expect(reservation?.status).toBe("searching");
  });

  it("does not expose another club's courts", async () => {
    const rival = await login("spravce@rival.test");
    const denied = await api("/api/v2/clubs/club-siruch/courts?date=2026-08-08", rival.cookie);
    expect(denied.status).toBe(403);
  });

  it("lets an admin create, rename and remove a court but denies a player", async () => {
    const player = await login("radim@siruch.test");
    const denied = await api("/api/v2/clubs/club-siruch/courts", player.cookie, {
      method: "POST",
      body: JSON.stringify({ name: "Kurt 3", surface: "grass", openTime: "08:00", closeTime: "21:00" }),
    });
    expect(denied.status).toBe(403);

    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/courts", admin.cookie, {
      method: "POST",
      body: JSON.stringify({ name: "Kurt 3", surface: "grass", color: "#3d8f51", openTime: "08:00", closeTime: "21:00" }),
    });
    expect(created.status).toBe(201);
    const id = (await created.json<{ court: { id: string } }>()).court.id;
    const renamed = await api(`/api/v2/clubs/club-siruch/courts/${id}`, admin.cookie, {
      method: "PUT",
      body: JSON.stringify({ name: "Centralni kurt", surface: "grass", color: "#3d8f51", openTime: "08:00", closeTime: "21:00" }),
    });
    expect(renamed.status).toBe(200);
    const row = await env.DB.prepare(`SELECT name FROM club_courts WHERE id = ?`).bind(id).first<{ name: string }>();
    expect(row?.name).toBe("Centralni kurt");

    const removed = await api(`/api/v2/clubs/club-siruch/courts/${id}`, admin.cookie, { method: "DELETE" });
    expect(removed.status).toBe(200);
    const inactive = await env.DB.prepare(`SELECT active FROM club_courts WHERE id = ?`).bind(id).first<{ active: number }>();
    expect(inactive?.active).toBe(0);
  });

  it("replaces overlapping court prices without leaving duplicate intervals", async () => {
    const player = await login("radim@siruch.test");
    const denied = await api("/api/v2/clubs/club-siruch/courts/court-1/price-rules", player.cookie, {
      method: "POST",
      body: JSON.stringify({ dayKey: "weekdays", startTime: "08:00", endTime: "15:00", priceMinor: 16_000 }),
    });
    expect(denied.status).toBe(403);

    const admin = await login("spravce@siruch.test");
    for (const rule of [
      { dayKey: "weekdays", startTime: "08:00", endTime: "15:00", priceMinor: 16_000 },
      { dayKey: "weekdays", startTime: "10:00", endTime: "12:00", priceMinor: 20_000 },
    ]) {
      const response = await api("/api/v2/clubs/club-siruch/courts/court-1/price-rules", admin.cookie, {
        method: "POST",
        body: JSON.stringify(rule),
      });
      expect(response.status).toBe(201);
    }

    const rows = await env.DB.prepare(`
      SELECT start_time, end_time, price_minor FROM court_price_rules
      WHERE court_id = 'court-1' AND day_key = 'weekdays' ORDER BY start_time
    `).all<{ start_time: string; end_time: string; price_minor: number }>();
    expect(rows.results).toEqual([
      expect.objectContaining({ start_time: "08:00", end_time: "10:00", price_minor: 16_000 }),
      expect.objectContaining({ start_time: "10:00", end_time: "12:00", price_minor: 20_000 }),
      expect.objectContaining({ start_time: "12:00", end_time: "15:00", price_minor: 16_000 }),
    ]);

    const schedule = await api("/api/v2/clubs/club-siruch/schedule?from=2026-08-06&days=7", player.cookie);
    const body = await schedule.json<{ priceRules: Array<{ courtId: string }> }>();
    expect(body.priceRules.filter((rule) => rule.courtId === "court-1")).toHaveLength(3);
    const middle = await env.DB.prepare(`SELECT id FROM court_price_rules WHERE court_id='court-1' AND day_key='weekdays' AND start_time='10:00'`).first<{id:string}>();
    expect(middle?.id).toBeTruthy();
    expect((await api(`/api/v2/clubs/club-siruch/courts/court-1/price-rules/${middle!.id}`, player.cookie, { method: "DELETE" })).status).toBe(403);
    const manager = await login("provoz@siruch.test");
    expect((await api(`/api/v2/clubs/club-siruch/courts/court-1/price-rules/${middle!.id}`, manager.cookie, { method: "DELETE" })).status).toBe(200);
    expect(Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM court_price_rules WHERE court_id='court-1' AND day_key='weekdays'`).first<{count:number}>())?.count)).toBe(2);
  });

  it("lets only an admin update club identity and opening hours", async () => {
    const player = await login("radim@siruch.test");
    const denied = await api("/api/v2/clubs/club-siruch", player.cookie, {
      method: "PUT",
      body: JSON.stringify({ name: "Wrong", logoUrl: "", openTime: "07:00", closeTime: "22:00" }),
    });
    expect(denied.status).toBe(403);

    const admin = await login("spravce@siruch.test");
    const saved = await api("/api/v2/clubs/club-siruch", admin.cookie, {
      method: "PUT",
      body: JSON.stringify({ name: "Sportpark Siruch", logoUrl: "assets/club-logo-dm-192.png", openTime: "07:00", closeTime: "22:00" }),
    });
    expect(saved.status).toBe(200);
    const courts = await env.DB.prepare(`SELECT DISTINCT open_time, close_time FROM club_courts WHERE club_id = 'club-siruch' AND active = 1`).all();
    expect(courts.results).toEqual([expect.objectContaining({ open_time: "07:00", close_time: "22:00" })]);
  });

  it("creates a real player account and persists the club discount profile", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/members", admin.cookie, {
      method: "POST",
      body: JSON.stringify({
        displayName: "Novy Hrac", email: "novy@siruch.test", password: TEST_PASSWORD,
        role: "player", accountType: "credit", baseDiscountPct: 12,
      }),
    });
    expect(created.status).toBe(201);
    const member = (await created.json<{ member: { membershipId: string } }>()).member;

    const profile = await api(`/api/v2/clubs/club-siruch/members/${member.membershipId}/profile`, admin.cookie, {
      method: "PUT",
      body: JSON.stringify({ accountType: "credit", baseDiscountPct: 18, discountReason: "Brigady", adminNote: "Interni" }),
    });
    expect(profile.status).toBe(200);
    const newLogin = await login("novy@siruch.test");
    expect(newLogin.response.status).toBe(200);
    const clubs = await api("/api/v2/me/clubs", newLogin.cookie);
    expect((await clubs.json<{ clubs: Array<{ clubId: string }> }>()).clubs).toContainEqual(expect.objectContaining({ clubId: "club-siruch" }));
    const stored = await env.DB.prepare(`SELECT base_discount_pct, admin_note FROM member_club_profiles WHERE membership_id = ?`).bind(member.membershipId).first();
    expect(stored).toEqual(expect.objectContaining({ base_discount_pct: 18, admin_note: "Interni" }));
  });

  it("lets the primary admin create a club manager account", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/members", admin.cookie, {
      method: "POST",
      body: JSON.stringify({ displayName: "Provozni spravce", email: "manager2@siruch.test", password: TEST_PASSWORD, role: "manager", accountType: "club", baseDiscountPct: 0 }),
    });
    expect(created.status).toBe(201);
    const managerLogin = await login("manager2@siruch.test");
    expect(managerLogin.response.status).toBe(200);
    const clubs = await api("/api/v2/me/clubs", managerLogin.cookie);
    expect((await clubs.json<{clubs:Array<{role:string}>}>()).clubs[0]?.role).toBe("manager");
    expect((await api("/api/v2/clubs/club-siruch/modules/events", managerLogin.cookie, { method: "PUT", body: JSON.stringify({ enabled: false, config: {} }) })).status).toBe(403);
  });

  it("uses collision-safe court blocks for tournaments and maintenance", async () => {
    const player = await login("radim@siruch.test");
    const denied = await api("/api/v2/clubs/club-siruch/court-blocks", player.cookie, {
      method: "POST",
      body: JSON.stringify({ courtIds: ["court-1"], date: "2026-08-12", start: "10:00", end: "12:00", blockType: "tournament", title: "Turnaj" }),
    });
    expect(denied.status).toBe(403);

    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/court-blocks", admin.cookie, {
      method: "POST",
      body: JSON.stringify({ courtIds: ["court-1"], date: "2026-08-12", start: "10:00", end: "12:00", blockType: "tournament", title: "Turnaj" }),
    });
    expect(created.status).toBe(201);
    const blockId = (await created.json<{ blocks: Array<{ id: string }> }>()).blocks[0]!.id;

    const collision = await api("/api/v2/clubs/club-siruch/reservations", player.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-1", date: "2026-08-12", start: "10:30", end: "11:30", gameType: "single" }),
    });
    expect(collision.status).toBe(409);

    const schedule = await api("/api/v2/clubs/club-siruch/schedule?from=2026-08-12&days=1", player.cookie);
    const scheduleBody = await schedule.json<{ courts: Array<{ reservations: Array<{ kind?: string; title?: string }> }> }>();
    expect(scheduleBody.courts.flatMap((court) => court.reservations)).toContainEqual(expect.objectContaining({ kind: "block", title: "Turnaj" }));

    const removed = await api(`/api/v2/clubs/club-siruch/court-blocks/${blockId}`, admin.cookie, { method: "DELETE" });
    expect(removed.status).toBe(200);
    const availableAgain = await api("/api/v2/clubs/club-siruch/reservations", player.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-1", date: "2026-08-12", start: "10:30", end: "11:30", gameType: "single" }),
    });
    expect(availableAgain.status).toBe(201);
  });

  it("publishes an event, registers a player and reports cancellation to attendees", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/events", admin.cookie, {
      method: "POST",
      body: JSON.stringify({
        eventType: "demo", title: "Test raket", detail: "Wilson a Babolat",
        date: "2026-08-15", start: "10:00", end: "14:00", feeLabel: "Zdarma", imageUrl: "assets/club-shop-hero.png",
      }),
    });
    expect(created.status).toBe(201);
    const eventId = (await created.json<{ event: { id: string } }>()).event.id;

    const radim = await login("radim@siruch.test");
    const notices = await api("/api/v2/clubs/club-siruch/me/notifications", radim.cookie);
    expect((await notices.json<{ notifications: Array<{ type: string; entity_id: string }> }>()).notifications)
      .toContainEqual(expect.objectContaining({ type: "event_announcement", entity_id: eventId }));

    const joined = await api(`/api/v2/clubs/club-siruch/events/${eventId}/register`, radim.cookie, { method: "POST" });
    expect(joined.status).toBe(200);
    const edited = await api(`/api/v2/clubs/club-siruch/events/${eventId}`, admin.cookie, {
      method: "PUT",
      body: JSON.stringify({
        eventType: "demo", title: "Test raket a bot", detail: "Wilson, Babolat a Asics",
        date: "2026-08-15", start: "10:30", end: "14:30", feeLabel: "100 Kc", imageUrl: "assets/club-shop-hero.png",
      }),
    });
    expect(edited.status).toBe(200);
    const adminEvents = await api("/api/v2/clubs/club-siruch/events", admin.cookie);
    const event = (await adminEvents.json<{ events: Array<{ id: string; title: string; start: string; registrations: Array<{ displayName: string }> }> }>()).events.find((item) => item.id === eventId);
    expect(event).toMatchObject({ title: "Test raket a bot", start: "10:30" });
    expect(event?.registrations).toContainEqual(expect.objectContaining({ displayName: "Radim" }));

    const cancelled = await api(`/api/v2/clubs/club-siruch/events/${eventId}/cancel`, admin.cookie, {
      method: "POST",
      body: JSON.stringify({ reason: "Malo ucastniku" }),
    });
    expect(cancelled.status).toBe(200);
    const cancelledNotices = await api("/api/v2/clubs/club-siruch/me/notifications", radim.cookie);
    expect((await cancelledNotices.json<{ notifications: Array<{ type: string; body: string }> }>()).notifications)
      .toContainEqual(expect.objectContaining({ type: "event_cancelled", body: expect.stringContaining("Malo ucastniku") }));
    const playerEvents = await api("/api/v2/clubs/club-siruch/events", radim.cookie);
    expect((await playerEvents.json<{ events: Array<{ id: string }> }>()).events.some((item) => item.id === eventId)).toBe(false);
  });

  it("persists dismissing a member notification", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/events", admin.cookie, {
      method: "POST",
      body: JSON.stringify({ eventType: "club", title: "Letni grilovani", detail: "Po hre", date: "2026-08-16", start: "16:00", end: "20:00" }),
    });
    const eventId = (await created.json<{ event: { id: string } }>()).event.id;
    const radim = await login("radim@siruch.test");
    const notices = await api("/api/v2/clubs/club-siruch/me/notifications", radim.cookie);
    const notice = (await notices.json<{ notifications: Array<{ id: string; entity_id: string }> }>()).notifications.find((item) => item.entity_id === eventId);
    expect(notice).toBeTruthy();
    const dismissed = await api(`/api/v2/clubs/club-siruch/me/notifications/${notice!.id}/dismiss`, radim.cookie, { method: "POST" });
    expect(dismissed.status).toBe(200);
    const refreshed = await api("/api/v2/clubs/club-siruch/me/notifications", radim.cookie);
    expect((await refreshed.json<{ notifications: Array<{ id: string }> }>()).notifications.some((item) => item.id === notice!.id)).toBe(false);
  });

  it("creates one club-scoped friend request and persists acceptance for both players", async () => {
    const radim = await login("radim@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/friend-requests", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ targetMembershipId: "m-viki" }),
    });
    expect(created.status).toBe(201);
    const requestId = (await created.json<{ request: { id: string } }>()).request.id;
    const duplicate = await api("/api/v2/clubs/club-siruch/friend-requests", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ targetMembershipId: "m-viki" }),
    });
    expect(duplicate.status).toBe(409);

    const viki = await login("viki@siruch.test");
    const notices = await api("/api/v2/clubs/club-siruch/me/notifications", viki.cookie);
    expect((await notices.json<{ notifications: Array<{ entity_id: string; actor_membership_id: string }> }>()).notifications)
      .toContainEqual(expect.objectContaining({ entity_id: requestId, actor_membership_id: "m-radim" }));
    const accepted = await api(`/api/v2/clubs/club-siruch/friend-requests/${requestId}/respond`, viki.cookie, {
      method: "POST",
      body: JSON.stringify({ response: "accept" }),
    });
    expect(accepted.status).toBe(200);
    for (const session of [radim, viki]) {
      const relationships = await api("/api/v2/clubs/club-siruch/relationships", session.cookie);
      expect((await relationships.json<{ friendships: Array<{ membershipIds: string[] }> }>()).friendships)
        .toContainEqual(expect.objectContaining({ membershipIds: expect.arrayContaining(["m-radim", "m-viki"]) }));
    }
  });

  it("does not allow friend requests to a membership from another club", async () => {
    const radim = await login("radim@siruch.test");
    const denied = await api("/api/v2/clubs/club-siruch/friend-requests", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ targetMembershipId: "m-rival-admin" }),
    });
    expect(denied.status).toBe(404);
  });

  it("keeps operational accounts out of the player directory", async () => {
    const radim = await login("radim@siruch.test");
    const directory = await api("/api/v2/clubs/club-siruch/directory", radim.cookie);
    const members = (await directory.json<{ members: Array<{ role: string }> }>()).members;
    expect(members.length).toBeGreaterThan(0);
    expect(members.every((member) => member.role === "player")).toBe(true);
  });

  it("shares a weighted club poll, permits one changeable vote and closes it for players", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/polls", admin.cookie, {
      method: "POST", body: JSON.stringify({
        title: "Co chcete testovat?", question: "Vyberte jednu moznost", endsAt: "2026-08-20",
        options: ["Rakety Babolat", "Boty Wilson", "Tricka Nike"],
      }),
    });
    expect(created.status).toBe(201);
    const pollId = (await created.json<{ poll: { id: string } }>()).poll.id;
    const radim = await login("radim@siruch.test");
    const listing = await api("/api/v2/clubs/club-siruch/polls", radim.cookie);
    const poll = (await listing.json<{ polls: Array<{ id: string; options: Array<{ id: string }> }> }>()).polls.find((item) => item.id === pollId);
    expect(poll?.options).toHaveLength(3);
    const first = poll!.options[0]!.id; const second = poll!.options[1]!.id;
    expect((await api(`/api/v2/clubs/club-siruch/polls/${pollId}/vote`, radim.cookie, { method: "POST", body: JSON.stringify({ optionId: first }) })).status).toBe(200);
    expect((await api(`/api/v2/clubs/club-siruch/polls/${pollId}/vote`, radim.cookie, { method: "POST", body: JSON.stringify({ optionId: second }) })).status).toBe(200);
    const votes = await env.DB.prepare(`SELECT option_id, COUNT(*) AS count FROM club_poll_votes WHERE poll_id = ? GROUP BY option_id`).bind(pollId).all<{ option_id: string; count: number }>();
    expect(votes.results).toEqual([{ option_id: second, count: 1 }]);
    const closed = await api(`/api/v2/clubs/club-siruch/polls/${pollId}/close`, admin.cookie, { method: "POST" });
    expect(closed.status).toBe(200);
    expect(await closed.json()).toMatchObject({ winner: { id: second, votes: 1 } });
    const hidden = await api("/api/v2/clubs/club-siruch/polls", radim.cookie);
    expect((await hidden.json<{ polls: unknown[] }>()).polls).toHaveLength(0);
    const denied = await api("/api/v2/clubs/club-siruch/polls", radim.cookie, {
      method: "POST", body: JSON.stringify({ title: "Ne", question: "Ne", endsAt: "2026-08-20", options: ["A", "B"] }),
    });
    expect(denied.status).toBe(403);
  });

  it("shares a single tournament from registration through groups and knockout", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/tournaments", admin.cookie, {
      method: "POST",
      body: JSON.stringify({
        title: "Siruch Open", type: "single", date: "2026-08-29", start: "09:00",
        deadline: "2026-08-28T20:00", maxParticipants: 16, courtIds: ["court-1", "court-2"],
        entryFeeLabel: "250 Kc",
      }),
    });
    expect(created.status).toBe(201);
    const tournamentId = (await created.json<{ tournament: { id: string } }>()).tournament.id;

    for (const email of ["radim@siruch.test", "viki@siruch.test", "bob@siruch.test"]) {
      const player = await login(email);
      expect((await api(`/api/v2/clubs/club-siruch/tournaments/${tournamentId}/register`, player.cookie, { method: "POST" })).status).toBe(200);
    }
    const listing = await api("/api/v2/clubs/club-siruch/tournaments", admin.cookie);
    expect((await listing.json<{ tournaments: Array<{ id: string; participants: unknown[] }> }>()).tournaments)
      .toContainEqual(expect.objectContaining({ id: tournamentId, participants: expect.arrayContaining([expect.objectContaining({ displayName: "Radim" })]) }));

    const drawn = await api(`/api/v2/clubs/club-siruch/tournaments/${tournamentId}/draw`, admin.cookie, { method: "POST" });
    expect(drawn.status).toBe(200);
    expect(await drawn.json()).toMatchObject({ groups: 1, matches: 3 });
    const afterDraw = await api("/api/v2/clubs/club-siruch/tournaments", admin.cookie);
    const tournament = (await afterDraw.json<{ tournaments: Array<{ id: string; matches: Array<{ id: string; playerAMembershipId: string }> }> }>()).tournaments.find((item) => item.id === tournamentId)!;
    for (const match of tournament.matches) {
      expect((await api(`/api/v2/clubs/club-siruch/tournaments/${tournamentId}/matches/${match.id}`, admin.cookie, {
        method: "PUT", body: JSON.stringify({ score: "6:3", winnerMembershipId: match.playerAMembershipId }),
      })).status).toBe(200);
    }
    const knockout = await api(`/api/v2/clubs/club-siruch/tournaments/${tournamentId}/knockout`, admin.cookie, { method: "POST" });
    expect(knockout.status).toBe(200);
    expect(await knockout.json()).toMatchObject({ matches: 1 });
    const player = await login("radim@siruch.test");
    expect((await api("/api/v2/clubs/club-siruch/tournaments", player.cookie, {
      method: "POST", body: JSON.stringify({ title: "Ne" }),
    })).status).toBe(403);
  });

  it("moves a poll result through supplier confirmation before publishing the event", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/polls", admin.cookie, {
      method: "POST", body: JSON.stringify({ title: "Demo den", question: "Co privezt?", endsAt: "2026-08-20", options: ["Rakety Wilson", "Boty Nike"] }),
    });
    const pollId = (await created.json<{ poll: { id: string } }>()).poll.id;
    const radim = await login("radim@siruch.test");
    const polls = await api("/api/v2/clubs/club-siruch/polls", radim.cookie);
    const optionId = (await polls.json<{ polls: Array<{ id: string; options: Array<{ id: string }> }> }>()).polls.find((poll) => poll.id === pollId)!.options[0]!.id;
    await api(`/api/v2/clubs/club-siruch/polls/${pollId}/vote`, radim.cookie, { method: "POST", body: JSON.stringify({ optionId }) });
    await api(`/api/v2/clubs/club-siruch/polls/${pollId}/close`, admin.cookie, { method: "POST" });
    const requested = await api(`/api/v2/clubs/club-siruch/polls/${pollId}/supplier-request`, admin.cookie, {
      method: "POST", body: JSON.stringify({ date: "2026-08-30", start: "10:00", end: "14:00" }),
    });
    expect(requested.status).toBe(201);
    const requestId = (await requested.json<{ request: { id: string } }>()).request.id;
    expect((await api("/api/v2/clubs/club-siruch/events", radim.cookie).then((response) => response.json<{ events: unknown[] }>())).events).toHaveLength(0);

    const seller = await login("obchod@siruch.test");
    const sellerQueue = await api("/api/v2/clubs/club-siruch/supplier-requests", seller.cookie);
    expect((await sellerQueue.json<{ requests: Array<{ id: string; status: string }> }>()).requests).toContainEqual(expect.objectContaining({ id: requestId, status: "pending" }));
    expect((await api(`/api/v2/clubs/club-siruch/supplier-requests/${requestId}/respond`, seller.cookie, {
      method: "PUT", body: JSON.stringify({ response: "confirm", items: "8 demo raket Wilson", note: "Dodame den predem." }),
    })).status).toBe(200);
    expect((await api(`/api/v2/clubs/club-siruch/supplier-requests/${requestId}/publish`, admin.cookie, { method: "POST" })).status).toBe(200);
    const publicEvents = await api("/api/v2/clubs/club-siruch/events", radim.cookie);
    expect((await publicEvents.json<{ events: Array<{ title: string; status: string }> }>()).events).toContainEqual(expect.objectContaining({ title: expect.stringContaining("Wilson"), status: "published" }));
  });

  it("creates a collision-safe weekly series and keeps one withdrawal local to its occurrence", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservation-series", admin.cookie, {
      method: "POST",
      body: JSON.stringify({
        courtId: "court-2", ownerMembershipId: "m-radim", participantMembershipIds: ["m-viki"],
        startDate: "2026-09-04", endDate: "2026-09-25", start: "17:00", end: "18:30",
        gameType: "single", title: "Patecni single liga",
      }),
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ series: { occurrences: 4 } });
    const list = await api("/api/v2/clubs/club-siruch/reservation-series", admin.cookie);
    const series = (await list.json<{ series: Array<{ id: string; occurrenceCount: number }> }>()).series[0]!;
    expect(series.occurrenceCount).toBe(4);

    const conflict = await api("/api/v2/clubs/club-siruch/reservation-series", admin.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-2", ownerMembershipId: "m-bob", participantMembershipIds: [], startDate: "2026-09-04", endDate: "2026-09-25", start: "17:30", end: "18:30", gameType: "single" }),
    });
    expect(conflict.status).toBe(409);
    expect(Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM reservation_series`).first<{ count: number }>())?.count)).toBe(1);

    const viki = await login("viki@siruch.test");
    const mine = await api("/api/v2/clubs/club-siruch/me/reservations", viki.cookie);
    const occurrences = (await mine.json<{ reservations: Array<{ id: string; date: string; seriesId: string; participantStatus: string }> }>()).reservations.filter((item) => item.seriesId === series.id);
    expect(occurrences).toHaveLength(4);
    expect((await api(`/api/v2/clubs/club-siruch/reservations/${occurrences[0]!.id}/withdraw`, viki.cookie, { method: "POST" })).status).toBe(200);
    const states = await env.DB.prepare(`SELECT reservation_id,status FROM reservation_participants WHERE membership_id='m-viki' AND reservation_id IN (SELECT id FROM reservations WHERE series_id=?) ORDER BY reservation_id`).bind(series.id).all<{status:string}>();
    expect((states.results || []).filter((item) => item.status === "declined")).toHaveLength(1);
    expect((states.results || []).filter((item) => item.status === "confirmed")).toHaveLength(3);

    const cancelled = await api(`/api/v2/clubs/club-siruch/reservation-series/${series.id}?from=2026-09-18`, admin.cookie, { method: "DELETE" });
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toMatchObject({ cancelledOccurrences: 2 });
  });

  it("lets an administrator create a one-time reservation for players without becoming its owner", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservations", admin.cookie, {
      method: "POST",
      body: JSON.stringify({
        courtId: "court-1", ownerMembershipId: "m-radim", participantMembershipIds: ["m-viki"],
        participantMode: "confirmed", date: "2026-10-01", start: "18:00", end: "19:30", gameType: "single",
      }),
    });
    expect(created.status).toBe(201);
    const reservationId = (await created.json<{ reservation: { id: string } }>()).reservation.id;
    const reservation = await env.DB.prepare(`SELECT owner_membership_id,status FROM reservations WHERE id=?`).bind(reservationId).first<{ owner_membership_id:string; status:string }>();
    expect(reservation).toEqual({ owner_membership_id: "m-radim", status: "confirmed" });
    const adminParticipation = await env.DB.prepare(`SELECT 1 FROM reservation_participants WHERE reservation_id=? AND membership_id='m-admin'`).bind(reservationId).first();
    expect(adminParticipation).toBeNull();
  });

  it("keeps a double pending until all four active players are confirmed", async () => {
    const radim = await login("radim@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({
        courtId: "court-2", date: "2026-08-20", start: "17:00", end: "19:00", gameType: "double",
        participantMembershipIds: ["m-viki", "m-bob"], participantMode: "pending",
      }),
    });
    expect(created.status).toBe(201);
    const reservationId = (await created.json<{ reservation: { id: string } }>()).reservation.id;
    for (const email of ["viki@siruch.test", "bob@siruch.test"]) {
      const player = await login(email);
      const accepted = await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/respond`, player.cookie, {
        method: "POST", body: JSON.stringify({ response: "accept" }),
      });
      expect(accepted.status).toBe(200);
    }
    const row = await env.DB.prepare(`SELECT status FROM reservations WHERE id = ?`).bind(reservationId).first<{ status: string }>();
    expect(row?.status).toBe("pending");
    const participantCount = await env.DB.prepare(`
      SELECT COUNT(*) AS count FROM reservation_participants
      WHERE reservation_id = ? AND status IN ('owner','confirmed','replacement')
    `).bind(reservationId).first<{ count: number }>();
    expect(Number(participantCount?.count)).toBe(3);
  });

  it("persists an order for a player reservation and exposes staff fulfilment state", async () => {
    const radim = await login("radim@siruch.test");
    const reservation = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-2", date: "2026-08-21", start: "16:00", end: "17:00", gameType: "single" }),
    });
    const reservationId = (await reservation.json<{ reservation: { id: string } }>()).reservation.id;
    const created = await api("/api/v2/clubs/club-siruch/orders", radim.cookie, {
      method: "POST",
      body: JSON.stringify({
        productName: "Tenisove mice", productType: "product", amountMinor: 16900,
        deliveryMode: "reservation", reservationId, note: "Nachystat na recepci",
      }),
    });
    expect(created.status).toBe(201);
    const orderId = (await created.json<{ order: { id: string } }>()).order.id;

    const admin = await login("spravce@siruch.test");
    const queue = await api("/api/v2/clubs/club-siruch/orders", admin.cookie);
    expect((await queue.json<{ orders: Array<{ id: string; displayName: string; reservationId: string }> }>()).orders)
      .toContainEqual(expect.objectContaining({ id: orderId, displayName: "Radim", reservationId }));
    const updated = await api(`/api/v2/clubs/club-siruch/orders/${orderId}`, admin.cookie, {
      method: "PUT", body: JSON.stringify({ source: "stock", status: "ready" }),
    });
    expect(updated.status).toBe(200);
    const mine = await api("/api/v2/clubs/club-siruch/me/orders", radim.cookie);
    expect((await mine.json<{ orders: Array<{ id: string; source: string; status: string }> }>()).orders)
      .toContainEqual(expect.objectContaining({ id: orderId, source: "stock", status: "ready" }));
    const notices = await api("/api/v2/clubs/club-siruch/me/notifications", radim.cookie);
    expect((await notices.json<{ notifications: Array<{ type: string; entity_id: string }> }>()).notifications)
      .toContainEqual(expect.objectContaining({ type: "order_ready", entity_id: orderId }));
  });

  it("rejects an order linked to another player's reservation", async () => {
    const viki = await login("viki@siruch.test");
    const reservation = await api("/api/v2/clubs/club-siruch/reservations", viki.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-2", date: "2026-08-22", start: "10:00", end: "11:00", gameType: "single" }),
    });
    const reservationId = (await reservation.json<{ reservation: { id: string } }>()).reservation.id;
    const radim = await login("radim@siruch.test");
    const denied = await api("/api/v2/clubs/club-siruch/orders", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ productName: "Mice", amountMinor: 16900, deliveryMode: "reservation", reservationId }),
    });
    expect(denied.status).toBe(400);
  });

  it("moves a racket through club, stringer and club hand-off in the required order", async () => {
    const radim = await login("radim@siruch.test");
    const reservation = await api("/api/v2/clubs/club-siruch/reservations", radim.cookie, {
      method: "POST",
      body: JSON.stringify({ courtId: "court-2", date: "2026-08-23", start: "16:00", end: "17:00", gameType: "single" }),
    });
    const reservationId = (await reservation.json<{ reservation: { id: string } }>()).reservation.id;
    const order = await api("/api/v2/clubs/club-siruch/orders", radim.cookie, {
      method: "POST",
      body: JSON.stringify({
        productName: "Vyplet rakety", productType: "service", amountMinor: 45000,
        deliveryMode: "reservation", reservationId, note: "24/23 kg",
      }),
    });
    expect(order.status).toBe(201);

    const playerJobs = await api("/api/v2/clubs/club-siruch/me/stringing-jobs", radim.cookie);
    const job = (await playerJobs.json<{ jobs: Array<{ id: string; status: string; assignedStringerMembershipId: string }> }>()).jobs[0];
    expect(job).toBeDefined();
    if (!job) throw new Error("Stringing job was not created");
    expect(job).toMatchObject({ status: "waiting_dropoff", assignedStringerMembershipId: "m-stringer" });

    const denied = await api(`/api/v2/clubs/club-siruch/stringing-jobs/${job.id}/transition`, radim.cookie, {
      method: "POST", body: JSON.stringify({ status: "with_stringer" }),
    });
    expect(denied.status).toBe(409);

    const admin = await login("spravce@siruch.test");
    const received = await api(`/api/v2/clubs/club-siruch/stringing-jobs/${job.id}/transition`, admin.cookie, {
      method: "POST", body: JSON.stringify({ status: "at_club" }),
    });
    expect(received.status).toBe(200);

    const stringer = await login("vypletac@siruch.test");
    const stringerQueue = await api("/api/v2/clubs/club-siruch/stringing-jobs", stringer.cookie);
    expect((await stringerQueue.json<{ jobs: Array<{ id: string }> }>()).jobs).toContainEqual(expect.objectContaining({ id: job.id }));
    for (const status of ["with_stringer", "returned_to_club"]) {
      const moved = await api(`/api/v2/clubs/club-siruch/stringing-jobs/${job.id}/transition`, stringer.cookie, {
        method: "POST", body: JSON.stringify({ status }),
      });
      expect(moved.status).toBe(200);
    }

    const ready = await api(`/api/v2/clubs/club-siruch/stringing-jobs/${job.id}/transition`, admin.cookie, {
      method: "POST", body: JSON.stringify({ status: "ready_for_pickup" }),
    });
    expect(ready.status).toBe(200);
    const notices = await api("/api/v2/clubs/club-siruch/me/notifications", radim.cookie);
    expect((await notices.json<{ notifications: Array<{ type: string; body: string }> }>()).notifications)
      .toContainEqual(expect.objectContaining({ type: "stringing_ready", body: expect.stringContaining("2026-08-23 v 16:00") }));

    const delivered = await api(`/api/v2/clubs/club-siruch/stringing-jobs/${job.id}/transition`, admin.cookie, {
      method: "POST", body: JSON.stringify({ status: "delivered" }),
    });
    expect(delivered.status).toBe(200);
    const completed = await env.DB.prepare(`SELECT status FROM club_orders WHERE id = (SELECT order_id FROM stringing_jobs WHERE id = ?)`)
      .bind(job.id).first<{ status: string }>();
    expect(completed?.status).toBe("completed");
  });

  it("does not expose a club's stringing queue to another club", async () => {
    const rival = await login("spravce@rival.test");
    const denied = await api("/api/v2/clubs/club-siruch/stringing-jobs", rival.cookie);
    expect(denied.status).toBe(403);
  });

  it("credits money and the best matching club bonus exactly once", async () => {
    const admin = await login("spravce@siruch.test");
    for (const rule of [
      { label: "Dobiti 3 000 Kc", thresholdMinor: 300_000, bonusMinor: 10_000 },
      { label: "Dobiti 5 000 Kc", thresholdMinor: 500_000, bonusMinor: 22_000 },
    ]) {
      const created = await api("/api/v2/clubs/club-siruch/credit-rules", admin.cookie, {
        method: "POST",
        body: JSON.stringify(rule),
      });
      expect(created.status).toBe(201);
    }

    const topupBody = {
      amountMinor: 500_000,
      paymentMethod: "cash",
      note: "Hotovost na recepci",
      idempotencyKey: "receipt-2026-0001",
    };
    const toppedUp = await api("/api/v2/clubs/club-siruch/members/m-radim/credit-topups", admin.cookie, {
      method: "POST",
      body: JSON.stringify(topupBody),
    });
    expect(toppedUp.status).toBe(201);
    const result = await toppedUp.json<{ transaction: { bonusMinor: number }; balance: { paidMinor: number; bonusMinor: number; totalMinor: number } }>();
    expect(result.transaction.bonusMinor).toBe(22_000);
    expect(result.balance).toEqual({ paidMinor: 500_000, bonusMinor: 22_000, totalMinor: 522_000 });

    const duplicate = await api("/api/v2/clubs/club-siruch/members/m-radim/credit-topups", admin.cookie, {
      method: "POST",
      body: JSON.stringify(topupBody),
    });
    expect(duplicate.status).toBe(409);
    const account = await env.DB.prepare(`SELECT paid_balance_minor, bonus_balance_minor FROM member_credit_accounts WHERE membership_id = 'm-radim'`)
      .first<{ paid_balance_minor: number; bonus_balance_minor: number }>();
    expect(account).toMatchObject({ paid_balance_minor: 500_000, bonus_balance_minor: 22_000 });

    const radim = await login("radim@siruch.test");
    const wallet = await api("/api/v2/clubs/club-siruch/me/credit", radim.cookie);
    expect(wallet.status).toBe(200);
    const walletBody = await wallet.json<{ balance: { totalMinor: number }; history: unknown[] }>();
    expect(walletBody.balance.totalMinor).toBe(522_000);
    expect(walletBody.history).toHaveLength(1);
  });

  it("prevents players and other clubs from manually crediting a member", async () => {
    const player = await login("radim@siruch.test");
    const deniedPlayer = await api("/api/v2/clubs/club-siruch/members/m-viki/credit-topups", player.cookie, {
      method: "POST",
      body: JSON.stringify({ amountMinor: 100_000, idempotencyKey: "player-attempt-01" }),
    });
    expect(deniedPlayer.status).toBe(403);

    const rival = await login("spravce@rival.test");
    const deniedRival = await api("/api/v2/clubs/club-siruch/members/m-radim/credit-topups", rival.cookie, {
      method: "POST",
      body: JSON.stringify({ amountMinor: 100_000, idempotencyKey: "rival-attempt-01" }),
    });
    expect(deniedRival.status).toBe(403);
  });

  it("lets only an admin edit and disable a credit bonus rule", async () => {
    const admin = await login("spravce@siruch.test");
    const created = await api("/api/v2/clubs/club-siruch/credit-rules", admin.cookie, {
      method: "POST",
      body: JSON.stringify({ label: "Start bonus", thresholdMinor: 200_000, bonusMinor: 5_000 }),
    });
    const id = (await created.json<{ rule: { id: string } }>()).rule.id;
    const updated = await api(`/api/v2/clubs/club-siruch/credit-rules/${id}`, admin.cookie, {
      method: "PUT",
      body: JSON.stringify({ label: "Start bonus plus", thresholdMinor: 200_000, bonusMinor: 7_500 }),
    });
    expect(updated.status).toBe(200);
    const removed = await api(`/api/v2/clubs/club-siruch/credit-rules/${id}`, admin.cookie, { method: "DELETE" });
    expect(removed.status).toBe(200);
    const rules = await api("/api/v2/clubs/club-siruch/credit-rules", admin.cookie);
    expect((await rules.json<{ rules: unknown[] }>()).rules).toHaveLength(0);
  });

  it("runs a doubles tournament with pair registration, groups and a pair-aware knockout", async () => {
    const admin=await login("spravce@siruch.test");
    const created=await api("/api/v2/clubs/club-siruch/tournaments",admin.cookie,{method:"POST",body:JSON.stringify({title:"Double cup",type:"double",date:"2026-09-20",start:"09:00",deadline:"2026-09-18T20:00",maxParticipants:8,courtIds:["court-1","court-2"],entryFeeLabel:"400 Kc"})});
    expect(created.status).toBe(201); const id=(await created.json<{tournament:{id:string}}>()).tournament.id;
    const radim=await login("radim@siruch.test"); const bob=await login("bob@siruch.test");
    expect((await api(`/api/v2/clubs/club-siruch/tournaments/${id}/register`,radim.cookie,{method:"POST",body:JSON.stringify({partnerMembershipId:"m-viki"})})).status).toBe(200);
    expect((await api(`/api/v2/clubs/club-siruch/tournaments/${id}/register`,bob.cookie,{method:"POST",body:JSON.stringify({partnerMembershipId:"m-honza"})})).status).toBe(200);
    expect((await api(`/api/v2/clubs/club-siruch/tournaments/${id}/draw`,admin.cookie,{method:"POST"})).status).toBe(200);
    const listed=await api("/api/v2/clubs/club-siruch/tournaments",admin.cookie); const tournament=(await listed.json<{tournaments:Array<any>}>()).tournaments.find((item)=>item.id===id);
    expect(tournament.teams).toHaveLength(2); expect(tournament.matches).toHaveLength(1); expect(tournament.entryFeeLabel).toBe("400 Kc");
    const match=tournament.matches[0]; expect((await api(`/api/v2/clubs/club-siruch/tournaments/${id}/matches/${match.id}`,admin.cookie,{method:"PUT",body:JSON.stringify({score:"6:3",winnerTeamId:match.teamAId})})).status).toBe(200);
    expect((await api(`/api/v2/clubs/club-siruch/tournaments/${id}/knockout`,admin.cookie,{method:"POST"})).status).toBe(200);
  });

  it("settles a discounted court from bonus then paid credit and refunds both balances", async () => {
    const admin=await login("spravce@siruch.test");
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO court_price_rules (id,club_id,court_id,day_key,start_time,end_time,price_minor,created_at,updated_at) VALUES ('price-test','club-siruch','court-1','all','08:00','21:00',20000,?,?)`).bind("2026-08-06T10:00:00.000Z","2026-08-06T10:00:00.000Z"),
      env.DB.prepare(`INSERT INTO member_club_profiles (membership_id,club_id,account_type,base_discount_pct,loyalty_discount_pct,updated_at) VALUES ('m-radim','club-siruch','club',10,5,?)`).bind("2026-08-06T10:00:00.000Z"),
      env.DB.prepare(`INSERT INTO member_credit_accounts (membership_id,club_id,paid_balance_minor,bonus_balance_minor,updated_at) VALUES ('m-radim','club-siruch',30000,5000,?)`).bind("2026-08-06T10:00:00.000Z"),
    ]);
    const radim=await login("radim@siruch.test"); const reservation=await api("/api/v2/clubs/club-siruch/reservations",radim.cookie,{method:"POST",body:JSON.stringify({courtId:"court-1",date:"2026-08-24",start:"10:00",end:"11:30",gameType:"single"})}); const reservationId=(await reservation.json<{reservation:{id:string}}>()).reservation.id;
    const settled=await api(`/api/v2/clubs/club-siruch/reservations/${reservationId}/settle`,radim.cookie,{method:"POST",body:JSON.stringify({paymentMethod:"credit"})}); expect(settled.status).toBe(201); const charge=(await settled.json<{charge:any}>()).charge; expect(charge).toMatchObject({grossMinor:30000,discountPct:15,finalMinor:25500,bonusCreditMinor:5000,paidCreditMinor:20500});
    const accountingExport=await api("/api/v2/clubs/club-siruch/charges/export.csv",admin.cookie); expect(accountingExport.status).toBe(200); expect(accountingExport.headers.get("content-type")).toContain("text/csv"); expect(await accountingExport.text()).toContain('"Radim"');
    expect((await api("/api/v2/clubs/club-siruch/charges/export.csv",radim.cookie)).status).toBe(403);
    expect((await api(`/api/v2/clubs/club-siruch/charges/${charge.id}/refund`,admin.cookie,{method:"POST"})).status).toBe(200); const balance=await env.DB.prepare(`SELECT paid_balance_minor,bonus_balance_minor FROM member_credit_accounts WHERE membership_id='m-radim'`).first<any>(); expect(balance).toMatchObject({paid_balance_minor:30000,bonus_balance_minor:5000});
  });

  it("returns tenant-derived business analytics only to club staff", async () => {
    const admin=await login("spravce@siruch.test"); const result=await api("/api/v2/clubs/club-siruch/analytics?from=2026-08-01&to=2026-08-31",admin.cookie); expect(result.status).toBe(200); const body=await result.json<{courts:Array<{id:string;available_slots:number}>}>(); expect(body.courts.map((court)=>court.id)).toEqual(["court-1","court-2"]); expect(body.courts[0]?.available_slots).toBe(806);
    const player=await login("radim@siruch.test"); expect((await api("/api/v2/clubs/club-siruch/analytics",player.cookie)).status).toBe(403);
  });

  it("stores versioned privacy consent, exports only the signed-in user's data and queues erasure", async () => {
    const radim=await login("radim@siruch.test"); expect((await api("/api/v2/me/privacy",radim.cookie,{method:"PUT",body:JSON.stringify({purpose:"push",granted:true,policyVersion:"2026-08-01"})})).status).toBe(200); const exported=await api("/api/v2/me/export",radim.cookie); expect(exported.status).toBe(200); const data=await exported.json<{user:{email:string};memberships:Array<{user_id:string}>}>(); expect(data.user.email).toBe("radim@siruch.test"); expect(data.memberships.every((membership)=>membership.user_id==="user-radim")).toBe(true); expect((await api("/api/v2/me/privacy-requests",radim.cookie,{method:"POST",body:JSON.stringify({type:"erase"})})).status).toBe(201);
  });

  it("allows cross-club connections only through an exact opted-in handle", async () => {
    const radim=await login("radim@siruch.test"); const rival=await login("spravce@rival.test"); await api("/api/v2/me/discoverability",rival.cookie,{method:"PUT",body:JSON.stringify({discoverability:"exact-handle",publicHandle:"rival-admin"})}); expect((await api("/api/v2/connections",radim.cookie,{method:"POST",body:JSON.stringify({publicHandle:"rival-admin"})})).status).toBe(201); const incoming=await api("/api/v2/me/connections",rival.cookie); const connection=(await incoming.json<{connections:Array<{userId:string;status:string}>}>()).connections[0]; expect(connection).toMatchObject({userId:"user-radim",status:"pending"}); if(!connection) throw new Error("Connection request missing"); expect((await api(`/api/v2/connections/${connection.userId}/respond`,rival.cookie,{method:"POST",body:JSON.stringify({response:"accept"})})).status).toBe(200);
  });

  it("persists Web Push subscriptions and user-level notification preferences", async () => {
    const radim=await login("radim@siruch.test"); expect((await api("/api/v2/me/notification-preferences",radim.cookie,{method:"PUT",body:JSON.stringify({pushEnabled:true,attendanceReminderEnabled:false,productReminderEnabled:true})})).status).toBe(200); expect((await api("/api/v2/push/subscriptions",radim.cookie,{method:"POST",body:JSON.stringify({endpoint:"https://push.test/subscription-1",keys:{p256dh:"test-p256dh",auth:"test-auth"}})})).status).toBe(201); const stored=await env.DB.prepare(`SELECT user_id,enabled FROM push_subscriptions WHERE endpoint='https://push.test/subscription-1'`).first<any>(); expect(stored).toMatchObject({user_id:"user-radim",enabled:1});
  });

  it("stores private club media in R2 and authorizes club members only", async () => {
    const radim=await login("radim@siruch.test"); const uploaded=await SELF.fetch("https://platform.test/api/v2/media?clubId=club-siruch&entityType=profile&entityId=m-radim",{method:"POST",headers:{Cookie:radim.cookie,Origin:"http://localhost:4213","Content-Type":"image/webp"},body:new Uint8Array([82,73,70,70,1,2,3,4])}); expect(uploaded.status).toBe(201); const asset=(await uploaded.json<{asset:{id:string}}>()).asset; expect((await api(`/api/v2/media/${asset.id}`,radim.cookie)).status).toBe(200); const rival=await login("spravce@rival.test"); expect((await api(`/api/v2/media/${asset.id}`,rival.cookie)).status).toBe(403);
  });

  it("creates a deduplicated day-before attendance reminder in scheduled work", async () => {
    const radim=await login("radim@siruch.test"); const reservation=await api("/api/v2/clubs/club-siruch/reservations",radim.cookie,{method:"POST",body:JSON.stringify({courtId:"court-1",date:"2026-08-08",start:"10:00",end:"11:00",gameType:"single"})}); expect(reservation.status).toBe(201); await runScheduledWork(env as unknown as Parameters<typeof runScheduledWork>[0],Date.parse("2026-08-07T08:00:00Z")); await runScheduledWork(env as unknown as Parameters<typeof runScheduledWork>[0],Date.parse("2026-08-07T09:00:00Z")); const count=await env.DB.prepare(`SELECT COUNT(*) AS count FROM member_notifications WHERE recipient_membership_id='m-radim' AND type='attendance_reminder'`).first<{count:number}>(); expect(Number(count?.count)).toBe(1);
  });
});
