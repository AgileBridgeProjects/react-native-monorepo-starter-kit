import { resolveSingleSelectTeamIds } from '@features/users/presentation/utils/resolve-single-select-team-ids';
import { describe, expect, it } from 'vitest';

describe('resolveSingleSelectTeamIds', () => {
  describe('create mode (no existingTeamIds)', () => {
    it('returns a one-element list when a team is selected', () => {
      expect(resolveSingleSelectTeamIds('team-1')).toEqual(['team-1']);
    });

    it('returns undefined when nothing is selected — nothing to send yet', () => {
      expect(resolveSingleSelectTeamIds(undefined)).toBeUndefined();
      expect(resolveSingleSelectTeamIds('')).toBeUndefined();
    });
  });

  describe('edit mode (existingTeamIds provided)', () => {
    it('replaces the single existing team with the newly selected one', () => {
      expect(resolveSingleSelectTeamIds('team-2', ['team-1'])).toEqual(['team-2']);
    });

    it('returns an empty array when the select is cleared — not undefined ("leave unchanged")', () => {
      expect(resolveSingleSelectTeamIds(undefined, ['team-1'])).toEqual([]);
      expect(resolveSingleSelectTeamIds('', ['team-1'])).toEqual([]);
    });

    it('returns an empty array when clearing a user who already had no team', () => {
      expect(resolveSingleSelectTeamIds(undefined, [])).toEqual([]);
    });

    it('preserves teams beyond the first when changing the selection', () => {
      expect(resolveSingleSelectTeamIds('team-3', ['team-1', 'team-2'])).toEqual([
        'team-3',
        'team-2',
      ]);
    });

    it('preserves teams beyond the first when clearing the selection', () => {
      expect(resolveSingleSelectTeamIds(undefined, ['team-1', 'team-2', 'team-3'])).toEqual([
        'team-2',
        'team-3',
      ]);
    });

    it('is a no-op when the selection is unchanged', () => {
      expect(resolveSingleSelectTeamIds('team-1', ['team-1'])).toEqual(['team-1']);
    });
  });
});
