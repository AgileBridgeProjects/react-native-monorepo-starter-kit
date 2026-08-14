import { describe, expect, it } from 'vitest';

import { alertTextVariants, alertVariants } from '@/components/ui/alert';

describe('Alert', () => {
  describe('alertVariants', () => {
    it('applies error variant by default', () => {
      const result = alertVariants();
      expect(result).toContain('bg-error/10');
      expect(result).toContain('border-error');
    });

    it('applies warning variant', () => {
      const result = alertVariants({ variant: 'warning' });
      expect(result).toContain('bg-warning/10');
      expect(result).toContain('border-warning');
    });

    it('applies info variant', () => {
      const result = alertVariants({ variant: 'info' });
      expect(result).toContain('bg-info/10');
      expect(result).toContain('border-info');
    });

    it('applies success variant', () => {
      const result = alertVariants({ variant: 'success' });
      expect(result).toContain('bg-success/10');
      expect(result).toContain('border-success');
    });

    it('includes shared base classes', () => {
      const result = alertVariants();
      expect(result).toContain('rounded-md');
      expect(result).toContain('px-md');
      expect(result).toContain('py-sm');
      expect(result).toContain('mb-md');
    });
  });

  describe('alertTextVariants', () => {
    it('applies error text by default', () => {
      const result = alertTextVariants();
      expect(result).toContain('text-error');
    });

    it('applies warning text', () => {
      const result = alertTextVariants({ variant: 'warning' });
      expect(result).toContain('text-warning');
    });

    it('applies info text', () => {
      const result = alertTextVariants({ variant: 'info' });
      expect(result).toContain('text-info');
    });

    it('applies success text', () => {
      const result = alertTextVariants({ variant: 'success' });
      expect(result).toContain('text-success');
    });

    it('includes text-sm base class', () => {
      const result = alertTextVariants();
      expect(result).toContain('text-sm');
    });
  });
});
