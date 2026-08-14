import type React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from '@/components/ui/stepper';

vi.mock('@/components/ui/typography', () => ({
  Typography: ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>,
}));
vi.mock('@/components/ui/icon', () => ({
  Icon: () => null,
}));

function renderStepper(props: {
  currentStep: number;
  totalSteps?: number;
  showStepLabels?: boolean;
  testID?: string;
}) {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(
      <Stepper
        currentStep={props.currentStep}
        totalSteps={props.totalSteps ?? 5}
        showStepLabels={props.showStepLabels}
        testID={props.testID}
      />,
    );
  });
  if (!renderer) throw new Error('Expected renderer to be created.');
  return renderer;
}

function textsOf(renderer: ReturnType<typeof create>) {
  return renderer.root
    .findAllByType(Text)
    .map((n: { props: { children?: unknown } }) => n.props.children);
}

describe('Stepper', () => {
  it('renders the step number inside each incomplete circle, no labels by default', () => {
    const texts = textsOf(renderStepper({ currentStep: 1 }));
    expect(texts).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows a tick instead of a number once a step is complete', () => {
    // Step 1 is complete when currentStep is 2 — its number is replaced by an
    // Icon (mocked to null), so only steps 2-5 leave a Text node behind.
    const texts = textsOf(renderStepper({ currentStep: 2 }));
    expect(texts).toEqual([2, 3, 4, 5]);
  });

  it('follows the flow length rather than assuming five steps', () => {
    expect(textsOf(renderStepper({ currentStep: 1, totalSteps: 3 }))).toEqual([1, 2, 3]);
  });

  it('renders a title under every step when opted in, defaulting to "Step N"', () => {
    const renderer = renderStepper({ currentStep: 1, totalSteps: 3, showStepLabels: true });
    const texts = textsOf(renderer);
    // Each step's circle number is immediately followed by its title.
    expect(texts).toEqual([1, 'Step 1', 2, 'Step 2', 3, 'Step 3']);
  });

  it('applies the given testID to the outer container', () => {
    const renderer = renderStepper({ currentStep: 3, testID: 'wizard-progress' });
    expect(() => renderer.root.findByProps({ testID: 'wizard-progress' })).not.toThrow();
  });
});
