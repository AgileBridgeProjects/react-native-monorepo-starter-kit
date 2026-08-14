import { queryCacheConfig } from '@lib/http/query-config';
import { uiConfig } from '@lib/ui-config';
import { useQuery } from '@tanstack/react-query';
import { SetupStatus } from '@/proxy/models';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

async function fetchAllIds(clubId: string, setupStatus: SetupStatus): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;

  while (true) {
    const { items, hasNextPage } = await userDatasource.list(
      page,
      uiConfig.api.syncPageSize,
      undefined,
      undefined,
      {
        clubId,
        setupStatus,
      },
    );
    ids.push(...items.map((u) => u.id));
    if (!hasNextPage) break;
    page++;
  }

  return ids;
}

/** Fetches all resend-eligible user IDs for the given filter, paginating as needed. */
export async function fetchResendEligibleUserIds(
  clubId: string,
  filter: 'pending' | 'expired' | 'both',
): Promise<string[]> {
  const statuses =
    filter === 'pending'
      ? [SetupStatus.PendingSetup]
      : filter === 'expired'
        ? [SetupStatus.SetupExpired]
        : [SetupStatus.PendingSetup, SetupStatus.SetupExpired];

  const results = await Promise.all(statuses.map((s) => fetchAllIds(clubId, s)));
  return results.flat();
}

/** Returns the count of pending and expired setup users. Uses page-size 1 so only the totalCount is fetched. */
export function useResendEligibleCounts(clubId: string | null | undefined) {
  const pending = useQuery({
    queryKey: ['users', 'resend-eligible-count', 'pending', clubId],
    queryFn: async () => {
      const { totalCount } = await userDatasource.list(1, 1, undefined, undefined, {
        clubId: clubId ?? undefined,
        setupStatus: SetupStatus.PendingSetup,
      });
      return totalCount;
    },
    enabled: !!clubId,
    ...queryCacheConfig.leaderboard,
  });

  const expired = useQuery({
    queryKey: ['users', 'resend-eligible-count', 'expired', clubId],
    queryFn: async () => {
      const { totalCount } = await userDatasource.list(1, 1, undefined, undefined, {
        clubId: clubId ?? undefined,
        setupStatus: SetupStatus.SetupExpired,
      });
      return totalCount;
    },
    enabled: !!clubId,
    ...queryCacheConfig.leaderboard,
  });

  return {
    pendingCount: pending.data ?? 0,
    expiredCount: expired.data ?? 0,
  };
}
