import { Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import { AnchoredFooter } from '@/components/ui/anchored-footer';

import { hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

describe('AnchoredFooter', () => {
  it('renders the controls it is given', () => {
    const root = renderTree(
      <AnchoredFooter paddingBottom={0}>
        <Text>Continue</Text>
      </AnchoredFooter>,
    ).root;

    expect(textChildren(root)).toContain('Continue');
  });

  it('applies the safe-area inset inside the panel, not around it', () => {
    // Inside, so the panel's fill reaches the bottom of the screen instead of leaving a strip
    // of background showing below it.
    const root = renderTree(
      <AnchoredFooter paddingBottom={34} testID="footer">
        <Text>Continue</Text>
      </AnchoredFooter>,
    ).root;

    expect(hostByTestId(root, 'footer').props.style).toMatchObject({ paddingBottom: 34 });
  });

  it('lays its controls out in a row, so two buttons sit side by side', () => {
    const root = renderTree(
      <AnchoredFooter paddingBottom={0} testID="footer">
        <Text>Back</Text>
        <Text>Continue</Text>
      </AnchoredFooter>,
    ).root;

    expect(hostByTestId(root, 'footer').props.className).toContain('flex-row');
    expect(textChildren(root)).toEqual(expect.arrayContaining(['Back', 'Continue']));
  });
});
