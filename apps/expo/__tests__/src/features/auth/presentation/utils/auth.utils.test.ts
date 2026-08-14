import { getUserInitials } from '@features/auth/presentation/utils/auth.utils';
import { describe, expect, it } from 'vitest';

describe('getUserInitials', () => {
  it('returns the first two initials, uppercased, for a multi-word name', () => {
    expect(getUserInitials('Alice Smith')).toBe('AS');
  });

  it('uppercases lowercase names', () => {
    expect(getUserInitials('john doe')).toBe('JD');
  });

  it('returns a single initial for a single-word name', () => {
    expect(getUserInitials('Cher')).toBe('C');
  });

  it('caps the result at two initials for names with three or more words', () => {
    expect(getUserInitials('Mary Jane Watson')).toBe('MJ');
  });

  it('returns an empty string for an empty name', () => {
    expect(getUserInitials('')).toBe('');
  });

  it('collapses multiple spaces without producing an empty initial', () => {
    // 'Alice  Smith' splits to ['Alice', '', 'Smith']; the empty part has no letter and is
    // filtered out before initials are taken, so it never reaches the join.
    expect(getUserInitials('Alice  Smith')).toBe('AS');
  });

  it('skips a leading jersey number and takes initials from the name only', () => {
    // Some rosters store the jersey number directly in the display name. '#10' has no letter
    // and is filtered out, rather than contributing '#' as a garbage initial.
    expect(getUserInitials('#10 Jadyn Grant-Dial')).toBe('JG');
  });

  it('skips a standalone number with no letters entirely', () => {
    expect(getUserInitials('42')).toBe('');
  });

  it('is deterministic for the same input', () => {
    expect(getUserInitials('Alice Smith')).toBe(getUserInitials('Alice Smith'));
  });

  it('supports names starting with non-ASCII letters', () => {
    expect(getUserInitials('Élodie Łukasz')).toBe('ÉŁ');
  });
});
