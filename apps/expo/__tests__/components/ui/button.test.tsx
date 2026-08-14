import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';

import { Button, buttonTextVariants, buttonVariants } from '@/components/ui/button';

describe('Button', () => {
  describe('buttonVariants', () => {
    it('applies default variant and size (md)', () => {
      const result = buttonVariants();
      expect(result).toContain('bg-primary');
      expect(result).toContain('px-lg');
      expect(result).toContain('py-sm');
    });

    it('applies secondary variant', () => {
      const result = buttonVariants({ variant: 'secondary' });
      expect(result).toContain('bg-surface');
      expect(result).toContain('border-border');
    });

    it('applies outline variant', () => {
      const result = buttonVariants({ variant: 'outline' });
      expect(result).toContain('border-primary');
      expect(result).toContain('bg-transparent');
    });

    it('applies ghost variant', () => {
      const result = buttonVariants({ variant: 'ghost' });
      expect(result).toContain('bg-transparent');
    });

    it('applies destructive variant', () => {
      const result = buttonVariants({ variant: 'destructive' });
      expect(result).toContain('bg-error');
    });

    it('applies sm size', () => {
      const result = buttonVariants({ size: 'sm' });
      expect(result).toContain('px-md');
      expect(result).toContain('py-xs');
    });

    it('applies lg size', () => {
      const result = buttonVariants({ size: 'lg' });
      expect(result).toContain('px-xl');
      expect(result).toContain('py-md');
    });

    it('applies auth size', () => {
      const result = buttonVariants({ size: 'auth' });
      expect(result).toContain('px-xl');
      expect(result).toContain('rounded-auth-control');
    });

    it('includes shared base classes', () => {
      const result = buttonVariants();
      expect(result).toContain('flex-row');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-center');
      expect(result).toContain('rounded-xl');
    });

    it('includes active:opacity-80 for press feedback', () => {
      const result = buttonVariants();
      expect(result).toContain('active:opacity-80');
    });

    it('applies fullWidth variant', () => {
      const result = buttonVariants({ fullWidth: true });
      expect(result).toContain('w-full');
    });

    it('does not include w-full by default', () => {
      const result = buttonVariants();
      expect(result).not.toContain('w-full');
    });
  });

  describe('buttonTextVariants', () => {
    it('applies default text variant (md size — text-base)', () => {
      const result = buttonTextVariants();
      expect(result).toContain('text-primary-foreground');
      expect(result).toContain('text-base');
    });

    it('applies secondary text variant', () => {
      const result = buttonTextVariants({ variant: 'secondary' });
      expect(result).toContain('text-text');
    });

    it('applies outline text variant', () => {
      const result = buttonTextVariants({ variant: 'outline' });
      expect(result).toContain('text-primary');
    });

    it('applies ghost text variant', () => {
      const result = buttonTextVariants({ variant: 'ghost' });
      expect(result).toContain('text-primary');
    });

    it('applies destructive text variant', () => {
      const result = buttonTextVariants({ variant: 'destructive' });
      expect(result).toContain('text-primary-foreground');
    });

    it('applies sm text size', () => {
      const result = buttonTextVariants({ size: 'sm' });
      expect(result).toContain('text-sm');
    });

    it('applies lg text size', () => {
      const result = buttonTextVariants({ size: 'lg' });
      expect(result).toContain('text-lg');
    });

    it('applies auth text size', () => {
      const result = buttonTextVariants({ size: 'auth' });
      expect(result).toContain('text-lg');
    });

    it('includes font-semibold base class', () => {
      const result = buttonTextVariants();
      expect(result).toContain('font-semibold');
    });
  });

  describe('label rendering', () => {
    it('caps a string label to one line, so a label too wide for the button ellipsises instead of clipping to a top-aligned wrap', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Button size="auth">Overwrite and import</Button>);
      });
      expect(renderer?.root.findAllByType('Text')[0]?.props.numberOfLines).toBe(1);
    });
  });

  describe('style prop', () => {
    it('applies the authControlHeight token as an inline style for the auth size — 55px does not align to the 4px spacing grid, so it cannot be a Tailwind class', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Button size="auth">Continue</Button>);
      });
      expect(renderer?.root.findAllByType('Pressable')[0]?.props.style).toEqual([
        { height: 55 },
        undefined,
      ]);
    });

    it('does not apply an inline style by default — size defaults to md, not auth', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Button>Continue</Button>);
      });
      expect(renderer?.root.findAllByType('Pressable')[0]?.props.style).toBeUndefined();
    });

    it('does not apply an inline style for a non-auth size — geometry comes entirely from Tailwind classes', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Button size="md">Continue</Button>);
      });
      expect(renderer?.root.findAllByType('Pressable')[0]?.props.style).toBeUndefined();
    });

    it('forwards a caller-provided style unchanged', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(
          <Button size="md" style={{ marginTop: 4 }}>
            Continue
          </Button>,
        );
      });
      expect(renderer?.root.findAllByType('Pressable')[0]?.props.style).toEqual({ marginTop: 4 });
    });
  });
});
