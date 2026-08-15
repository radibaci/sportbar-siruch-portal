export const moduleCatalog = [
  "core", "reservations", "community", "events", "tournaments", "payments", "shop",
  "stringing", "coaches", "operations", "analytics", "ai", "access"
];

const moduleDependencies = {
  core: [],
  reservations: ["core"],
  community: ["core"],
  events: ["core"],
  tournaments: ["events", "reservations"],
  payments: ["reservations"],
  shop: ["core"],
  stringing: ["shop"],
  coaches: ["reservations"],
  operations: ["reservations"],
  analytics: ["reservations"],
  ai: ["community"],
  access: ["reservations"]
};

export function resolveClubModules(requestedModules = []) {
  const allowedModules = new Set(moduleCatalog);
  const normalized = [...new Set(requestedModules.map((item) => String(item).trim()).filter(Boolean))];
  const unknown = normalized.filter((item) => !allowedModules.has(item));
  if (unknown.length) throw new Error(`Unknown module key: ${unknown.join(", ")}.`);

  const enabledModules = new Set(["core"]);
  const enableModule = (moduleKey) => {
    for (const dependency of moduleDependencies[moduleKey]) enableModule(dependency);
    enabledModules.add(moduleKey);
  };
  normalized.forEach(enableModule);
  return moduleCatalog.filter((moduleKey) => enabledModules.has(moduleKey));
}
