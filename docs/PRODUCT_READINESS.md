# Product readiness

This file is the release gate. A UI control is not considered complete until it persists through the v2 API, is tenant-scoped and has an integration test.

## Ready in the v2 core

| Area | State | Verified behavior |
| --- | --- | --- |
| Authentication | Ready | Password hashing, rate limiting, secure sessions, logout and session revocation |
| Tenant isolation | Ready | Club and user enumeration blocked; every protected query checks membership |
| Club administration | Ready | Primary admin and operational manager are distinct; only the primary admin changes modules or creates managers |
| Courts | Ready | Create, edit and remove; active reservations and the last court are protected |
| Court pricing | Ready | Day/time rules persist; overlapping intervals are split and individual intervals can be auditably removed |
| Special occupancy | Ready | Multi-court blocks share collision-safe half-hour locks with reservations |
| Club events | Core ready | Publish, player announcement, registration visible to staff and cancellation reason |
| Club polls | Core ready | Admin creation, tenant-wide announcements, one changeable server-weighted vote per player, reminders and closure |
| Single tournaments | Core ready | Shared registration, entry fee, capacity, server-side group draw, match results, knockout generation and archive |
| Supplier event approval | Core ready | Closed poll creates a dated draft, seller confirms date and delivery, admin publishes to players |
| Reservations | Core ready | 30-minute collision locks, singles/doubles capacity, invitations, responses, withdrawal and undo |
| Recurring reservations | Core ready | Atomic weekly series, shared lineup, per-occurrence withdrawal and future-series cancellation |
| Club friendships | Core ready | One pending request per pair, explicit acceptance, same-club isolation and member notifications |
| Game proposals | Core ready | A proposal reserves a court, tracks pending invitees and becomes a reservation only at 2/2 or 4/4 |
| Game counterproposals | Core ready | Invited player proposes any half-hour range; owner acceptance atomically moves court and participant locks |
| Replacement voting | Core ready | Collision-free candidates are invited, must opt in and are selected by active-player votes with deterministic ties |
| Orders | Core ready | Player delivery links, staff queue, stock/supplier decision and player-visible fulfilment state |
| Stringing workflow | Core ready | Order assignment, club receipt, stringer pickup/return, reception readiness and club-to-player handover |
| Credits | Ready | Paid and bonus balances separated; manual top-up is idempotent and audited |
| Member accounts | Core ready | Admin can create a real login and save the club account type, discount and notes |

## Release modules completed in v2

| Area | Verified behavior |
| --- | --- |
| Cross-club friendships | Exact-handle opt-in, explicit acceptance and club-neutral UI without a public club directory |
| Double tournaments | Pair registration, entry fee, duplicate-player protection, pair-aware groups, results and knockout |
| Service automation | Scheduled attendance/stringing reminders, deduplicated pickup runs and private handover media reference |
| Push notifications | V2 subscriptions, background cron delivery, retry records, invalid-endpoint disabling and user preferences |
| Media uploads | Private R2 objects, tenant authorization, MIME and 8 MB size validation, metadata and deletion |
| Club credit | Per-reservation ledger, time-rule pricing, member discount, bonus/paid credit split, refunds and staff-only CSV export. Tennis Siruch accepts money outside the portal and credits it manually through an administrator. |
| Analytics | Server-derived court occupancy, paid revenue, monthly history and role-protected business dashboard |
| GDPR operations | Versioned consent, self export, erasure request queue, retention job and processor register schema |
| Multi-club player UI | Remembered club selector plus an aggregated private agenda across the signed-in user's memberships |

## Verification record

Release `v124` keeps deterministic contextual help and adds the manual-credit-only Tennis Siruch flow, authenticated password changes with full session revocation, a 15-account production role smoke test and version-derived direct Pages deployment. Operations tests cover help integrity, account security, credit UI, Pages isolation, backup/restore guards, authenticated smoke flows and immutable PWA release consistency. R2 media storage and a documented restore rehearsal remain required before storing real player uploads.

Tennis Siruch uses manual club credit only: players cannot initiate an online or QR payment in the portal. An administrator records money received by the club, the server applies the best matching bonus rule exactly once and the player sees the paid/bonus split and immutable history.
