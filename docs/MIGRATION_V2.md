# Migration to v2

## Milestone 1: secure platform core

- Keep the existing production release online until the compatible v2 API passes the release gate.
- Develop and test `worker-v2` locally.
- Create a separate staging D1 database in the EU jurisdiction.
- Replace the placeholder database ID in `wrangler.v2.jsonc` only after that database exists.
- Apply `migrations-v2` to staging.
- Seed only synthetic test accounts.

## Milestone 2: authentication and club context

- Replace client-side demo passwords with v2 sessions.
- Resolve the active club from `GET /api/v2/me/clubs`.
- Load the exact club brand from its public entry route.
- Hide the local persona switcher outside local development.

## Milestone 3: reservation module

- Courts, opening hours, reservations, participants and member notifications are now relational tables.
- Half-hour court and player slots have database uniqueness constraints.
- Invitations and attendance responses use atomic API batches.
- Concurrent booking, role and cross-club isolation tests are active.
- Reservation screens, court administration, attendance withdrawal and non-overlapping price rules use these endpoints.
- Recurring booking series, replacement voting and server-side special occupancy are implemented in the v2 core.

## Milestone 4: completed modules

Events, single/double tournaments, payments, orders, stringing, analytics, media, push and privacy operations use v2 endpoints. The old whole-state endpoint remains only as an explicit offline development fallback and is not part of shared testing or production.

Bonus calculation happens on the server, paid and promotional balances stay separate, every top-up has an audit entry, and an idempotency key prevents a receipt from being credited twice. Reservation settlement, refunds and the administrator CSV export use the same ledger.

## Release safety

Each schema change is additive first. Deploy API compatibility before the frontend that uses it.
Run type generation, type checking, Worker integration tests and a dry-run build before deployment.
Back up the production database before applying a migration.
