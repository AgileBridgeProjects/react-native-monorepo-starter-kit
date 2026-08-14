/**
 * Translates the single "Team" select's value into the `teamIds` list the API expects for roles
 * that don't use the many-to-many Team Assignment section (the identity split — UserTeams is the sole
 * source of truth, there is no standalone `teamId` field on the request anymore).
 *
 * `existingTeamIds` is only passed in edit mode. Two things it protects against:
 * - An explicitly cleared select must send `[]` to actually clear the team — `undefined` means
 *   "leave unchanged" to the API, which would silently no-op the clear.
 * - This control only ever shows/edits the user's *first* team. If the underlying data already
 *   holds more (not reachable through this UI, but not prevented by it either — e.g. a user
 *   promoted from a multi-team role), preserve the rest instead of collapsing them on save.
 */
export function resolveSingleSelectTeamIds(
  teamId: string | undefined,
  existingTeamIds?: string[],
): string[] | undefined {
  const otherTeamIds = existingTeamIds?.slice(1) ?? [];
  if (teamId) return [teamId, ...otherTeamIds];
  return existingTeamIds ? otherTeamIds : undefined;
}
