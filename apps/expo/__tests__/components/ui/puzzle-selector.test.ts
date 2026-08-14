import { describe, expect, it } from 'vitest';

import { pillTextVariants, pillVariants } from '@/components/ui/puzzle-selector';

describe('PuzzleSelector', () => {
  describe('pillVariants', () => {
    it('applies default (unselected) state classes', () => {
      const result = pillVariants({ state: 'default' });
      expect(result).toContain('border-border');
      expect(result).toContain('bg-surface');
    });

    it('applies selected state classes', () => {
      const result = pillVariants({ state: 'selected' });
      expect(result).toContain('border-primary');
      expect(result).toContain('bg-primary');
    });

    it('includes shared base classes on all pills', () => {
      const result = pillVariants();
      expect(result).toContain('rounded-full');
      expect(result).toContain('border');
      expect(result).toContain('px-md');
      expect(result).toContain('py-xs');
    });

    it('defaults to unselected state when no state is provided', () => {
      const result = pillVariants();
      expect(result).toContain('bg-surface');
      expect(result).not.toContain('bg-primary');
    });
  });

  describe('pillTextVariants', () => {
    it('applies default (unselected) text colour', () => {
      const result = pillTextVariants({ state: 'default' });
      expect(result).toContain('text-text');
    });

    it('applies selected text colour', () => {
      const result = pillTextVariants({ state: 'selected' });
      expect(result).toContain('text-primary-foreground');
    });

    it('defaults to unselected text colour when no state is provided', () => {
      const result = pillTextVariants();
      expect(result).toContain('text-text');
      expect(result).not.toContain('text-primary-foreground');
    });
  });
});
