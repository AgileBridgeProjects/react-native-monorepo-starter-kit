import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockHasPermission = vi.hoisted(() => vi.fn<(permission: string) => boolean>());

vi.mock('@features/auth/presentation/hooks/use-current-session', () => ({
  useCurrentSession: () => ({
    hasPermission: mockHasPermission,
    userId: null,
    clubId: null,
    isAuthenticated: true,
  }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { useNavGroups } from '@lib/nav-items';

describe('useNavGroups', () => {
  it('filters nav items by permission', () => {
    mockHasPermission.mockImplementation((permission) => permission === 'StarterKit.Users.View');

    const { result } = renderHook(() => useNavGroups());

    expect(result.current.clubScoped.some((item) => item.href === '/users')).toBe(true);
    expect(result.current.clubScoped.some((item) => item.href === '/reports')).toBe(false);
    expect(result.current.admin.some((item) => item.href === '/clubs')).toBe(false);
  });

  it('returns clubScoped and admin arrays', () => {
    mockHasPermission.mockReturnValue(true);
    const { result } = renderHook(() => useNavGroups());
    expect(Array.isArray(result.current.clubScoped)).toBe(true);
    expect(Array.isArray(result.current.admin)).toBe(true);
    expect(result.current.clubScoped.length).toBeGreaterThan(0);
    expect(result.current.admin.length).toBeGreaterThan(0);
  });

  it('every item has label, href, and icon', () => {
    mockHasPermission.mockReturnValue(true);
    const { result } = renderHook(() => useNavGroups());
    const allItems = [...result.current.clubScoped, ...result.current.admin];
    for (const item of allItems) {
      expect(typeof item.label).toBe('string');
      expect(typeof item.href).toBe('string');
      expect(typeof item.icon).toBe('function');
    }
  });

  it('admin group includes a clubs item pointing to /clubs', () => {
    mockHasPermission.mockReturnValue(true);
    const { result } = renderHook(() => useNavGroups());
    const clubs = result.current.admin.find((i) => i.href === '/clubs');
    expect(clubs).toBeDefined();
  });

  it('uses translated keys as labels (identity transform in test)', () => {
    mockHasPermission.mockReturnValue(true);
    const { result } = renderHook(() => useNavGroups());
    const allItems = [...result.current.clubScoped, ...result.current.admin];
    for (const item of allItems) {
      expect(item.label).toMatch(/^nav:/);
    }
  });
});
