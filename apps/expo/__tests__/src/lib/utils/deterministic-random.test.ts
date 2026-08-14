import { createDeterministicRandom, hashStringToSeed } from '@lib/utils/deterministic-random';
import { describe, expect, it } from 'vitest';

describe('hashStringToSeed', () => {
  it('returns a stable unsigned 32-bit integer for a given string', () => {
    const seed = hashStringToSeed('hello');
    expect(Number.isInteger(seed)).toBeTruthy();
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });

  it('is deterministic — same string yields same seed', () => {
    expect(hashStringToSeed('game-on-2026')).toBe(hashStringToSeed('game-on-2026'));
  });

  it('produces different seeds for different strings', () => {
    expect(hashStringToSeed('alpha')).not.toBe(hashStringToSeed('beta'));
  });

  it('is order-sensitive (different from a permutation of the same characters)', () => {
    expect(hashStringToSeed('ab')).not.toBe(hashStringToSeed('ba'));
  });

  it('handles the empty string by returning the unsigned offset basis', () => {
    // FNV offset basis 2166136261 with no mixing, coerced to unsigned 32-bit.
    expect(hashStringToSeed('')).toBe(2166136261 >>> 0);
  });

  it('handles unicode / multi-byte characters without throwing', () => {
    expect(() => hashStringToSeed('café — 🎮')).not.toThrow();
    expect(Number.isInteger(hashStringToSeed('café — 🎮'))).toBeTruthy();
  });
});

describe('createDeterministicRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createDeterministicRandom(42);
    const b = createDeterministicRandom(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createDeterministicRandom(1);
    const b = createDeterministicRandom(2);
    expect(a()).not.toBe(b());
  });

  it('returns values in the [0, 1) range', () => {
    const rand = createDeterministicRandom(hashStringToSeed('range-check'));
    for (let i = 0; i < 1000; i++) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('advances state across calls (consecutive values differ)', () => {
    const rand = createDeterministicRandom(7);
    const first = rand();
    const second = rand();
    expect(first).not.toBe(second);
  });

  it('has an approximately uniform distribution across quartiles', () => {
    const rand = createDeterministicRandom(123456);
    const buckets = [0, 0, 0, 0];
    const samples = 4000;
    for (let i = 0; i < samples; i++) {
      buckets[Math.min(3, Math.floor(rand() * 4))]++;
    }
    const expected = samples / 4;
    for (const count of buckets) {
      // Each quartile should be within ±25% of the expected count.
      expect(count).toBeGreaterThan(expected * 0.75);
      expect(count).toBeLessThan(expected * 1.25);
    }
  });

  it('pairs with hashStringToSeed for end-to-end determinism', () => {
    const seed = hashStringToSeed('seed-string');
    const a = createDeterministicRandom(seed);
    const b = createDeterministicRandom(hashStringToSeed('seed-string'));
    expect(a()).toBe(b());
  });

  it('handles a zero seed', () => {
    const rand = createDeterministicRandom(0);
    const value = rand();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
