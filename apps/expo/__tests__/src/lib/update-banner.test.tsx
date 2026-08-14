import { BackHandler, Platform } from 'react-native';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui';
import { renderTree, textChildren } from '@/test/utils/rtr';

const useOtaUpdates = vi.fn();
const restart = vi.fn();

vi.mock('@/hooks/use-ota-updates', () => ({
  useOtaUpdates: () => useOtaUpdates(),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

import { UpdateBanner } from '@lib/update-banner';

describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing while no update is ready', () => {
    useOtaUpdates.mockReturnValue({ isRestartReady: false, restart });

    const tree = renderTree(<UpdateBanner />);

    expect(tree.toJSON()).toBeNull();
  });

  it('shows the heading, description, and restart button when an update is ready', () => {
    useOtaUpdates.mockReturnValue({ isRestartReady: true, restart });

    const tree = renderTree(<UpdateBanner />);
    const text = textChildren(tree.root);

    expect(tree.toJSON()).not.toBeNull();
    expect(text).toContain('updateReady');
    expect(text).toContain('updateReadyDescription');
    expect(text).toContain('restart');
  });

  it('has exactly one action — no dismiss affordance', () => {
    useOtaUpdates.mockReturnValue({ isRestartReady: true, restart });

    const tree = renderTree(<UpdateBanner />);

    expect(tree.root.findAllByType(Button)).toHaveLength(1);
  });

  it('restart button applies the update', () => {
    useOtaUpdates.mockReturnValue({ isRestartReady: true, restart });

    const tree = renderTree(<UpdateBanner />);
    const [restartButton] = tree.root.findAll((node) => typeof node.props.onPress === 'function');
    restartButton.props.onPress();

    expect(restart).toHaveBeenCalledTimes(1);
  });

  describe('Android hardware back button', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      (Platform as { OS: string }).OS = originalOS;
      vi.restoreAllMocks();
    });

    it('registers a handler that swallows the back press while an update is pending', () => {
      (Platform as { OS: string }).OS = 'android';
      useOtaUpdates.mockReturnValue({ isRestartReady: true, restart });
      const addSpy = vi.spyOn(BackHandler, 'addEventListener');

      renderTree(<UpdateBanner />);

      expect(addSpy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
      const handler = addSpy.mock.calls[0][1] as () => boolean;
      // Returning true tells Android the app handled the event — i.e. it is blocked.
      expect(handler()).toBe(true);
    });

    it('removes the handler on unmount', () => {
      (Platform as { OS: string }).OS = 'android';
      useOtaUpdates.mockReturnValue({ isRestartReady: true, restart });
      const remove = vi.fn();
      vi.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove } as never);

      const tree = renderTree(<UpdateBanner />);
      act(() => {
        tree.unmount();
      });

      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('does not touch the back handler on iOS', () => {
      (Platform as { OS: string }).OS = 'ios';
      useOtaUpdates.mockReturnValue({ isRestartReady: true, restart });
      const addSpy = vi.spyOn(BackHandler, 'addEventListener');

      renderTree(<UpdateBanner />);

      expect(addSpy).not.toHaveBeenCalled();
    });
  });
});
