# Platform architecture v2

## Purpose

V2 is a modular multi-club core that can serve the browser and one installed PWA.
The portal screens use the v2 API as their shared source of truth. Local demo data remains only as an explicit offline fallback for development.

## Security invariants

1. There is no endpoint that lists all platform users or all clubs.
2. A club administrator works with `club_memberships`, not global user records.
3. Every club data query receives `club_id` from an authenticated membership check.
4. A member has a different membership ID in every club.
5. Global connections are private player-to-player data and are not exposed to club admins.
6. Public club data is available only by an exact club slug.
7. Module visibility is enforced by the API, not only by hiding navigation.
8. Every administrative mutation creates an audit event.

## Reservation invariants

- A reservation is expanded into 30-minute `reservation_slots`. A database unique key prevents overlapping court bookings from concurrent devices.
- Invited and confirmed members receive `member_busy_slots`, preventing one player from being booked on two courts at the same time.
- A pending invitation appears in `member_notifications`, not in the invited player's reservation list.
- Accepting promotes the participant and closes the notification. Declining releases the player's time and moves the reservation to `searching`.
- Court schedule responses expose occupancy and the signed-in member's relationship to it without exposing a global player directory.
- Completed reservations and events leave the active home feed and remain available in history.

## Core tables

- `platform_users`: global authentication and private platform identity.
- `clubs`: club brand and public entry configuration.
- `club_memberships`: club-scoped role and member data.
- `club_modules`: per-club feature switches and configuration.
- `auth_sessions`: hashed session tokens with expiry and revocation.
- `user_connections`: private opt-in player relationships.
- `privacy_preferences`: versioned privacy choices by purpose.
- `audit_events`: administrative change history.
- `club_courts`: club-scoped courts, surfaces and opening hours.
- `reservations` and `reservation_slots`: booking metadata and collision-safe half-hour occupancy.
- `reservation_participants` and `member_busy_slots`: attendance and player collision protection.
- `member_notifications`: actionable, member-scoped messages.
- `club_credit_rules`: club-defined top-up thresholds and bonus amounts.
- `member_credit_accounts` and `credit_transactions`: separate paid/bonus balances with an immutable ledger.
- `court_price_rules`: non-overlapping club/court day and time pricing intervals.
- `court_blocks` and `court_block_slots`: administrator occupancy with database-enforced collision locks.
- `member_club_profiles`: club-specific account type, discounts and private administrator notes.
- `club_events` and `event_registrations`: announcements, attendance and cancellation lifecycle.
- `friend_requests` and `club_friendships`: explicit, club-scoped player relationships without directory leakage.
- `club_orders`: player-owned product/service requests with reservation/event delivery and staff fulfilment state.

## API surface in the first milestone

- `GET /api/v2/health`
- `POST /api/v2/auth/login`
- `POST /api/v2/auth/logout`
- `GET /api/v2/me`
- `GET /api/v2/me/clubs`
- `GET /api/v2/clubs/:slug/public`
- `GET /api/v2/clubs/:clubId/context`
- `PUT /api/v2/clubs/:clubId` for club identity and opening hours
- `GET /api/v2/clubs/:clubId/members` for club admins and managers
- `POST /api/v2/clubs/:clubId/members` and `PUT /members/:membershipId/profile` for administrators
- `PUT /api/v2/clubs/:clubId/modules/:moduleKey` for club admins
- `GET /api/v2/clubs/:clubId/courts?date=YYYY-MM-DD`
- `POST /api/v2/clubs/:clubId/reservations`
- `GET /api/v2/clubs/:clubId/me/reservations`
- `GET /api/v2/clubs/:clubId/me/notifications`
- `POST /api/v2/clubs/:clubId/me/notifications/:notificationId/dismiss`
- `POST /api/v2/clubs/:clubId/reservations/:reservationId/respond`
- `GET /api/v2/clubs/:clubId/relationships` and `POST /friend-requests` for player consent flows
- `GET`, `POST`, `PUT /api/v2/clubs/:clubId/events` plus registration and cancellation actions
- `POST`, `PUT`, `DELETE /api/v2/clubs/:clubId/courts` for authorized club staff
- `POST /api/v2/clubs/:clubId/courts/:courtId/price-rules`
- `GET`, `POST`, `PUT`, `DELETE /api/v2/clubs/:clubId/credit-rules`
- `POST /api/v2/clubs/:clubId/members/:membershipId/credit-topups`
- `GET /api/v2/clubs/:clubId/me/credit`

The absence of `/api/v2/clubs` and `/api/v2/users` is intentional.

## Deployment modes

The domain layer will stay independent of the storage adapter. The first adapter is Cloudflare
Workers plus D1. A later self-hosted adapter will use the same API contract with PostgreSQL and
S3-compatible file storage.

Production data must use a D1 database created with EU jurisdiction. The legacy local-data store is
development-only and is never treated as the production source of truth.
