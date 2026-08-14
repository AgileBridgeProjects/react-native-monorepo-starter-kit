/**
 * Shared Next.js navigation and link stubs for vi.mock() calls.
 *
 * Usage:
 *   vi.mock('next/navigation', async () => await import('@/test/mocks/navigation-mocks').then(m => m.navigationMocks));
 *
 * Or with custom push/replace:
 *   const { mockPush, mockReplace } = vi.hoisted(() => ({ mockPush: vi.fn(), mockReplace: vi.fn() }));
 *   vi.mock('next/navigation', () => navigationMocks({ push: mockPush, replace: mockReplace }));
 */
import type React from 'react';
import { vi } from 'vitest';

// ─── next/link stub ───────────────────────────────────────────────────────────

export const NextLink = ({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
  <a href={href} {...props}>
    {children}
  </a>
);

/** Factory for `vi.mock('next/link', ...)` — returns `{ default: NextLink }` */
export const nextLinkMock = () => ({ default: NextLink });

// ─── next/navigation stubs ────────────────────────────────────────────────────

/**
 * Factory for `vi.mock('next/navigation', ...)`.
 * Pass in the mock fns you hoisted so you can assert on them.
 */
export function nextNavigationMock(overrides?: {
  push?: ReturnType<typeof vi.fn>;
  replace?: ReturnType<typeof vi.fn>;
  searchParams?: URLSearchParams;
}) {
  return {
    useRouter: () => ({
      push: overrides?.push ?? vi.fn(),
      replace: overrides?.replace ?? vi.fn(),
    }),
    useSearchParams: () => overrides?.searchParams ?? new URLSearchParams(),
    usePathname: () => '/',
  };
}
