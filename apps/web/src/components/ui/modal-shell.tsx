'use client';

import Popup from 'devextreme-react/popup';
import type { ReactNode } from 'react';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ModalShellProps {
  visible: boolean;
  onHide: () => void;
  /** Popup width in pixels. Defaults to 480. */
  width?: number;
  /** Close the popup when the user clicks outside it. Defaults to false. */
  hideOnOutsideClick?: boolean;
  /** Value passed to `data-testid` on the popup wrapper. */
  testId?: string;
  // ── Header ──────────────────────────────────────────────────────────────────
  /** Icon element rendered inside the coloured circle. */
  icon: ReactNode;
  /**
   * Tailwind classes for the icon wrapper circle.
   * Defaults to `'bg-primary/10'`.
   */
  iconClassName?: string;
  /** Modal heading text. */
  title: string;
  /** Optional badge rendered next to the title (e.g. StatusBadge). */
  badge?: ReactNode;
  // ── Body ────────────────────────────────────────────────────────────────────
  /** Supporting description shown below the heading. */
  description?: ReactNode;
  /** Modal body — form fields, info panels, action footer, etc. */
  children: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Standard modal shell built on DX Popup.
 *
 * Provides the consistent header layout (icon circle + h4 title + optional
 * badge) and optional description used across confirmation and action modals.
 * Pass form fields, info panels, and the footer buttons as `children`.
 *
 * @example
 * ```tsx
 * <ModalShell
 *   visible={open}
 *   onHide={handleClose}
 *   icon={<LockIcon size={iconSize.sm} className="text-primary" />}
 *   title={t('modal.title')}
 *   description={t('modal.description')}
 * >
 *   <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
 *     {/* fields *\/}
 *     <div className="flex justify-end gap-sm border-t border-border pt-lg">
 *       <Button variant="outlined" onClick={handleClose}>{t('common:actions.cancel')}</Button>
 *       <Button type="submit">{t('common:actions.confirm')}</Button>
 *     </div>
 *   </form>
 * </ModalShell>
 * ```
 */
export function ModalShell({
  visible,
  onHide,
  width = 480,
  testId,
  icon,
  iconClassName = 'bg-primary/10',
  title,
  badge,
  description,
  children,
  hideOnOutsideClick = false,
}: ModalShellProps) {
  return (
    <Popup
      visible={visible}
      onHiding={onHide}
      width={width}
      height="auto"
      dragEnabled={false}
      showCloseButton
      showTitle={false}
      hideOnOutsideClick={hideOnOutsideClick}
      wrapperAttr={testId ? { 'data-testid': testId } : undefined}
    >
      <div className="flex flex-col gap-lg">
        {/* Header */}
        <div className="flex items-center gap-sm">
          <div className={`flex size-10 items-center justify-center rounded-full ${iconClassName}`}>
            {icon}
          </div>
          <Typography variant="h4">{title}</Typography>
          {badge}
        </div>

        {/* Description */}
        {description && (
          <Typography variant="body" className="text-text-secondary">
            {description}
          </Typography>
        )}

        {/* Body */}
        {children}
      </div>
    </Popup>
  );
}

export type { ModalShellProps };
