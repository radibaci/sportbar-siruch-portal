import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireClubMembership } from "../clubs/access";
import { AppError } from "../lib/errors";
import { readJsonObject } from "../lib/json";
import { requireAuth } from "../middleware/auth";

type CreditRuleRow = {
  id: string;
  label: string;
  threshold_minor: number;
  bonus_minor: number;
  active: number;
  note: string | null;
};

type CreditAccountRow = {
  paid_balance_minor: number;
  bonus_balance_minor: number;
};

function positiveInteger(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new AppError(400, "invalid_field", `${field} must be a positive integer.`);
  return number;
}

function nonNegativeInteger(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new AppError(400, "invalid_field", `${field} must be a non-negative integer.`);
  return number;
}

function ruleJson(rule: CreditRuleRow) {
  return {
    id: rule.id,
    label: rule.label,
    thresholdMinor: rule.threshold_minor,
    bonusMinor: rule.bonus_minor,
    active: Boolean(rule.active),
    note: rule.note,
  };
}

export const creditRoutes = new Hono<AppEnv>();
creditRoutes.use("*", requireAuth);

creditRoutes.get("/:clubId/credit-rules", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId);
  const result = await c.env.DB.prepare(`
    SELECT id, label, threshold_minor, bonus_minor, active, note
    FROM club_credit_rules WHERE club_id = ? AND active = 1 ORDER BY threshold_minor
  `).bind(clubId).all<CreditRuleRow>();
  return c.json({ ok: true, rules: (result.results || []).map(ruleJson) });
});

creditRoutes.post("/:clubId/credit-rules", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const body = await readJsonObject(c);
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";
  const threshold = positiveInteger(body.thresholdMinor, "thresholdMinor");
  const bonus = nonNegativeInteger(body.bonusMinor, "bonusMinor");
  if (!label) throw new AppError(400, "invalid_field", "label is required.");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO club_credit_rules (id, club_id, label, threshold_minor, bonus_minor, active, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).bind(id, clubId, label, threshold, bonus, typeof body.note === "string" ? body.note.slice(0, 500) : null, now, now),
      c.env.DB.prepare(`
        INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
        VALUES (?, ?, ?, 'club.credit_rule.created', 'credit_rule', ?, ?, ?)
      `).bind(crypto.randomUUID(), clubId, auth.userId, id, JSON.stringify({ thresholdMinor: threshold, bonusMinor: bonus }), now),
    ]);
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error instanceof Error ? error.message : String(error))) {
      throw new AppError(409, "credit_rule_conflict", "A bonus rule already exists for this amount.");
    }
    throw error;
  }
  return c.json({ ok: true, rule: { id, label, thresholdMinor: threshold, bonusMinor: bonus, active: true } }, 201);
});

creditRoutes.put("/:clubId/credit-rules/:ruleId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const ruleId = c.req.param("ruleId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const body = await readJsonObject(c);
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";
  const threshold = positiveInteger(body.thresholdMinor, "thresholdMinor");
  const bonus = nonNegativeInteger(body.bonusMinor, "bonusMinor");
  if (!label) throw new AppError(400, "invalid_field", "label is required.");
  const now = new Date().toISOString();
  try {
    const result = await c.env.DB.prepare(`
      UPDATE club_credit_rules SET label = ?, threshold_minor = ?, bonus_minor = ?, note = ?, updated_at = ?
      WHERE id = ? AND club_id = ? AND active = 1
    `).bind(label, threshold, bonus, typeof body.note === "string" ? body.note.slice(0, 500) : null, now, ruleId, clubId).run();
    if (!result.meta.changes) throw new AppError(404, "credit_rule_not_found", "The credit rule does not exist.");
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error instanceof Error ? error.message : String(error))) {
      throw new AppError(409, "credit_rule_conflict", "A bonus rule already exists for this amount.");
    }
    throw error;
  }
  await c.env.DB.prepare(`
    INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, 'club.credit_rule.updated', 'credit_rule', ?, ?, ?)
  `).bind(crypto.randomUUID(), clubId, auth.userId, ruleId, JSON.stringify({ thresholdMinor: threshold, bonusMinor: bonus }), now).run();
  return c.json({ ok: true, rule: { id: ruleId, label, thresholdMinor: threshold, bonusMinor: bonus, active: true } });
});

creditRoutes.delete("/:clubId/credit-rules/:ruleId", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`UPDATE club_credit_rules SET active = 0, updated_at = ? WHERE id = ? AND club_id = ? AND active = 1`)
    .bind(now, c.req.param("ruleId"), clubId).run();
  if (!result.meta.changes) throw new AppError(404, "credit_rule_not_found", "The credit rule does not exist.");
  return c.json({ ok: true });
});

creditRoutes.post("/:clubId/members/:membershipId/credit-topups", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const actor = await requireClubMembership(c.env.DB, auth.userId, clubId, ["admin"]);
  const membershipId = c.req.param("membershipId");
  const target = await c.env.DB.prepare(`
    SELECT memberships.id, COALESCE(memberships.display_name_override, users.display_name) AS display_name
    FROM club_memberships memberships JOIN platform_users users ON users.id = memberships.user_id
    WHERE memberships.id = ? AND memberships.club_id = ? AND memberships.status = 'active'
  `).bind(membershipId, clubId).first<{ id: string; display_name: string }>();
  if (!target) throw new AppError(404, "member_not_found", "The member does not exist in this club.");
  const body = await readJsonObject(c);
  const amount = positiveInteger(body.amountMinor, "amountMinor");
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().slice(0, 100) : "";
  if (idempotencyKey.length < 8) throw new AppError(400, "invalid_field", "idempotencyKey must contain at least 8 characters.");
  const methods = ["cash", "bank", "qr", "card", "other"];
  const method = typeof body.paymentMethod === "string" && methods.includes(body.paymentMethod) ? body.paymentMethod : "other";
  const rule = await c.env.DB.prepare(`
    SELECT id, label, threshold_minor, bonus_minor, active, note
    FROM club_credit_rules
    WHERE club_id = ? AND active = 1 AND threshold_minor <= ?
    ORDER BY threshold_minor DESC LIMIT 1
  `).bind(clubId, amount).first<CreditRuleRow>();
  const bonus = Number(rule?.bonus_minor || 0);
  const now = new Date().toISOString();
  const transactionId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`
      INSERT INTO member_credit_accounts (membership_id, club_id, paid_balance_minor, bonus_balance_minor, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(membership_id) DO UPDATE SET
        paid_balance_minor = paid_balance_minor + excluded.paid_balance_minor,
        bonus_balance_minor = bonus_balance_minor + excluded.bonus_balance_minor,
        updated_at = excluded.updated_at
    `).bind(membershipId, clubId, amount, bonus, now),
    c.env.DB.prepare(`
      INSERT INTO credit_transactions (
        id, club_id, membership_id, transaction_type, paid_delta_minor, bonus_delta_minor,
        paid_balance_after_minor, bonus_balance_after_minor, rule_id, payment_method, note,
        idempotency_key, actor_user_id, created_at
      ) SELECT ?, ?, ?, 'topup', ?, ?, paid_balance_minor, bonus_balance_minor, ?, ?, ?, ?, ?, ?
        FROM member_credit_accounts WHERE membership_id = ? AND club_id = ?
    `).bind(transactionId, clubId, membershipId, amount, bonus, rule?.id || null, method, typeof body.note === "string" ? body.note.slice(0, 500) : null, idempotencyKey, auth.userId, now, membershipId, clubId),
    c.env.DB.prepare(`
      INSERT INTO member_notifications (id, club_id, recipient_membership_id, actor_membership_id, type, title, body, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, 'credit_topup', 'Kredit pripsan', ?, 'credit_transaction', ?, ?)
    `).bind(crypto.randomUUID(), clubId, membershipId, actor.membershipId, `${amount} zaplaceny kredit + ${bonus} bonus`, transactionId, now),
    c.env.DB.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'member.credit.topped_up', 'credit_transaction', ?, ?, ?)
    `).bind(crypto.randomUUID(), clubId, auth.userId, transactionId, JSON.stringify({ membershipId, amountMinor: amount, bonusMinor: bonus, method }), now),
  ];
  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    if (/UNIQUE constraint failed.*idempotency/i.test(error instanceof Error ? error.message : String(error))) {
      throw new AppError(409, "duplicate_topup", "This payment has already been credited.");
    }
    throw error;
  }
  const account = await c.env.DB.prepare(`SELECT paid_balance_minor, bonus_balance_minor FROM member_credit_accounts WHERE membership_id = ? AND club_id = ?`)
    .bind(membershipId, clubId).first<CreditAccountRow>();
  return c.json({
    ok: true,
    transaction: { id: transactionId, player: target.display_name, paidMinor: amount, bonusMinor: bonus, rule: rule ? ruleJson(rule) : null },
    balance: { paidMinor: account?.paid_balance_minor || 0, bonusMinor: account?.bonus_balance_minor || 0, totalMinor: Number(account?.paid_balance_minor || 0) + Number(account?.bonus_balance_minor || 0) },
  }, 201);
});

creditRoutes.get("/:clubId/me/credit", async (c) => {
  const auth = c.get("auth");
  const clubId = c.req.param("clubId");
  const membership = await requireClubMembership(c.env.DB, auth.userId, clubId);
  const account = await c.env.DB.prepare(`SELECT paid_balance_minor, bonus_balance_minor FROM member_credit_accounts WHERE membership_id = ? AND club_id = ?`)
    .bind(membership.membershipId, clubId).first<CreditAccountRow>();
  const history = await c.env.DB.prepare(`
    SELECT id, transaction_type, paid_delta_minor, bonus_delta_minor, paid_balance_after_minor,
      bonus_balance_after_minor, payment_method, note, created_at
    FROM credit_transactions WHERE club_id = ? AND membership_id = ? ORDER BY created_at DESC LIMIT 100
  `).bind(clubId, membership.membershipId).all();
  const paid = Number(account?.paid_balance_minor || 0);
  const bonus = Number(account?.bonus_balance_minor || 0);
  return c.json({ ok: true, balance: { paidMinor: paid, bonusMinor: bonus, totalMinor: paid + bonus }, history: history.results || [] });
});
