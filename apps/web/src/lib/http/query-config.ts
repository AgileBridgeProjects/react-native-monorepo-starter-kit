/**
 * Named React Query cache timing constants, grouped by resource type.
 *
 * These match the recommended staleTime / gcTime values from
 * docs/standards/nfr-performance.md § React Query — Recommended staleTime / gcTime.
 *
 * Usage:
 *   import { queryCacheConfig } from '@lib/http/query-config';
 *
 *   useQuery({ queryKey, queryFn, ...queryCacheConfig.list });
 */
export const queryCacheConfig = {
  /** Current user profile — changes infrequently. */
  profile: {
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  },
  /** Catalogue / list data — moderately dynamic. */
  list: {
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  },
  /** Leaderboards — high churn. */
  leaderboard: {
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  },
  /** In-progress game session — real-time accuracy required. */
  session: {
    staleTime: 0,
    gcTime: 60_000,
  },
  /** Club picker list — logos and names change infrequently; cache aggressively to avoid repeated logo fetches. */
  clubPicker: {
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  },
  /** Static reference data (categories, enums) — rarely changes. */
  static: {
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
  },
} as const;
