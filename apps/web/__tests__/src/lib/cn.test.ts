import { cn } from '@lib/cn';
import { describe, expect, it } from 'vitest';

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'included')).toBe('base included');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge resolves conflicts: bg-red-500 should be overridden
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('ignores undefined and null values', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('handles array inputs', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });
});
