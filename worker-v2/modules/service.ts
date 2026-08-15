import type { D1Database } from "@cloudflare/workers-types";
import { AppError } from "../lib/errors";
import { dependentModuleKeys, MODULE_CATALOG, moduleDefinition, type ModuleKey } from "./catalog";

type ModuleRow = {
  module_key: string;
  enabled: number;
  config_json: string;
};

export type ClubModuleState = {
  key: ModuleKey;
  enabled: boolean;
  required: boolean;
  dependencies: readonly string[];
  config: Record<string, unknown>;
};

export async function clubModuleStates(db: D1Database, clubId: string): Promise<ClubModuleState[]> {
  const result = await db.prepare(`
    SELECT module_key, enabled, config_json
    FROM club_modules
    WHERE club_id = ?
  `).bind(clubId).all<ModuleRow>();
  const stored = new Map((result.results || []).map((row) => [row.module_key, row]));

  return MODULE_CATALOG.map((definition) => {
    const row = stored.get(definition.key);
    let config: Record<string, unknown> = {};
    if (row) {
      const parsed: unknown = JSON.parse(row.config_json);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) config = parsed as Record<string, unknown>;
    }
    return {
      key: definition.key,
      enabled: definition.required || row?.enabled === 1,
      required: definition.required,
      dependencies: definition.dependencies,
      config,
    };
  });
}

export async function changeClubModule(
  db: D1Database,
  clubId: string,
  moduleKey: string,
  enabled: boolean,
  config: Record<string, unknown>,
  actorUserId: string,
): Promise<ClubModuleState[]> {
  const definition = moduleDefinition(moduleKey);
  if (!definition) throw new AppError(404, "module_not_found", "The module does not exist.");
  if (definition.required && !enabled) throw new AppError(409, "module_required", "The core module cannot be disabled.");

  const current = await clubModuleStates(db, clubId);
  const enabledKeys = new Set(current.filter((module) => module.enabled).map((module) => module.key));
  if (enabled) {
    const missing = definition.dependencies.filter((dependency) => !enabledKeys.has(dependency));
    if (missing.length) {
      throw new AppError(409, "module_dependency_missing", `Enable required modules first: ${missing.join(", ")}.`);
    }
  } else {
    const activeDependents = dependentModuleKeys(definition.key).filter((key) => enabledKeys.has(key));
    if (activeDependents.length) {
      throw new AppError(409, "module_has_dependents", `Disable dependent modules first: ${activeDependents.join(", ")}.`);
    }
  }

  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  await db.batch([
    db.prepare(`
      INSERT INTO club_modules (club_id, module_key, enabled, config_json, updated_by_user_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(club_id, module_key) DO UPDATE SET
        enabled = excluded.enabled,
        config_json = excluded.config_json,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = excluded.updated_at
    `).bind(clubId, definition.key, enabled ? 1 : 0, JSON.stringify(config), actorUserId, now),
    db.prepare(`
      INSERT INTO audit_events (id, club_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'club.module.changed', 'club_module', ?, ?, ?)
    `).bind(auditId, clubId, actorUserId, definition.key, JSON.stringify({ enabled }), now),
  ]);
  return clubModuleStates(db, clubId);
}
