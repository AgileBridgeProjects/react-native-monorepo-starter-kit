import { extractClubId, type HasAppMetadata } from '@starterkit/shared';
import { describe, expect, it } from 'vitest';

// extractClubId now reads club_id from a GoTrue session's
// `user.app_metadata` (or an object matching `HasAppMetadata`).
function makeSession(appMetadata: Record<string, unknown>): HasAppMetadata {
  return { user: { app_metadata: appMetadata } } as unknown as HasAppMetadata;
}

describe('extractClubId', () => {
  it('returns clubId when club_id is a string', () => {
    const session = makeSession({ club_id: 'club-abc' });
    expect(extractClubId(session)).toBe('club-abc');
  });

  it('returns undefined when club_id is absent', () => {
    const session = makeSession({});
    expect(extractClubId(session)).toBeUndefined();
  });

  it('returns undefined when club_id is not a string', () => {
    const session = makeSession({ club_id: 12345 });
    expect(extractClubId(session)).toBeUndefined();
  });

  it('returns undefined when club_id is null', () => {
    const session = makeSession({ club_id: null });
    expect(extractClubId(session)).toBeUndefined();
  });
});
