'use client';

import { SearchIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { useId } from 'react';
import { DeptSharingSummaryFooter } from './dept-sharing-summary-footer';
import { GridCheckbox } from './grid-checkbox';
import { Input } from './input';
import { PaginationFooter } from './pagination-footer';
import { SelectedDeptChips } from './selected-dept-chips';
import { Skeleton } from './skeleton';
import { Typography } from './typography';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SharableEntity {
  id: string;
  name: string;
}

export interface EntitySharingPickerProps<T extends SharableEntity> {
  /** Current page of server-searched, server-paginated items — filtering/paging is the
   *  caller's responsibility (see the datasource `list` call in the feature wrapper). */
  items: T[];
  isLoading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAllOnPage: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  /** Names of every selected id this session has fetched a page for — lets the chips row
   *  still show a name for a selection that has scrolled out of the current page/search. */
  selectedNamesById: Record<string, string>;
  search: string;
  onSearchChange: (value: string) => void;
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  searchPlaceholder: string;
  pickerLabel: string;
  selectAllOnPageLabel: string;
  toggleItemLabel: (name: string) => string;
  noResultsLabel: string;
  selectedCountLabel: string;
  clearAllLabel: string;
  summaryLabel: string;
}

// ─── Loading state ─────────────────────────────────────────────────────────

function EntitySharingPickerSkeleton() {
  return (
    <div className="flex flex-col gap-sm px-md py-sm">
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
        <Skeleton key={i} className="h-5 w-full rounded" />
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Debounced-search-over-a-paginated-checkbox-list sharing picker — the pattern the legacy
 * an earlier admin portal used for sharing Topics/Games to departments, generalised to any
 * `{id, name}` entity so a second feature (reflection templates → clubs, and whatever comes
 * next) can reuse it instead of re-implementing the same list/chips/pagination wiring.
 *
 * Entity-agnostic by design: no datasource, i18n namespace, or entity-specific copy lives
 * here — the caller owns fetching (search debounce, `useQuery`, pagination state) and passes
 * every label as a prop. See `ClubSharingPicker` for a concrete wrapper.
 */
export function EntitySharingPicker<T extends SharableEntity>({
  items,
  isLoading,
  selectedIds,
  onToggle,
  onToggleAllOnPage,
  onRemove,
  onClearAll,
  selectedNamesById,
  search,
  onSearchChange,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  searchPlaceholder,
  pickerLabel,
  selectAllOnPageLabel,
  toggleItemLabel,
  noResultsLabel,
  selectedCountLabel,
  clearAllLabel,
  summaryLabel,
}: EntitySharingPickerProps<T>) {
  const listId = useId();
  const selected = new Set(selectedIds);
  const isAllOnPageSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  const selectedForChips = selectedIds.flatMap((id) =>
    selectedNamesById[id] ? [{ id, name: selectedNamesById[id] }] : [],
  );

  return (
    <div className="space-y-sm">
      <Input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        prefix={<SearchIcon size={iconSize.sm} className="text-text-muted" aria-hidden="true" />}
        aria-label={searchPlaceholder}
      />

      <SelectedDeptChips
        selectedDepts={selectedForChips}
        totalCount={selectedIds.length}
        onRemove={onRemove}
        onClearAll={onClearAll}
        selectedCountLabel={selectedCountLabel}
        clearAllLabel={clearAllLabel}
      />

      <fieldset
        className="m-0 max-h-80 overflow-y-auto rounded-lg border border-border p-0"
        id={listId}
      >
        <legend className="sr-only">{pickerLabel}</legend>
        {isLoading && <EntitySharingPickerSkeleton />}
        {!isLoading && items.length === 0 && (
          <Typography variant="body-sm" className="block px-md py-lg text-center text-text-muted">
            {noResultsLabel}
          </Typography>
        )}
        {!isLoading && items.length > 0 && (
          <div className="divide-y divide-border">
            <label
              htmlFor={`${listId}-select-all`}
              className="flex cursor-pointer items-center gap-md px-md py-sm hover:bg-surface"
            >
              <GridCheckbox
                id={`${listId}-select-all`}
                checked={isAllOnPageSelected}
                onChange={onToggleAllOnPage}
                aria-label={selectAllOnPageLabel}
              />
              <Typography variant="body-sm" className="font-semibold text-text-secondary">
                {selectAllOnPageLabel}
              </Typography>
            </label>
            {items.map((item) => {
              const inputId = `${listId}-item-${item.id}`;
              return (
                <label
                  key={item.id}
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center gap-md px-md py-sm hover:bg-surface"
                >
                  <GridCheckbox
                    id={inputId}
                    checked={selected.has(item.id)}
                    onChange={() => onToggle(item.id)}
                    aria-label={toggleItemLabel(item.name)}
                  />
                  <Typography variant="body-sm">{item.name}</Typography>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      {totalPages > 1 && (
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={onPreviousPage}
          onNext={onNextPage}
        />
      )}

      <DeptSharingSummaryFooter
        deptCount={selectedIds.length}
        employeeCount={0}
        deptsLabel={summaryLabel}
        employeesLabel=""
      />
    </div>
  );
}
