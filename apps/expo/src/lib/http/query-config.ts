/**
 * Named React Query cache timing constants, grouped by resource type.
 */
export const queryCacheConfig = {
  profile: {
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  },
  list: {
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  },
  leaderboard: {
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  },
  session: {
    staleTime: 0,
    gcTime: 60_000,
  },
  static: {
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
  },
} as const;
