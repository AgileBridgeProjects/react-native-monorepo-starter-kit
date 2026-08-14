import { RequirePermission } from '@features/auth/presentation/components/require-permission';
import type { Href } from 'expo-router';
import { describe, expect, it, vi } from 'vitest';

import { renderTree } from '@/test/utils/rtr';

const mocks = vi.hoisted(() => ({
  hasPermission: vi.fn(),
}));

vi.mock('@features/auth/presentation/hooks/use-current-session', () => ({
  useCurrentSession: () => ({ hasPermission: mocks.hasPermission }),
}));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => `Redirect:${href}`,
}));

describe('RequirePermission', () => {
  it('renders the children when the caller holds the permission', () => {
    mocks.hasPermission.mockReturnValue(true);

    const tree = renderTree(
      <RequirePermission permission="StarterKit.CheckIns.Access" fallbackHref={'/(tabs)' as Href}>
        <>protected content</>
      </RequirePermission>,
    ).toJSON();

    expect(JSON.stringify(tree)).toContain('protected content');
    expect(mocks.hasPermission).toHaveBeenCalledWith('StarterKit.CheckIns.Access');
  });

  it('redirects to the fallback when the caller lacks the permission', () => {
    mocks.hasPermission.mockReturnValue(false);

    const tree = renderTree(
      <RequirePermission permission="StarterKit.CheckIns.Access" fallbackHref={'/(tabs)' as Href}>
        <>protected content</>
      </RequirePermission>,
    ).toJSON();

    expect(tree).toBe('Redirect:/(tabs)');
  });
});
