'use client';

import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import type { WorkspaceClubSummary } from '@features/workspace/domain/types/workspace-club-summary';
import { queryCacheConfig } from '@lib/http/query-config';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { SearchIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { useQuery } from '@tanstack/react-query';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { PaginationFooter } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/ui/typography';
import { useClickOutside } from '@/lib/hooks/use-click-outside';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { ClubListItem } from './club-list-item';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ClubFlyoutProps {
  selectedClubId: string | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onSelect: (club: WorkspaceClubSummary) => void;
  onClose: () => void;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ClubListSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-sm py-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
          key={i}
          className="flex items-center gap-md rounded-lg px-md py-sm"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ClubFlyout({ selectedClubId, triggerRef, onSelect, onClose }: ClubFlyoutProps) {
  const { t } = useTranslation();
  const flyoutRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, uiConfig.grid.searchDebounceMs);
    return () => clearTimeout(id);
  }, [search]);

  // Paginated club list
  const { data: clubResult, isLoading: clubsLoading } = useQuery({
    queryKey: ['clubs-flyout', currentPage, debouncedSearch],
    queryFn: () =>
      clubDatasource.list(currentPage, uiConfig.grid.flyoutPageSize, debouncedSearch || undefined),
    ...queryCacheConfig.clubPicker,
  });

  const clubs = clubResult?.items ?? [];
  const totalCount = clubResult?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / uiConfig.grid.flyoutPageSize));

  // Close on Escape / outside-click
  useEscapeKey(onClose, true);
  useClickOutside([flyoutRef, triggerRef], onClose, true);

  // Focus search input on mount
  useEffect(() => {
    const focusId = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(focusId);
  }, []);

  const clubListContent = clubsLoading ? (
    <ClubListSkeleton />
  ) : clubs.length === 0 ? (
    <div className="flex items-center justify-center py-lg">
      <Typography variant="body-sm" className="text-text-muted">
        {t('common:noResults')}
      </Typography>
    </div>
  ) : (
    clubs.map((club) => (
      <ClubListItem
        key={club.id}
        club={{
          id: club.id,
          name: club.name,
          logoUrl: club.logoUrl ?? null,
        }}
        deptCount={club.teamCount ?? 0}
        isSelected={club.id === selectedClubId}
        onSelect={onSelect}
      />
    ))
  );

  return (
    <div
      ref={flyoutRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('workspace:switcher.selectClub')}
      className="fixed bottom-0 top-0 z-50 flex flex-col border-s border-border bg-surface shadow-xl start-60 w-75"
      data-testid="club-flyout"
    >
      {/* Search */}
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center gap-sm px-md py-md">
          <SearchIcon
            size={iconSize.sm}
            className="shrink-0 text-text-muted"
            aria-hidden="true"
            aria-label={undefined}
          />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('workspace:switcher.searchClubs')}
            className="w-full bg-transparent text-base text-text placeholder:text-text-muted outline-none"
            aria-label={t('workspace:switcher.searchClubs')}
          />
        </div>
      </div>

      {/* Club list */}
      <div
        className="flex-1 overflow-y-auto px-sm"
        role="listbox"
        aria-label={t('workspace:switcher.allClubs')}
      >
        {clubListContent}
      </div>

      {/* Pagination footer */}
      {totalCount > 0 && (
        <div className="shrink-0">
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      )}
    </div>
  );
}
