import { describe, expect, it } from 'vitest';

import { typographyVariants } from '@/components/ui/typography';

describe('Typography', () => {
  describe('typographyVariants', () => {
    it('applies h1 variant with the heading font', () => {
      const result = typographyVariants({ variant: 'h1' });
      expect(result).toContain('text-4xl');
      expect(result).toContain('font-heading');
      expect(result).toContain('text-text');
    });

    it('applies h2 variant with the heading font', () => {
      const result = typographyVariants({ variant: 'h2' });
      expect(result).toContain('text-2xl');
      expect(result).toContain('font-heading');
    });

    it('applies h3 variant with the heading font', () => {
      const result = typographyVariants({ variant: 'h3' });
      expect(result).toContain('text-xl');
      expect(result).toContain('font-heading');
    });

    it('applies h4 variant with the heading font', () => {
      const result = typographyVariants({ variant: 'h4' });
      expect(result).toContain('text-lg');
      expect(result).toContain('font-heading');
    });

    it('applies body variant by default with the body font', () => {
      const result = typographyVariants();
      expect(result).toContain('text-base');
      expect(result).toContain('font-body');
      expect(result).toContain('text-text');
    });

    it('applies body-sm variant with the body font', () => {
      const result = typographyVariants({ variant: 'body-sm' });
      expect(result).toContain('text-sm');
      expect(result).toContain('font-body');
    });

    it('applies label variant', () => {
      const result = typographyVariants({ variant: 'label' });
      expect(result).toContain('text-sm');
      expect(result).toContain('font-medium');
      expect(result).toContain('text-text-secondary');
    });

    it('applies caption variant with the body font', () => {
      const result = typographyVariants({ variant: 'caption' });
      expect(result).toContain('text-xs');
      expect(result).toContain('font-body');
      expect(result).toContain('text-text-muted');
    });
  });
});
