import type { D1Database } from "@cloudflare/workers-types";
import type { ClubRole, MembershipContext } from "../types";
import { AppError } from "../lib/errors";

type MembershipRow = {
  membership_id: string;
  club_id: string;
  user_id: string;
  role: ClubRole;
};

export async function requireClubMembership(
  db: D1Database,
  userId: string,
  clubId: string,
  allowedRoles?: readonly ClubRole[],
): Promise<MembershipContext> {
  const row = await db.prepare(`
    SELECT
      memberships.id AS membership_id,
      memberships.club_id,
      memberships.user_id,
      memberships.role
    FROM club_memberships AS memberships
    JOIN clubs ON clubs.id = memberships.club_id
    WHERE memberships.club_id = ?
      AND memberships.user_id = ?
      AND memberships.status = 'active'
      AND clubs.status = 'active'
  `).bind(clubId, userId).first<MembershipRow>();

  if (!row) throw new AppError(403, "club_access_denied", "This club is not available to this account.");
  if (allowedRoles && !allowedRoles.includes(row.role)) {
    throw new AppError(403, "club_role_denied", "This club role cannot perform the operation.");
  }

  return {
    membershipId: row.membership_id,
    clubId: row.club_id,
    userId: row.user_id,
    role: row.role,
  };
}
