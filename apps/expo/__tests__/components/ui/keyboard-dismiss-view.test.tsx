import React from 'react';
import { Keyboard, Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeyboardDismissView } from '@/components/ui/keyboard-dismiss-view';
import { renderTree } from '@/test/utils/rtr';

const child = React.createElement('View', { testID: 'kdv-child' });

function setOS(os: 'ios' | 'android' | 'web') {
  (Platform as { OS: string }).OS = os;
}

afterEach(() => {
  setOS('ios');
});

describe('KeyboardDismissView', () => {
  it('wraps children in a KeyboardAvoidingView with padding behaviour on iOS', () => {
    setOS('ios');
    const { root } = renderTree(<KeyboardDismissView>{child}</KeyboardDismissView>);
    const kav = root.find((n) => n.type === 'KeyboardAvoidingView');
    expect(kav.props.behavior).toBe('padding');
    expect(kav.props.className).toBe('flex-1');
    expect(root.findAll((n) => n.props.testID === 'kdv-child')).toHaveLength(1);
  });

  it('uses height behaviour on Android', () => {
    setOS('android');
    const { root } = renderTree(<KeyboardDismissView>{child}</KeyboardDismissView>);
    const kav = root.find((n) => n.type === 'KeyboardAvoidingView');
    expect(kav.props.behavior).toBe('height');
  });

  it('dismisses the keyboard when the touchable wrapper is pressed on native', () => {
    setOS('ios');
    const dismissSpy = vi.spyOn(Keyboard, 'dismiss');
    const { root } = renderTree(<KeyboardDismissView>{child}</KeyboardDismissView>);
    const touchable = root.find((n) => n.type === 'TouchableWithoutFeedback');
    expect(touchable.props.accessible).toBeFalsy();
    expect(touchable.props.onPress).toBe(Keyboard.dismiss);
    touchable.props.onPress();
    expect(dismissSpy).toHaveBeenCalledTimes(1);
    dismissSpy.mockRestore();
  });

  it('renders children directly on web with no keyboard-avoiding wrapper', () => {
    setOS('web');
    const { root } = renderTree(<KeyboardDismissView>{child}</KeyboardDismissView>);
    expect(root.findAll((n) => n.type === 'KeyboardAvoidingView')).toHaveLength(0);
    expect(root.findAll((n) => n.type === 'TouchableWithoutFeedback')).toHaveLength(0);
    expect(root.findAll((n) => n.props.testID === 'kdv-child')).toHaveLength(1);
  });

  it('matches the iOS snapshot', () => {
    setOS('ios');
    const { toJSON } = renderTree(<KeyboardDismissView>{child}</KeyboardDismissView>);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the web snapshot', () => {
    setOS('web');
    const { toJSON } = renderTree(<KeyboardDismissView>{child}</KeyboardDismissView>);
    expect(toJSON()).toMatchSnapshot();
  });
});
