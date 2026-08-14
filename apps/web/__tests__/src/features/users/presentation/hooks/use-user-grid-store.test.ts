import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@features/users/infrastructure/datasources/user-datasource', () => ({
  createUserGridStore: vi.fn((filter) => ({ _filter: filter, reload: vi.fn() })),
  userDatasource: { list: vi.fn(), listTeams: vi.fn() },
}));

vi.mock('devextreme/data/custom_store', () => ({ default: vi.fn() }));
vi.mock('devextreme/data/data_source', () => ({ default: vi.fn() }));

import { createUserGridStore } from '@features/users/infrastructure/datasources/user-datasource';
import { useUserGridStore } from '@features/users/presentation/hooks/use-user-grid-store';

const mockCreateUserGridStore = vi.mocked(createUserGridStore);

describe('useUserGridStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a grid store with the given filter', () => {
    const filter = { clubId: 'club-1', teamId: 'dept-1' };
    renderHookWithProviders(() => useUserGridStore(filter));

    expect(mockCreateUserGridStore).toHaveBeenCalledWith({
      clubId: 'club-1',
      teamId: 'dept-1',
    });
  });

  it('returns an object with a store property', () => {
    const filter = { clubId: 'club-1' };
    const { result } = renderHookWithProviders(() => useUserGridStore(filter));

    expect(result.current).toHaveProperty('store');
  });

  it('passes clubId and teamId separately to createUserGridStore', () => {
    renderHookWithProviders(() => useUserGridStore({ clubId: 'c1', teamId: 'd1' }));

    expect(mockCreateUserGridStore).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: 'c1', teamId: 'd1' }),
    );
  });
});
