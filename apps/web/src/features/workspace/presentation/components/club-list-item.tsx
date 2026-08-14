'use client';

import type { WorkspaceClubSummary } from '@features/workspace/domain/types/workspace-club-summary';
import { useTranslation } from '@lib/i18n';
import { cn } from '@starterkit/shared';
import { Typography } from '@/components/ui/typography';
import { ClubAvatar } from './club-avatar';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ClubListItemProps {
  club: WorkspaceClubSummary;
  deptCount: number;
  isSelected: boolean;
  onSelect: (club: WorkspaceClubSummary) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ClubListItem({ club, deptCount, isSelected, onSelect }: ClubListItemProps) {
  const { t } = useTranslation();

  return (
    // Raw <button> required: DX Button does not support role="option" + aria-selected for listbox items
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(club)}
      className={cn(
        'my-0.5 flex w-full items-center gap-md rounded-lg px-md py-sm text-left transition-colors hover:bg-black/5 focus:outline-none',
        isSelected ? 'border border-primary/30 bg-primary/5' : 'border border-transparent',
      )}
    >
      <ClubAvatar logoUrl={club.logoUrl} name={club.name} variant="on-surface" />
      <div className="min-w-0 flex-1">
        <Typography
          variant="body-sm"
          className={cn(
            'truncate',
            isSelected ? 'font-semibold text-primary' : 'font-medium text-text',
          )}
        >
          {club.name}
        </Typography>
        <Typography variant="caption" className="text-text-muted">
          {t('workspace:switcher.teamCount', { count: deptCount })}
        </Typography>
      </div>
    </button>
  );
}
