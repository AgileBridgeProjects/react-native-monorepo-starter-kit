import { reflectionTypeVisual } from '@lib/utils/reflection-type-visuals';
import { describe, expect, it } from 'vitest';

describe('reflectionTypeVisual', () => {
  it('returns a distinct icon for Survey and Homework', () => {
    expect(reflectionTypeVisual('Survey').icon).toBe('doc.text.fill');
    expect(reflectionTypeVisual('Homework').icon).toBe('book.fill');
  });

  it('returns a distinct icon for JournalPrompt', () => {
    expect(reflectionTypeVisual('JournalPrompt').icon).toBe('pencil');
  });

  it('falls back to the Survey visual for an unrecognised type', () => {
    expect(reflectionTypeVisual('SomethingNew')).toEqual(reflectionTypeVisual('Survey'));
  });
});
