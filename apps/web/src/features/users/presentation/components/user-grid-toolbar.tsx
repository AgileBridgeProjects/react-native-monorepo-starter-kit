'use client';

import { useTranslation } from '@lib/i18n';
import { BlockIcon, CheckIcon, CloseIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import SelectBox from 'devextreme-react/select-box';
import { Button, FilterField, GridFilterMenu, GridSearchBox, Typography } from '@/components/ui';
import type { SetupStatus } from '@/proxy/models';
import type { LabelledOption } from '@/types/select-option';

interface UserGridToolbarProps {
  // Normal mode — search
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  // Filters
  statusFilter: boolean | undefined;
  onStatusFilterChange: (value: boolean | undefined) => void;
  statusOptions: LabelledOption<boolean | undefined>[];
  roleFilter: string | undefined;
  onRoleFilterChange: (value: string | undefined) => void;
  roleOptions: LabelledOption<string | undefined>[];
  setupStatusFilter: SetupStatus | undefined;
  onSetupStatusFilterChange: (value: SetupStatus | undefined) => void;
  setupStatusOptions: LabelledOption<SetupStatus | undefined>[];
  activeFilterCount: number;
  onClearFilters: () => void;
  // Selection mode
  selectedCount: number;
  showEnable: boolean;
  showDisable: boolean;
  isBulkPending?: boolean;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkToggle: () => void;
  onClearSelection: () => void;
}

export function UserGridToolbar({
  searchText,
  onSearchTextChange,
  onSearchSubmit,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  setupStatusFilter,
  onSetupStatusFilterChange,
  setupStatusOptions,
  activeFilterCount,
  onClearFilters,
  selectedCount,
  showEnable,
  showDisable,
  isBulkPending,
  onBulkEnable,
  onBulkDisable,
  onBulkToggle,
  onClearSelection,
}: UserGridToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount > 0) {
    const showEnableDisable = showEnable && showDisable;

    const bulkActions = showEnableDisable ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={onBulkToggle}
        isLoading={isBulkPending}
        disabled={isBulkPending}
      >
        <CheckIcon size={iconSize.sm} />
        {t('users:selection.bulkEnableDisable')}
      </Button>
    ) : (
      <>
        {showEnable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBulkEnable}
            isLoading={isBulkPending}
            disabled={isBulkPending}
            className="text-success hover:bg-success/10"
          >
            <CheckIcon size={iconSize.sm} />
            {t('users:selection.bulkEnable')}
          </Button>
        )}
        {showDisable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBulkDisable}
            isLoading={isBulkPending}
            disabled={isBulkPending}
            className="text-error hover:bg-error/10"
          >
            <BlockIcon size={iconSize.sm} />
            {t('users:selection.bulkDisable')}
          </Button>
        )}
      </>
    );

    return (
      <div className="flex items-center gap-md border-b border-border bg-primary/[0.04] px-md py-sm">
        <div className="flex shrink-0 items-center gap-sm">
          <Typography variant="body-sm" className="font-semibold text-text">
            {t('users:selection.selectedCount', { count: selectedCount })}
          </Typography>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-text-muted hover:text-text"
          >
            <CloseIcon size={iconSize.sm} />
            {t('users:selection.clearSelection')}
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex shrink-0 items-center gap-xs">{bulkActions}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-sm border-b border-border px-md py-sm">
      <div className="flex-1">
        <GridSearchBox
          value={searchText}
          onValueChange={onSearchTextChange}
          onSearch={onSearchSubmit}
        />
      </div>

      <GridFilterMenu activeCount={activeFilterCount} onClearAll={onClearFilters}>
        <FilterField label={t('users:filter.status')}>
          <SelectBox
            items={statusOptions}
            displayExpr="label"
            valueExpr="value"
            value={statusFilter}
            onValueChanged={(e) => onStatusFilterChange(e.value)}
            stylingMode="outlined"
            width="100%"
            aria-label={t('users:filter.status')}
          />
        </FilterField>

        <FilterField label={t('users:filter.role')}>
          <SelectBox
            items={roleOptions}
            displayExpr="label"
            valueExpr="value"
            value={roleFilter}
            onValueChanged={(e) => onRoleFilterChange(e.value)}
            stylingMode="outlined"
            width="100%"
            aria-label={t('users:filter.role')}
          />
        </FilterField>

        <FilterField label={t('users:filter.setupStatus')}>
          <SelectBox
            items={setupStatusOptions}
            displayExpr="label"
            valueExpr="value"
            value={setupStatusFilter}
            onValueChanged={(e) => onSetupStatusFilterChange(e.value)}
            stylingMode="outlined"
            width="100%"
            aria-label={t('users:filter.setupStatus')}
          />
        </FilterField>
      </GridFilterMenu>
    </div>
  );
}
