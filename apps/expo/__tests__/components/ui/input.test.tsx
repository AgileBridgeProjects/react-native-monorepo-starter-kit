import { View } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { Input, inputVariants } from '@/components/ui/input';

let reducedMotion = false;
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => reducedMotion }));

describe('Input', () => {
  describe('inputVariants', () => {
    it('applies default state', () => {
      const result = inputVariants();
      expect(result).toContain('border-transparent');
    });

    it('applies error state', () => {
      const result = inputVariants({ state: 'error' });
      expect(result).toContain('border-error');
    });

    it('applies focused state', () => {
      const result = inputVariants({ state: 'focused' });
      expect(result).toContain('border-primary');
    });

    it('includes shared base classes, defaulting to the dark treatment', () => {
      const result = inputVariants();
      // `outlinedDark` is the default now that the light `filled` variant is gone: every screen
      // in this app is dark, so a caller who omits the prop must not get a light-on-light field.
      expect(result).toContain('bg-brand-blue-input-fill');
      expect(result).toContain('rounded-xl');
      expect(result).toContain('px-md');
      expect(result).toContain('h-12');
      expect(result).toContain('text-text');
      expect(result).toContain('text-base');
    });

    it('does not include error border in default state', () => {
      const result = inputVariants({ state: 'default' });
      expect(result).not.toContain('border-error');
      expect(result).not.toContain('border-primary');
    });

    it('applies disabled state with reduced opacity', () => {
      const result = inputVariants({ state: 'disabled' });
      expect(result).toContain('border-transparent');
      expect(result).toContain('opacity-50');
    });

    it('applies the outlinedDark variant on any dark surface, with no visible border', () => {
      // ONE dark variant, not one per surface: the fill is a translucent white overlay, so it
      // lifts whatever is behind it and reads correctly on a screen, a card and a bottom sheet
      // alike. Two opaque navies were tried first and each was invisible on one of those.
      const result = inputVariants({ variant: 'outlinedDark' });
      expect(result).toContain('bg-brand-blue-input-fill');
      expect(result).toContain('border-transparent');
      expect(result).not.toContain('border-white');
      expect(result).toContain('text-white');
    });

    it('applies the auth size — rounded-auth-control pill radius, shared across screens', () => {
      const result = inputVariants({ size: 'auth' });
      expect(result).toContain('rounded-auth-control');
    });

    it('defaults to the standard size (h-12, rounded-xl) when size is omitted', () => {
      const result = inputVariants();
      expect(result).toContain('h-12');
      expect(result).toContain('rounded-xl');
    });
  });

  describe('style prop', () => {
    it('applies the authControlHeight token as an inline style for the auth size — 52px does not align to the 4px spacing grid, so it cannot be a Tailwind class', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input size="auth" />);
      });
      expect(renderer?.root.findByType('TextInput').props.style).toEqual([
        { height: 52 },
        undefined,
      ]);
    });

    it('does not apply an inline style for the default size — geometry comes entirely from Tailwind classes', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input />);
      });
      expect(renderer?.root.findByType('TextInput').props.style).toBeUndefined();
    });

    it('forwards a caller-provided style unchanged', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input style={{ marginTop: 4 }} />);
      });
      expect(renderer?.root.findByType('TextInput').props.style).toEqual({ marginTop: 4 });
    });
  });

  describe('floatingLabel', () => {
    // Known limitation of the global Reanimated test mock: useAnimatedStyle is a
    // plain synchronous function call and withTiming resolves immediately, so it
    // isn't reactive to a shared-value mutation the way real Reanimated is
    // on-device — a mutation made inside an effect only shows up in a style
    // computed on a LATER render, not the one whose commit triggered the effect.
    // These tests therefore assert the states seeded at mount (empty/unfocused
    // vs. pre-filled), not the live focus transition — the transition itself
    // only needs verifying on-device or in the browser.

    function animatedLabelStyle(renderer: ReturnType<typeof create>) {
      const node = renderer.root.findAllByProps({ pointerEvents: 'none' })[0];
      const style = node.props.style as {
        transform: Array<Record<string, number>>;
        fontSize: number;
      };
      const translateX = style.transform.find((t) => 'translateX' in t)?.translateX ?? 0;
      const translateY = style.transform.find((t) => 'translateY' in t)?.translateY ?? 0;
      return { translateX, translateY, fontSize: style.fontSize };
    }

    it('rests inside the field (non-zero offset, base font size) when empty and unfocused', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input label="Email" floatingLabel />);
      });
      const style = animatedLabelStyle(renderer as ReturnType<typeof create>);
      expect(style.translateX).toBeGreaterThan(0);
      expect(style.translateY).toBeGreaterThan(0);
      expect(style.fontSize).toBe(16);
    });

    it('rests further right when a leftIcon is present, to clear it', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input label="Email" floatingLabel leftIcon={<View />} />);
      });
      const style = animatedLabelStyle(renderer as ReturnType<typeof create>);
      expect(style.translateX).toBe(44);
    });

    it('floats flush left (zero X/Y offset, smaller font size) when pre-filled with a value', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input label="Email" floatingLabel value="alex@example.com" />);
      });
      const style = animatedLabelStyle(renderer as ReturnType<typeof create>);
      expect(style.translateX).toBe(0);
      expect(style.translateY).toBe(0);
      expect(style.fontSize).toBe(14);
    });

    it('floats flush left even when a leftIcon is present', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(
          <Input label="Email" floatingLabel leftIcon={<View />} value="alex@example.com" />,
        );
      });
      const style = animatedLabelStyle(renderer as ReturnType<typeof create>);
      expect(style.translateX).toBe(0);
    });

    it('rests at a taller offset for the auth (52px) size than the default (48px) size', () => {
      let defaultRenderer: ReturnType<typeof create> | undefined;
      let authRenderer: ReturnType<typeof create> | undefined;
      act(() => {
        defaultRenderer = create(<Input label="Email" floatingLabel />);
        authRenderer = create(<Input label="Email" floatingLabel size="auth" />);
      });
      const defaultY = animatedLabelStyle(defaultRenderer as ReturnType<typeof create>).translateY;
      const authY = animatedLabelStyle(authRenderer as ReturnType<typeof create>).translateY;
      expect(authY).toBeGreaterThan(defaultY);
    });

    it('still seeds the correct resting position under reduced motion (no crash, correct state)', () => {
      reducedMotion = true;
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input label="Email" floatingLabel />);
      });
      const style = animatedLabelStyle(renderer as ReturnType<typeof create>);
      expect(style.translateY).toBeGreaterThan(0);
      reducedMotion = false;
    });

    it('renders the plain static label (unaffected) when floatingLabel is omitted', () => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(<Input label="Email" />);
      });
      expect(renderer?.root.findAllByProps({ pointerEvents: 'none' })).toHaveLength(0);
      const staticLabel = renderer?.root.findAllByType('Text')[0];
      expect(staticLabel?.props.className).toContain('mb-xs');
    });
  });
});
