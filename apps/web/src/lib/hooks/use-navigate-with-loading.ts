'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useTransition } from 'react';

/**
 * Returns a `navigate(url)` function that wraps `router.push` in a React transition
 * and returns a `Promise<void>` that resolves when the transition completes.
 *
 * Use this with `ActionMenuItem.onClick` to show a loading spinner during navigation:
 *
 * ```tsx
 * const navigate = useNavigateWithLoading();
 * items={[{ label: 'View', onClick: () => navigate('/some/path') }]}
 * ```
 * @knipignore build-ahead: not yet consumed — wire up or remove.
 */
export function useNavigateWithLoading() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const resolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isPending && resolveRef.current) {
      const resolve = resolveRef.current;
      resolveRef.current = null;
      resolve();
    }
  }, [isPending]);

  return useCallback(
    (url: string): Promise<void> =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        startTransition(() => {
          router.push(url);
        });
      }),
    [router],
  );
}
