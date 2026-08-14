export interface ResolveEffectiveClubIdOptions {
  isPlatformAdmin: boolean;
  platformAdminClubId?: string | null;
  sessionClubId?: string | null;
  workspaceClubId?: string | null;
}

/**
 * Resolves the effective club scope for portal pages and datasources.
 *
 * Platform admins can impersonate/select any workspace club.
 * Non-platform admins are always locked to their backend-resolved session club
 * (with workspace fallback for transitional state).
 */
export function resolveEffectiveClubId({
  isPlatformAdmin,
  platformAdminClubId,
  sessionClubId,
  workspaceClubId,
}: ResolveEffectiveClubIdOptions): string | null {
  if (isPlatformAdmin) return platformAdminClubId ?? null;
  return sessionClubId ?? workspaceClubId ?? null;
}
