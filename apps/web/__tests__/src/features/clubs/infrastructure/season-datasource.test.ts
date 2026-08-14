import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock proxy functions ─────────────────────────────────────────────────────
vi.mock('@/proxy/services/seasons/seasons', () => ({
  getApiClubsClubIdSeasons: vi.fn(),
  getApiClubsClubIdSeasonsCurrent: vi.fn(),
  postApiClubsClubIdSeasons: vi.fn(),
}));

import { seasonDatasource } from '@features/clubs/infrastructure/datasources/season-datasource';
import {
  getApiClubsClubIdSeasons,
  getApiClubsClubIdSeasonsCurrent,
  postApiClubsClubIdSeasons,
} from '@/proxy/services/seasons/seasons';

const mockList = vi.mocked(getApiClubsClubIdSeasons);
const mockGetCurrent = vi.mocked(getApiClubsClubIdSeasonsCurrent);
const mockCreate = vi.mocked(postApiClubsClubIdSeasons);

describe('seasonDatasource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns mapped seasons for the club', async () => {
      mockList.mockResolvedValue({
        items: [
          {
            id: 'season-2',
            clubId: 'club-1',
            name: '2027 Indoor',
            startDate: '2027-01-01',
            endDate: '2027-12-31',
            displayLabel: '2027 Indoor',
          },
          {
            id: 'season-1',
            clubId: 'club-1',
            name: null,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            displayLabel: '2026 Season',
          },
        ],
      } as never);

      const result = await seasonDatasource.list('club-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('season-2');
      expect(result[1].name).toBeUndefined();
      expect(mockList).toHaveBeenCalledWith('club-1');
    });

    it('returns an empty array when there are no items', async () => {
      mockList.mockResolvedValue({ items: undefined } as never);

      const result = await seasonDatasource.list('club-1');

      expect(result).toEqual([]);
    });
  });

  describe('getCurrent', () => {
    it('returns the mapped season on success', async () => {
      mockGetCurrent.mockResolvedValue({
        id: 'season-1',
        clubId: 'club-1',
        name: null,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        displayLabel: '2026 Season',
      } as never);

      const result = await seasonDatasource.getCurrent('club-1');

      expect(result).toEqual({
        id: 'season-1',
        clubId: 'club-1',
        name: undefined,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        displayLabel: '2026 Season',
      });
      expect(mockGetCurrent).toHaveBeenCalledWith('club-1');
    });

    it('preserves an explicit season name when set', async () => {
      mockGetCurrent.mockResolvedValue({
        id: 'season-1',
        clubId: 'club-1',
        name: '2026 Indoor',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        displayLabel: '2026 Indoor',
      } as never);

      const result = await seasonDatasource.getCurrent('club-1');

      expect(result.name).toBe('2026 Indoor');
    });

    it('throws when the response is missing required fields', async () => {
      mockGetCurrent.mockResolvedValue({ id: 'season-1' } as never);

      await expect(seasonDatasource.getCurrent('club-1')).rejects.toThrow(
        /SeasonResponse missing required fields/,
      );
    });
  });

  describe('create', () => {
    it('creates a season and returns the mapped result', async () => {
      mockCreate.mockResolvedValue({
        id: 'season-2',
        clubId: 'club-1',
        name: '2027 Indoor',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        displayLabel: '2027 Indoor',
      } as never);

      const result = await seasonDatasource.create('club-1', {
        name: '2027 Indoor',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
      });

      expect(result.id).toBe('season-2');
      expect(mockCreate).toHaveBeenCalledWith('club-1', {
        name: '2027 Indoor',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        cloneTeamsFromSeasonId: undefined,
      });
    });

    it('forwards cloneTeamsFromSeasonId when supplied', async () => {
      mockCreate.mockResolvedValue({
        id: 'season-2',
        clubId: 'club-1',
        name: null,
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        displayLabel: '2027 Season',
      } as never);

      await seasonDatasource.create('club-1', {
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        cloneTeamsFromSeasonId: 'season-1',
      });

      expect(mockCreate).toHaveBeenCalledWith('club-1', {
        name: undefined,
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        cloneTeamsFromSeasonId: 'season-1',
      });
    });
  });
});
