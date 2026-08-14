import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderHookResult, render, renderHook } from '@testing-library/react';
import type React from 'react';

// ─── Query Client ─────────────────────────────────────────────────────────────

/**
 * Creates a fresh QueryClient with test-safe defaults:
 * - No retries (so failures surface immediately)
 * - No garbage collection delay
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ─── renderWithProviders ──────────────────────────────────────────────────────

/**
 * Wraps `render()` in a QueryClientProvider with test-safe defaults.
 * Use this for all component tests that need React Query.
 *
 * @example
 * const { getByTestId } = renderWithProviders(<MyComponent />);
 */
export function renderWithProviders(ui: React.ReactElement, queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// ─── renderHookWithProviders ──────────────────────────────────────────────────

/**
 * Wraps `renderHook()` in a QueryClientProvider with test-safe defaults.
 * Use this for all hook tests that use React Query.
 *
 * @example
 * const { result } = renderHookWithProviders(() => useMyHook());
 */
export function renderHookWithProviders<T>(
  hook: () => T,
  queryClient?: QueryClient,
): RenderHookResult<T, unknown> {
  const client = queryClient ?? createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
}
