'use client';

import { useTranslation } from '@lib/i18n';
import { WarningIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import Popup from 'devextreme-react/popup';
import type { ReactNode } from 'react';
import { Button } from './button';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  /** Body text — accepts React nodes so callers can render bold names etc. */
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Marks the action as destructive — the confirm button turns red (danger) and
   * the header shows a warning icon (unless a custom `icon` is supplied).
   */
  destructive?: boolean;
  /**
   * Optional header icon. When provided (or when `destructive`), the dialog
   * renders the icon-circle header used across the design system instead of the
   * plain DX title bar. Omit both for the original lightweight dialog.
   */
  icon?: ReactNode;
  /** Optional actions rendered on the left of the footer (e.g. a Discard button). */
  extraActions?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Centralised confirmation dialog built on DX Popup.
 * Use instead of the imperative `confirm()` from devextreme/ui/dialog when you
 * need rich message content, a loading state, or destructive styling.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmLabel,
  cancelLabel,
  destructive = false,
  icon,
  extraActions,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  const resolvedIcon = icon ?? (destructive ? <WarningIcon size={iconSize.sm} /> : null);
  const showHeader = !!resolvedIcon;

  return (
    <Popup
      visible={visible}
      title={title}
      onHiding={onCancel}
      width={420}
      height="auto"
      dragEnabled={false}
      showCloseButton
      showTitle={!showHeader}
      wrapperAttr={{ 'data-testid': 'confirm-dialog' }}
    >
      <div className="flex flex-col gap-lg">
        {showHeader && (
          <div className="flex items-center gap-sm">
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-full',
                destructive ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary',
              )}
            >
              {resolvedIcon}
            </div>
            <Typography variant="h4">{title}</Typography>
          </div>
        )}

        <Typography variant="body-sm">{message}</Typography>

        <div
          className={cn(
            'flex gap-sm',
            extraActions ? 'items-center justify-between' : 'justify-end',
            showHeader && 'border-t border-border pt-lg',
          )}
        >
          {extraActions && <div>{extraActions}</div>}
          <div className="flex gap-sm">
            <Button variant="outlined" disabled={isLoading} onClick={onCancel}>
              {cancelLabel ?? t('common:actions.cancel')}
            </Button>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              isLoading={isLoading}
              onClick={onConfirm}
            >
              {confirmLabel ?? t('common:actions.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Popup>
  );
}

export type { ConfirmDialogProps };
