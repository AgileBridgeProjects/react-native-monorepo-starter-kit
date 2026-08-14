'use client';

import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import { resolveEffectiveClubId } from '@features/workspace/domain/effective-club';
import { useWorkspaceStore } from '@/store/workspace-store';

/**
 * Returns the effective club id for the active user/session.
 *
 * Platform admins use the currently selected workspace club.
 * Non-platform admins are always scoped to their own session club.
 */
export function useEffectiveClubId(platformAdminClubId?: string | null): string | null {
  const { hasPermission, clubId: sessionClubId } = useCurrentSession();
  const workspaceClubId = useWorkspaceStore((s) => s.clubId);

  return resolveEffectiveClubId({
    isPlatformAdmin: hasPermission('StarterKit.Platform.Admin'),
    platformAdminClubId: platformAdminClubId ?? workspaceClubId,
    sessionClubId,
    workspaceClubId,
  });
}
