export const MODULE_CATALOG = [
  { key: "core", required: true, dependencies: [] },
  { key: "reservations", required: false, dependencies: ["core"] },
  { key: "community", required: false, dependencies: ["core"] },
  { key: "events", required: false, dependencies: ["core"] },
  { key: "tournaments", required: false, dependencies: ["events", "reservations"] },
  { key: "payments", required: false, dependencies: ["reservations"] },
  { key: "shop", required: false, dependencies: ["core"] },
  { key: "stringing", required: false, dependencies: ["shop"] },
  { key: "coaches", required: false, dependencies: ["reservations"] },
  { key: "operations", required: false, dependencies: ["reservations"] },
  { key: "analytics", required: false, dependencies: ["reservations"] },
  { key: "ai", required: false, dependencies: ["community"] },
  { key: "access", required: false, dependencies: ["reservations"] },
] as const;

export type ModuleKey = (typeof MODULE_CATALOG)[number]["key"];

export function moduleDefinition(key: string) {
  return MODULE_CATALOG.find((module) => module.key === key);
}

export function dependentModuleKeys(key: ModuleKey): ModuleKey[] {
  return MODULE_CATALOG
    .filter((module) => module.dependencies.some((dependency) => dependency === key))
    .map((module) => module.key);
}
