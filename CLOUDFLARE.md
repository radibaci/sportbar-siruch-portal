# Cloudflare nasazeni

Tento projekt ma dve API varianty:

- lokalni test: `node dev-server.mjs`, data v `data/portal-db.json`
- Cloudflare test: Worker API + D1 databaze

## Prvni nastaveni

1. Prihlasit se do Cloudflare:

```powershell
npx wrangler login
```

2. Pokud prvni deploy rekne, ze chybi `workers.dev` subdomena, otevri odkaz z vystupu
   Wrangleru a v Cloudflare dashboardu jednorazove zvol nazev subdomeny.
   Priklad: `radibaci.workers.dev` nebo `siruch-portal.workers.dev`.

3. Vytvorit D1 databazi:

```powershell
npx wrangler d1 create sportbar_siruch_portal
```

4. Z vystupu zkopirovat `database_id` do `wrangler.toml`.

5. Spustit migraci:

```powershell
npx wrangler d1 migrations apply sportbar_siruch_portal --remote
```

6. Deploy API:

```powershell
npx wrangler deploy
```

## Propojeni frontendu

Po deploy vznikne URL typu:

```text
https://sportbar-siruch-api.<ucet>.workers.dev
```

Frontend na GitHub Pages lze testovat takto:

```text
https://radibaci.github.io/sportbar-siruch-portal/?api=https://sportbar-siruch-api.<ucet>.workers.dev
```

Kdyz API bezi, aplikace nacita a uklada spolecny stav pres `/api/state`.
Kdyz API nebezi, zustane lokalni rezim v prohlizeci.
