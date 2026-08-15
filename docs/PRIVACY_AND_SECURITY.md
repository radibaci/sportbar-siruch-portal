# Privacy and security baseline

Policy version: `2026-08-01`.

The platform is a processor for club data and a controller for the shared account and explicitly accepted cross-club connections. Clubs cannot enumerate other clubs or their members. Every club query is authorized through an active membership and mutations are role checked.

## Personal data lifecycle

- Collect only account, membership, booking, payment, service and user-supplied profile data needed by enabled modules.
- Store versioned consent decisions and notification preferences separately from operational records.
- Provide authenticated JSON export through `GET /api/v2/me/export`.
- Queue erasure requests through `POST /api/v2/me/privacy-requests`; the operator verifies legal accounting retention before pseudonymization.
- Expire login-attempt records after 90 days and revoke expired sessions in scheduled maintenance.
- Keep processor records for Cloudflare and any configured mail/payment provider. Sign a DPA and choose EU jurisdiction for production D1/R2.

## Security controls

- Passwords use salted PBKDF2, sessions are revocable, cookies are HttpOnly/SameSite and Secure outside localhost.
- CORS uses an explicit origin allow-list. Responses deny framing, MIME sniffing and referrer leakage.
- D1 is the authority for collisions, balances, roles and tenant boundaries; browser state is never trusted for authorization.
- R2 media is private, limited to JPEG/PNG/WebP and 8 MB, and served only after owner or club-membership authorization.
- Remote backups require AES-256-GCM encryption and a separate checksum manifest. Restore defaults to a separate database.
- Push credentials and backup keys are Wrangler secrets or operator environment secrets and are never committed.

Before production, the operator must add the business identity, controller contacts, retention periods, lawful bases, subprocessors, incident procedure and Czech-language privacy notice reviewed for the concrete deployment. This repository supplies technical controls, not legal certification.
