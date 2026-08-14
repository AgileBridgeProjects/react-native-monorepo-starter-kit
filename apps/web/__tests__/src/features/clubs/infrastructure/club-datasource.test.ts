import { ClubNotFoundFailure } from '@features/clubs/domain/failures/club-failures';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeClub, makeClubListResult } from '@/test/factories';

// ─── Mock proxy functions ─────────────────────────────────────────────────────
vi.mock('@/proxy/services/clubs/clubs', () => ({
  getApiClubs: vi.fn(),
  getApiClubsId: vi.fn(),
  postApiClubs: vi.fn(),
  postApiClubsImages: vi.fn(),
  putApiClubsId: vi.fn(),
  deleteApiClubsId: vi.fn(),
}));

// ─── Mock DevExtreme grid store (avoids browser-only DataSource in jsdom) ─────
vi.mock('@lib/http/create-grid-store', () => ({
  createGridStore: vi.fn(() => ({ reload: vi.fn() })),
}));

import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import {
  deleteApiClubsId,
  getApiClubs,
  getApiClubsId,
  postApiClubs,
  postApiClubsImages,
  putApiClubsId,
} from '@/proxy/services/clubs/clubs';

const mockGetApiClubs = vi.mocked(getApiClubs);
const mockGetApiClubsId = vi.mocked(getApiClubsId);
const mockPostApiClubs = vi.mocked(postApiClubs);
const mockPostApiClubsImages = vi.mocked(postApiClubsImages);
const mockPutApiClubsId = vi.mocked(putApiClubsId);
const mockDeleteApiClubsId = vi.mocked(deleteApiClubsId);

describe('clubDatasource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns mapped club list result', async () => {
      const dto = makeClubListResult();
      mockGetApiClubs.mockResolvedValue({
        items: dto.items,
        totalCount: dto.totalCount,
        page: dto.page,
        pageSize: dto.pageSize,
        hasNextPage: dto.hasNextPage,
      } as never);

      const result = await clubDatasource.list(1, 25);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('club-1');
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
      expect(result.hasNextPage).toBe(false);
    });

    it('forwards page, pageSize, filterText, and sort to the proxy', async () => {
      mockGetApiClubs.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 2,
        pageSize: 10,
        hasNextPage: false,
      } as never);

      await clubDatasource.list(2, 10, 'acme', [{ selector: 'name', desc: false }]);

      expect(mockGetApiClubs).toHaveBeenCalledWith({
        Page: 2,
        PageSize: 10,
        FilterText: 'acme',
        SortBy: 'name',
        SortDescending: false,
      });
    });
  });

  describe('getById', () => {
    it('returns mapped club on success', async () => {
      const club = makeClub();
      mockGetApiClubsId.mockResolvedValue(club as never);

      const result = await clubDatasource.getById('club-1');

      expect(result.id).toBe('club-1');
      expect(result.name).toBe('Acme Corp');
    });

    it('throws ClubNotFoundFailure on 404', async () => {
      const axiosError = { isAxiosError: true, response: { status: 404 } };
      mockGetApiClubsId.mockRejectedValue(axiosError);

      await expect(clubDatasource.getById('missing-id')).rejects.toBeInstanceOf(
        ClubNotFoundFailure,
      );
    });

    it('re-throws non-404 errors', async () => {
      const serverError = { isAxiosError: true, response: { status: 500 } };
      mockGetApiClubsId.mockRejectedValue(serverError);

      await expect(clubDatasource.getById('club-1')).rejects.toBe(serverError);
    });
  });

  describe('create', () => {
    it('returns mapped club', async () => {
      const club = makeClub({ name: 'New Co' });
      mockPostApiClubs.mockResolvedValue(club as never);

      const result = await clubDatasource.create({
        name: 'New Co',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
        seasonStartDate: '2026-01-01',
        seasonEndDate: '2026-12-31',
      });

      expect(result.name).toBe('New Co');
      expect(mockPostApiClubs).toHaveBeenCalledWith({
        name: 'New Co',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
        seasonStartDate: '2026-01-01',
        seasonEndDate: '2026-12-31',
      });
    });
  });

  describe('update', () => {
    it('returns updated club', async () => {
      const club = makeClub({ name: 'Updated Co' });
      mockPutApiClubsId.mockResolvedValue(club as never);

      const result = await clubDatasource.update('club-1', {
        name: 'Updated Co',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
      });

      expect(result.name).toBe('Updated Co');
      expect(mockPutApiClubsId).toHaveBeenCalledWith('club-1', {
        name: 'Updated Co',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
      });
    });

    it('throws ClubNotFoundFailure on 404', async () => {
      const axiosError = { isAxiosError: true, response: { status: 404 } };
      mockPutApiClubsId.mockRejectedValue(axiosError);

      await expect(
        clubDatasource.update('missing', {
          name: 'X',
          streetAddress: '1 Main St',
          city: 'Denver',
          state: 'CO',
        }),
      ).rejects.toBeInstanceOf(ClubNotFoundFailure);
    });
  });

  describe('uploadLogo', () => {
    it('uploads the selected file and returns the stored URL', async () => {
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });
      mockPostApiClubsImages.mockResolvedValue({
        logoUrl: 'https://assets.test/logo.png',
      } as never);

      const result = await clubDatasource.uploadLogo(file);

      expect(mockPostApiClubsImages).toHaveBeenCalledWith({ file });
      expect(result).toBe('https://assets.test/logo.png');
    });
  });

  describe('delete', () => {
    it('resolves without error on success', async () => {
      mockDeleteApiClubsId.mockResolvedValue(undefined as never);

      await expect(clubDatasource.delete('club-1')).resolves.toBeUndefined();
      expect(mockDeleteApiClubsId).toHaveBeenCalledWith('club-1');
    });

    it('throws ClubNotFoundFailure on 404', async () => {
      const axiosError = { isAxiosError: true, response: { status: 404 } };
      mockDeleteApiClubsId.mockRejectedValue(axiosError);

      await expect(clubDatasource.delete('missing')).rejects.toBeInstanceOf(ClubNotFoundFailure);
    });
  });
});
