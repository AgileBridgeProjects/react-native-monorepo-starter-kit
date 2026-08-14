import { type RefObject, useEffect } from 'react';

/**
 * Calls `handler` when a mousedown event occurs outside all provided refs.
 * The listener is only active when `enabled` is true.
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      // DX SelectBox/DateBox/etc render their dropdowns as portals under .dx-overlay-wrapper.
      // Treat those as "inside" so selecting an option doesn't close the host popover.
      if ((target as Element).closest?.('.dx-overlay-wrapper')) return;
      if (refs.every((ref) => ref.current && !ref.current.contains(target))) {
        handler();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [refs, handler, enabled]);
}
