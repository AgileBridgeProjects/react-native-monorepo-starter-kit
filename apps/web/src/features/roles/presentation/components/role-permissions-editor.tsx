'use client';

import type { Role } from '@features/roles/domain/entities/role';
import { usePermissionGroups } from '@features/roles/presentation/hooks/use-permission-groups';
import { useUpdateRolePermissions } from '@features/roles/presentation/hooks/use-update-role-permissions';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { CheckmarkIcon, ChevronRightIcon, ExpandLessIcon, SearchIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { confirm } from 'devextreme/ui/dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  DrawerFooter,
  DrawerPanel,
  GridCheckbox,
  Input,
  type TabOption,
  Tabs,
  toast,
} from '@/components/ui';
import { Typography } from '@/components/ui/typography';
import { useCurrentSession } from '@/features/auth/presentation/hooks/use-current-session';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function permissionAction(permission: string): string {
  const parts = permission.replace('StarterKit.', '').split('.');
  return parts[parts.length - 1];
}

function summaryMessage(count: number, total: number, t: (key: string) => string): string {
  if (total === 0 || count === 0) return t('roles:permissions.summaryNone');
  const pct = count / total;
  if (pct === 1) return t('roles:permissions.summaryFull');
  if (pct >= 0.67) return t('roles:permissions.summaryMost');
  if (pct >= 0.34) return t('roles:permissions.summarySome');
  return t('roles:permissions.summaryFew');
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RolePermissionsEditorProps {
  visible: boolean;
  onHide: () => void;
  onSaved: () => void;
  role: Role | null;
}

type FilterTab = 'all' | 'assigned' | 'unassigned';

// ─── Component ───────────────────────────────────────────────────────────────

export function RolePermissionsEditor({
  visible,
  onHide,
  onSaved,
  role,
}: RolePermissionsEditorProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const initialSelected = useRef<Set<string>>(new Set());

  const { hasPermission } = useCurrentSession();
  const canManage = hasPermission('StarterKit.Roles.Manage');

  const filterTabs = useMemo<ReadonlyArray<TabOption<FilterTab>>>(
    () => [
      { value: 'all', label: t('roles:permissions.filterAll') },
      { value: 'assigned', label: t('roles:permissions.filterAssigned') },
      { value: 'unassigned', label: t('roles:permissions.filterUnassigned') },
    ],
    [t],
  );

  const { data: permissionGroups = [] } = usePermissionGroups();
  const { mutate: updatePermissions, isPending } = useUpdateRolePermissions();

  useEffect(() => {
    if (visible && role) {
      const perms = new Set(role.permissions);
      setSelected(perms);
      initialSelected.current = new Set(perms);
      setSearch('');
      setFilter('all');
      setExpandedGroups(new Set());
    }
  }, [visible, role]);

  const totalPermissions = useMemo(
    () => permissionGroups.reduce((sum, g) => sum + g.permissions.length, 0),
    [permissionGroups],
  );

  const changesCount = useMemo(() => {
    const init = initialSelected.current;
    const added = [...selected].filter((p) => !init.has(p)).length;
    const removed = [...init].filter((p) => !selected.has(p)).length;
    return added + removed;
  }, [selected]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    return permissionGroups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter((p) => {
          const action = permissionAction(p.key).toLowerCase();
          const desc = (p.description ?? '').toLowerCase();
          const matchesSearch = !q || action.includes(q) || desc.includes(q);
          const matchesFilter =
            filter === 'all'
              ? true
              : filter === 'assigned'
                ? selected.has(p.key)
                : !selected.has(p.key);
          return matchesSearch && matchesFilter;
        }),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [permissionGroups, search, filter, selected]);

  function toggle(permission: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  const toggleGroup = useCallback((groupKeys: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allEnabled = groupKeys.every((k) => next.has(k));
      for (const key of groupKeys) {
        if (allEnabled) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }, []);

  function toggleGroupExpanded(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(permissionGroups.flatMap((g) => g.permissions.map((p) => p.key))));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function handleSave() {
    if (!role) return;

    if (selected.size === 0) {
      toast.error(t('roles:validation.noPermissions'), {
        duration: uiConfig.toast.errorDurationMs,
      });
      return;
    }

    const confirmed = await confirm(
      t('roles:confirm.permissions.message', { name: role.name }),
      t('roles:confirm.permissions.title'),
    );
    if (!confirmed) return;

    updatePermissions(
      { id: role.id, permissions: Array.from(selected) },
      {
        onSuccess: () => {
          toast.success(t('roles:toast.permissionsUpdated'), {
            duration: uiConfig.toast.durationMs,
          });
          onSaved();
        },
        onError: () => {
          toast.error(t('roles:toast.permissionsUpdateFailed'), {
            duration: uiConfig.toast.errorDurationMs,
          });
        },
      },
    );
  }

  const footer = (
    <DrawerFooter
      cancelLabel={t('common:actions.cancel')}
      onCancel={onHide}
      cancelDisabled={isPending}
      submitLabel={
        canManage
          ? changesCount > 0
            ? t('roles:permissions.saveChanges', { count: changesCount })
            : t('roles:permissions.save')
          : undefined
      }
      onSubmit={canManage ? () => void handleSave() : undefined}
      isLoading={isPending}
      disabled={changesCount === 0}
    />
  );

  return (
    <DrawerPanel
      visible={visible}
      onHide={onHide}
      title={t('roles:permissions.drawerTitle')}
      subtitle={role?.name ?? ''}
      bottomContent={footer}
      data-testid="role-permissions-editor"
    >
      <div className="flex flex-col gap-md">
        {/* Description */}
        <Typography variant="body-sm" className="text-text-muted">
          {t('roles:permissions.description')}
        </Typography>

        {/* Summary card */}
        <div className="flex items-center gap-md rounded-lg border border-border bg-surface px-md py-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
            <CheckmarkIcon
              size={iconSize.sm}
              className="text-primary-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Typography variant="label" className="font-semibold">
              {t('roles:permissions.summary', { count: selected.size, total: totalPermissions })}
            </Typography>
            <Typography variant="caption" className="block text-text-muted">
              {summaryMessage(selected.size, totalPermissions, t)}
            </Typography>
          </div>
        </div>

        {/* Search */}
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('roles:permissions.searchPlaceholder')}
          prefix={<SearchIcon size={iconSize.sm} className="text-text-muted" aria-hidden="true" />}
        />

        {/* Filter tabs */}
        <Tabs
          label={t('roles:permissions.filterLabel')}
          options={filterTabs}
          value={filter}
          onValueChanged={setFilter}
        />

        {/* Select all / Clear all */}
        {canManage && (
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
              {t('roles:permissions.selectAll')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              {t('roles:permissions.clearAll')}
            </Button>
          </div>
        )}

        {/* Permission groups */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface-elevated">
          {filteredGroups.map(({ group, permissions }, groupIndex) => {
            const allGroupKeys = (
              permissionGroups.find((g) => g.group === group)?.permissions ?? permissions
            ).map((p) => p.key);
            const enabledCount = allGroupKeys.filter((k) => selected.has(k)).length;
            const allEnabled = enabledCount === allGroupKeys.length;
            const someEnabled = enabledCount > 0 && !allEnabled;
            const isExpanded = expandedGroups.has(group);

            return (
              <div key={group} className={groupIndex > 0 ? 'border-t border-border' : undefined}>
                {/* Group header */}
                <div className="flex items-center gap-sm px-md py-sm">
                  <GridCheckbox
                    checked={allEnabled}
                    indeterminate={someEnabled}
                    onChange={() => toggleGroup(allGroupKeys)}
                    disabled={!canManage}
                    aria-label={t('roles:permissions.toggleGroup', { group })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => toggleGroupExpanded(group)}
                    className="flex flex-1 items-center justify-between gap-sm text-left"
                    aria-expanded={isExpanded}
                  >
                    <Typography variant="label" className="font-semibold text-text">
                      {group}
                    </Typography>
                    <div className="flex items-center gap-xs">
                      <Typography variant="caption" className="text-text-muted">
                        {enabledCount} of {allGroupKeys.length}
                      </Typography>
                      {isExpanded ? (
                        <ExpandLessIcon
                          size={iconSize.sm}
                          className="text-text"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronRightIcon
                          size={iconSize.sm}
                          className="text-text"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </Button>
                </div>

                {/* Individual permissions — shown when expanded */}
                {isExpanded && (
                  <div className="divide-y divide-border border-t border-border">
                    {permissions.map(({ key, description }) => {
                      const permissionInputId = `permission-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

                      return (
                        <label
                          key={key}
                          htmlFor={permissionInputId}
                          className={`flex items-center justify-between gap-md px-md py-sm transition-colors ${
                            canManage ? 'cursor-pointer hover:bg-surface' : 'cursor-default'
                          }`}
                        >
                          <div className="min-w-0">
                            <Typography variant="label">{permissionAction(key)}</Typography>
                            <Typography variant="caption" className="block text-text-muted">
                              {description}
                            </Typography>
                          </div>
                          <GridCheckbox
                            id={permissionInputId}
                            checked={selected.has(key)}
                            onChange={() => toggle(key)}
                            disabled={!canManage}
                            aria-label={t('roles:permissions.togglePermission', {
                              group,
                              action: permissionAction(key),
                            })}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DrawerPanel>
  );
}
