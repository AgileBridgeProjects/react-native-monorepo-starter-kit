import type {
  AuthenticationMethod,
  PlayingPosition,
  SetupStatus,
  UserResponse,
} from '@/proxy/models';

// Derived from the proxy DTO so the two types cannot drift.
// Required<Pick<...>> enforces that the listed fields are always present
// after the mapping function has validated them.
export type User = Required<
  Pick<UserResponse, 'id' | 'clubId' | 'displayName' | 'isActive' | 'createdAt'>
> & {
  avatarUrl: string | null;
  email: string | null;
  phoneNumber: string | null;
  username: string | null;
  authMethod: AuthenticationMethod;
  lastLoginAt: string | null;
  dateOfBirth: string | null;
  position: PlayingPosition | null;
  jerseyNumber: number | null;
  /** Team membership — the sole source of truth for which team(s) a user belongs to. */
  teamIds: string[];
  /** Linked Athlete(s) (Parent) — only populated on single-user fetches. */
  dependentUserIds: string[];
  roles: string[];
  isSharedAcrossClubs: boolean;
  setupStatus: SetupStatus;
};
