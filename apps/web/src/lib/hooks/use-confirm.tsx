'use client';

import { type ReactNode, useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  /** Dynamic, action-specific CTA label (e.g. "Delete user"). */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red danger button + warning icon for irreversible/destructive actions. */
  destructive?: boolean;
  /** Optional header icon — defaults to a warning icon when `destructive`. */
  icon?: ReactNode;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Promise-based confirmation, rendered with the styled {@link ConfirmDialog}.
 *
 * Replaces the imperative `confirm()` from `devextreme/ui/dialog` so call sites
 * stay one-liners while getting design-system styling, dynamic CTA wording, and
 * a destructive (red) variant.
 *
 * @example
 * ```tsx
 * const { confirm, confirmDialog } = useConfirm();
 * // ...
 * if (!(await confirm({ title, message, confirmLabel: 'Delete user', destructive: true }))) return;
 * // render once in JSX:
 * {confirmDialog}
 * ```
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((result: boolean) => {
    setVisible(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const confirmDialog = options ? (
    <ConfirmDialog
      visible={visible}
      title={options.title}
      message={options.message}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      destructive={options.destructive}
      icon={options.icon}
      onConfirm={() => resolve(true)}
      onCancel={() => resolve(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
