import { describe, expect, it } from 'vitest';
import { tagBoxValuesEqual } from '../dx-tagbox-value-changed';

describe('tagBoxValuesEqual', () => {
  it('returns true for two empty arrays', () => {
    expect(tagBoxValuesEqual([], [])).toBeTruthy();
  });

  it('returns true for identical single-item arrays', () => {
    expect(tagBoxValuesEqual(['a'], ['a'])).toBeTruthy();
  });

  it('returns true for identical multi-item arrays in the same order', () => {
    expect(tagBoxValuesEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBeTruthy();
  });

  it('returns false when lengths differ', () => {
    expect(tagBoxValuesEqual(['a'], ['a', 'b'])).toBeFalsy();
    expect(tagBoxValuesEqual(['a', 'b'], ['a'])).toBeFalsy();
  });

  it('returns false when an item differs at the same index', () => {
    expect(tagBoxValuesEqual(['a', 'b'], ['a', 'c'])).toBeFalsy();
  });

  it('returns false when the same items appear in a different order', () => {
    // Order matters here — this guard is a cheap positional check used to break a
    // devextreme-react re-render feedback loop, not a set-equality comparison.
    expect(tagBoxValuesEqual(['a', 'b'], ['b', 'a'])).toBeFalsy();
  });

  it('returns true for one empty array compared with itself twice', () => {
    const empty: string[] = [];
    expect(tagBoxValuesEqual(empty, empty)).toBeTruthy();
  });
});
