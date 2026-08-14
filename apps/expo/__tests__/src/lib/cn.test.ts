import { describe, expect, it } from 'vitest';

import { cn } from '@/src/lib/cn';

describe('cn()', () => {
  it('merges multiple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('handles undefined and null values', () => {
    expect(cn('base', undefined, null, 'extra')).toBe('base extra');
  });

  it('handles array input', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
  });

  it('returns empty string for no input', () => {
    expect(cn()).toBe('');
  });

  it('resolves conflicting color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
