import { Pressable } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { IconSelectCard } from '@/components/ui/icon-select-card';
import { firePress, renderTree, textChildren } from '@/test/utils/rtr';

function findCard(root: ReturnType<typeof renderTree>['root']) {
  return root.findAllByType(Pressable)[0];
}

describe('IconSelectCard', () => {
  it('renders the label', () => {
    const root = renderTree(
      <IconSelectCard icon="star.fill" iconColor="#FF7700" label="Energized" onPress={vi.fn()} />,
    ).root;

    expect(textChildren(root)).toContain('Energized');
  });

  it('is not selected by default', () => {
    const root = renderTree(
      <IconSelectCard icon="star.fill" iconColor="#FF7700" label="Energized" onPress={vi.fn()} />,
    ).root;

    expect(findCard(root).props.accessibilityState.selected).toBeFalsy();
  });

  it('reflects the selected prop for accessibility', () => {
    const root = renderTree(
      <IconSelectCard
        icon="star.fill"
        iconColor="#FF7700"
        label="Energized"
        selected
        onPress={vi.fn()}
      />,
    ).root;

    expect(findCard(root).props.accessibilityState.selected).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = vi.fn();
    const root = renderTree(
      <IconSelectCard icon="star.fill" iconColor="#FF7700" label="Energized" onPress={onPress} />,
    ).root;

    await firePress(findCard(root));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies the testID', () => {
    const root = renderTree(
      <IconSelectCard
        icon="star.fill"
        iconColor="#FF7700"
        label="Energized"
        onPress={vi.fn()}
        testID="emotion-energized"
      />,
    ).root;

    expect(findCard(root).props.testID).toBe('emotion-energized');
  });
});
