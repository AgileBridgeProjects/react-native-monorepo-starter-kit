import { queryCacheConfig } from '@lib/http/query-config';
import { describe, expect, it } from 'vitest';

describe('queryCacheConfig', () => {
  it('exposes a config entry for every named resource group', () => {
    expect(Object.keys(queryCacheConfig).sort()).toEqual(
      ['leaderboard', 'list', 'profile', 'session', 'static'].sort(),
    );
  });

  describe('timing values', () => {
    it.each([
      ['profile', 5 * 60_000, 10 * 60_000],
      ['list', 2 * 60_000, 5 * 60_000],
      ['leaderboard', 30_000, 2 * 60_000],
      ['session', 0, 60_000],
      ['static', 60 * 60_000, 2 * 60 * 60_000],
    ] as const)('%s has the expected staleTime and gcTime', (key, staleTime, gcTime) => {
      expect(queryCacheConfig[key].staleTime).toBe(staleTime);
      expect(queryCacheConfig[key].gcTime).toBe(gcTime);
    });
  });

  it('keeps gcTime >= staleTime for every group (cache outlives freshness)', () => {
    for (const cfg of Object.values(queryCacheConfig)) {
      expect(cfg.gcTime).toBeGreaterThanOrEqual(cfg.staleTime);
    }
  });

  it('treats session data as always-stale (staleTime 0) for instant refetch', () => {
    expect(queryCacheConfig.session.staleTime).toBe(0);
  });

  it('orders freshness windows shortest→longest: session < leaderboard < list < profile < static', () => {
    const { session, leaderboard, list, profile, static: staticCfg } = queryCacheConfig;
    expect(session.staleTime).toBeLessThan(leaderboard.staleTime);
    expect(leaderboard.staleTime).toBeLessThan(list.staleTime);
    expect(list.staleTime).toBeLessThan(profile.staleTime);
    expect(profile.staleTime).toBeLessThan(staticCfg.staleTime);
  });
});
