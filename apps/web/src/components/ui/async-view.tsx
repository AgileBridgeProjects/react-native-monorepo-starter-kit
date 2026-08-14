import type { ReactNode } from 'react';
import { EmptyState } from './empty-state';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AsyncViewProps {
  /** True while data is being fetched (shows loading state). */
  isLoading?: boolean;
  /** True when data is present and ready to render. */
  hasData: boolean;
  /** Loading skeleton rendered while `isLoading` is true. */
  loading?: ReactNode;
  /** Content rendered when `hasData` is false and not loading. */
  emptyState?: ReactNode;
  /** Optional built-in empty-state icon when `emptyState` is not supplied. */
  emptyStateIcon?: ReactNode;
  /** Optional built-in empty-state title when `emptyState` is not supplied. */
  emptyStateTitle?: ReactNode;
  /** Optional built-in empty-state description when `emptyState` is not supplied. */
  emptyStateDescription?: ReactNode;
  /** Optional built-in empty-state action when `emptyState` is not supplied. */
  emptyStateAction?: ReactNode;
  /** Content rendered when `hasData` is true. */
  children: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Generic three-state wrapper for async data views: loading → empty → content.
 *
 * ```tsx
 * <AsyncView isLoading={isLoading} hasData={items.length > 0} loading={<Skeleton />} emptyState={<Empty />}>
 *   <MyList items={items} />
 * </AsyncView>
 * ```
 */
export function AsyncView({
  isLoading,
  hasData,
  loading,
  emptyState,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateAction,
  children,
}: AsyncViewProps) {
  if (isLoading && loading) return <>{loading}</>;
  if (!hasData && emptyState) return <>{emptyState}</>;
  if (
    !hasData &&
    (emptyStateTitle || emptyStateDescription || emptyStateIcon || emptyStateAction)
  ) {
    return (
      <EmptyState
        icon={emptyStateIcon}
        title={emptyStateTitle}
        description={emptyStateDescription}
        action={emptyStateAction}
      />
    );
  }
  return <>{children}</>;
}
