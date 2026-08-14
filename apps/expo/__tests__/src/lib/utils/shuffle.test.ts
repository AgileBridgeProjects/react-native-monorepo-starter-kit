import { createDeterministicRandom } from '@lib/utils/deterministic-random';
import { shuffle } from '@lib/utils/shuffle';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const snapshot = [...original];
    shuffle(original);
    expect(original).toEqual(snapshot);
  });

  it('returns a new array reference', () => {
    const original = [1, 2, 3];
    expect(shuffle(original)).not.toBe(original);
  });

  it('preserves all elements (is a permutation of the input)', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffle(original);
    expect(result).toHaveLength(original.length);
    expect([...result].sort((a, b) => a - b)).toEqual(original);
  });

  it('preserves duplicate elements with their multiplicity', () => {
    const original = ['a', 'a', 'b', 'b', 'b', 'c'];
    const result = shuffle(original);
    expect([...result].sort()).toEqual([...original].sort());
  });

  it('returns an empty array for empty input', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('returns a single-element array unchanged', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('produces a deterministic ordering when Math.random is seeded', () => {
    const seededA = createDeterministicRandom(2026);
    const seededB = createDeterministicRandom(2026);

    const spyA = vi.spyOn(Math, 'random').mockImplementation(seededA);
    const resultA = shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    spyA.mockRestore();

    vi.spyOn(Math, 'random').mockImplementation(seededB);
    const resultB = shuffle([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(resultA).toEqual(resultB);
  });

  it('applies Fisher-Yates with a known random sequence', () => {
    // With Math.random always 0, each swap index j = floor(0 * (i+1)) = 0.
    // Starting [A,B,C]: i=2 swap(2,0) → [C,B,A]; i=1 swap(1,0) → [B,C,A].
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffle(['A', 'B', 'C'])).toEqual(['B', 'C', 'A']);
  });

  it('leaves the array in original order when each swap is a no-op', () => {
    // Math.random just under 1 → j = floor(0.999 * (i+1)) = i → swap(i, i) is a no-op.
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999);
    expect(shuffle([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('accepts a readonly array input', () => {
    const original: readonly number[] = [1, 2, 3];
    expect(shuffle(original)).toHaveLength(3);
  });
});
