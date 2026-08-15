export type ClubRole = "admin" | "manager" | "player" | "coach" | "stringer" | "seller";

export type AuthContext = {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
};

export type MembershipContext = {
  membershipId: string;
  clubId: string;
  userId: string;
  role: ClubRole;
};

export type AppVariables = {
  auth: AuthContext;
  requestId: string;
};

export type AppEnv = {
  Bindings: CloudflareBindings & {
    MEDIA?: R2Bucket;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_SUBJECT?: string;
  };
  Variables: AppVariables;
};
