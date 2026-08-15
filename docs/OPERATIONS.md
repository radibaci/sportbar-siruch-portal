# Platform operations

## Deployment model

Run one versioned frontend and one v2 API for all clubs. A club is a tenant identified by `club_id`, with its own memberships, module switches, courts and records. Do not fork the application per club; that would make security fixes and schema updates unreliable.

Each club can use its own logo, name, colors and link from its existing website. The installed PWA remains one application. The club selector shows only clubs where the signed-in player has an active membership; the private agenda aggregates only that player's own records.

## Provision a club

For the shared platform, the guarded one-command installer applies migrations and creates the complete tenant:

```powershell
$env:CLUB_ADMIN_PASSWORD = "a-long-unique-temporary-password"
$env:INSTALL_CONFIRM = "CREATE_CLUB"
$env:BACKUP_ENCRYPTION_KEY = "base64url-32-byte-key"
npm run club:install -- --remote --slug=novy-klub --name="Novy klub" --admin-email=admin@example.cz --courts=4
Remove-Item Env:CLUB_ADMIN_PASSWORD,Env:INSTALL_CONFIRM,Env:BACKUP_ENCRYPTION_KEY
```

The installer runs the release gate, creates an encrypted pre-change backup, applies every migration and provisions the club with dependency-compatible modules, courts and prices. The requested module list is expanded automatically with `core` and every transitive dependency, so a club cannot be installed with tournaments but without events or reservations. Updates stay centralized: one API/frontend release serves all tenants, so security fixes never require editing individual clubs.

Preview the exact tenant plan without a password or database write:

```powershell
npm run club:plan -- --slug=novy-klub --name="Novy klub" --admin-email=admin@example.cz --courts=4 --modules=tournaments,stringing
```

1. Apply all migrations to the target database.
2. Set the administrator password in `CLUB_ADMIN_PASSWORD`; never put it into command history.
3. Run the provisioning script locally first, then with `--remote` for the hosted platform.

```powershell
$env:CLUB_ADMIN_PASSWORD = "a-long-unique-temporary-password"
npm run club:provision -- --slug=sportpark-siruch --name="Sportpark Siruch" --admin-email=admin@example.cz --courts=4 --modules=reservations,community,events,tournaments,payments,shop,stringing,operations,analytics
Remove-Item Env:CLUB_ADMIN_PASSWORD
```

Provisioning creates the requested number of courts with a replaceable default price of 180 CZK/hour and writes an audit event. A password-change flow and verified e-mail invitation are required before public onboarding is enabled.

## Safe release order

Create the private R2 bucket named in `wrangler.v2.jsonc` once, and keep the VAPID private key as a Worker secret:

```powershell
npx wrangler r2 bucket create tennis-club-platform-media
npx wrangler secret put VAPID_PRIVATE_KEY --config wrangler.v2.jsonc
```

The public VAPID key and subject are non-secret configuration. Cron runs every two minutes and delivers new persisted notifications, attendance reminders and opted-in service reminders. Android launcher badge numbers are device/launcher dependent; the notification itself and in-app counters are the reliable contract.

The guarded one-command API release is:

```powershell
$env:RELEASE_CONFIRM = "DEPLOY_V2"
$env:PLATFORM_API_URL = "https://api.example.cz"
$env:SMOKE_EMAIL = "smoke@example.cz"
$env:SMOKE_PASSWORD = "dedicated-read-only-smoke-password"
npm run release:v2 -- --remote
Remove-Item Env:RELEASE_CONFIRM,Env:PLATFORM_API_URL,Env:SMOKE_EMAIL,Env:SMOKE_PASSWORD
```

It refuses a dirty worktree by default, runs the full release gate, creates a checksummed remote backup, applies migrations and only then deploys the API. It then signs in with a dedicated smoke account, verifies club context and schedule, logs out and confirms that the session is revoked. The frontend is deliberately published separately only after this compatible API smoke test passes. Use a dedicated active club account without platform-wide privileges; keep its password in the deployment secret store.

1. Run `npm ci` and `npm run v2:check`.
2. Export the remote D1 database: `npm run db:backup -- --remote`.
3. Verify that the SQL file and adjacent checksum manifest exist.
4. Apply additive migrations with `wrangler d1 migrations apply DB --remote --config wrangler.v2.jsonc`.
5. Deploy the API with `wrangler deploy --strict --keep-vars --config wrangler.v2.jsonc`.
6. Run health, login, tenant-isolation, reservation and admin smoke tests.
7. Publish the frontend only after the compatible API is live. A new frontend build must use a new immutable asset/cache version.

Schema changes follow expand/migrate/contract: add compatible columns and endpoints, migrate data, switch clients, then remove obsolete structures in a later release. Never deploy a frontend that requires a schema not yet present.

## Backup and restore

`npm run db:backup` exports local D1. Add `-- --remote` for the hosted database. Every export receives a SHA-256 manifest and `backups/` is ignored by Git. Remote export is refused unless `BACKUP_ENCRYPTION_KEY` contains a base64url-encoded 32-byte key; the resulting `.sql.enc` uses AES-256-GCM and the plaintext SQL is deleted immediately.

Generate the key once, store it in a password manager and a separate recovery location, never in Git or next to the backup:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
$env:BACKUP_ENCRYPTION_KEY = "value-from-password-manager"
```

Verify encrypted backups regularly without touching a database:

```powershell
npm run db:restore -- backups/file.sql.enc --verify-only
```

Restore is local by default and must target a separate empty database:

```powershell
$env:D1_RESTORE_DATABASE = "tennis_club_restore_test"
npm run db:restore -- backups/tennis_club_platform_v2_staging-remote-2026-08-06T12-00-00-000Z.sql.enc
Remove-Item Env:D1_RESTORE_DATABASE
```

For a local rehearsal the restore script creates a temporary isolated Wrangler configuration automatically and verifies that tables were restored. For a remote staging restore, create the empty D1 target first and also set its ID in `D1_RESTORE_DATABASE_ID`.

A remote restore is blocked unless both `--remote` and `--confirm-remote` are present. An in-place restore additionally requires `--allow-in-place`. Restore into a separate staging database first, run smoke tests, record the result and only then plan production recovery.

Backups must be encrypted outside the repository, access-controlled, retained according to the documented policy and periodically restored in a rehearsal. An untested export is not a backup strategy.
