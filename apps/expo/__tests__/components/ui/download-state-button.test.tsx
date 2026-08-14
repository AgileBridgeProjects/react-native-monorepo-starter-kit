import { Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DownloadStateButton } from '@/components/ui/download-state-button';
import { firePress, hostByTestId, renderTree } from '@/test/utils/rtr';

const colorSchemeMock = vi.hoisted(() => ({ value: 'light' as 'light' | 'dark' }));

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => colorSchemeMock.value,
}));

vi.mock('@/components/ui/icon', async () => {
  const React = await import('react');
  return {
    Icon: ({ name }: { name: string }) => React.createElement('View', { testID: `icon-${name}` }),
  };
});

vi.mock('@/components/ui/download-progress-button', async () => {
  const React = await import('react');
  return {
    DownloadProgressButton: ({ onCancel }: { onCancel: () => void }) =>
      React.createElement('Pressable', { testID: 'progress-button', onPress: onCancel }),
  };
});

function setOS(os: 'ios' | 'android' | 'web') {
  (Platform as { OS: string }).OS = os;
}

afterEach(() => {
  setOS('ios');
  colorSchemeMock.value = 'light';
});

describe('DownloadStateButton', () => {
  it('renders nothing on web', () => {
    setOS('web');
    const { toJSON } = renderTree(
      <DownloadStateButton isDownloaded={false} isDownloading={false} onDownload={() => {}} />,
    );
    expect(toJSON()).toBeNull();
  });

  describe('downloaded state', () => {
    it('shows a checkmark and fires onRemoveDownload when pressed', async () => {
      const onRemoveDownload = vi.fn();
      const { root } = renderTree(
        <DownloadStateButton
          isDownloaded
          isDownloading={false}
          onRemoveDownload={onRemoveDownload}
          removeLabel="Remove download"
          removeTestID="remove-btn"
        />,
      );
      const pressable = hostByTestId(root, 'remove-btn');
      expect(pressable.props.accessibilityLabel).toBe('Remove download');
      expect(root.findAll((n) => n.props.testID === 'icon-checkmark.circle.fill')).toHaveLength(1);
      await firePress(pressable);
      expect(onRemoveDownload).toHaveBeenCalledTimes(1);
    });

    it('falls through to the download state if no remove handler is supplied', () => {
      const { root } = renderTree(
        <DownloadStateButton isDownloaded isDownloading={false} onDownload={() => {}} />,
      );
      expect(root.findAll((n) => n.props.testID === 'icon-checkmark.circle.fill')).toHaveLength(0);
      expect(root.findAll((n) => n.props.testID === 'icon-arrow.down.circle.fill')).toHaveLength(1);
    });
  });

  describe('downloading state', () => {
    it('renders the progress button and wires cancel through', async () => {
      const onCancelDownload = vi.fn();
      const { root } = renderTree(
        <DownloadStateButton
          isDownloaded={false}
          isDownloading
          downloadProgress={0.4}
          onCancelDownload={onCancelDownload}
        />,
      );
      const progress = root.find((n) => n.props.testID === 'progress-button');
      await firePress(progress);
      expect(onCancelDownload).toHaveBeenCalledTimes(1);
    });

    it('takes priority over the not-downloaded download arrow', () => {
      const { root } = renderTree(
        <DownloadStateButton
          isDownloaded={false}
          isDownloading
          onDownload={() => {}}
          onCancelDownload={() => {}}
        />,
      );
      expect(root.findAll((n) => n.props.testID === 'progress-button')).toHaveLength(1);
      expect(root.findAll((n) => n.props.testID === 'icon-arrow.down.circle.fill')).toHaveLength(0);
    });

    it('yields to the downloaded checkmark when a remove handler is present', () => {
      // The downloaded branch is checked before the downloading branch.
      const { root } = renderTree(
        <DownloadStateButton
          isDownloaded
          isDownloading
          onRemoveDownload={() => {}}
          onCancelDownload={() => {}}
        />,
      );
      expect(root.findAll((n) => n.props.testID === 'icon-checkmark.circle.fill')).toHaveLength(1);
      expect(root.findAll((n) => n.props.testID === 'progress-button')).toHaveLength(0);
    });
  });

  describe('not-downloaded state', () => {
    it('shows the download arrow and fires onDownload when pressed', async () => {
      const onDownload = vi.fn();
      const { root } = renderTree(
        <DownloadStateButton
          isDownloaded={false}
          isDownloading={false}
          onDownload={onDownload}
          downloadLabel="Download for offline"
          downloadTestID="download-btn"
        />,
      );
      const pressable = hostByTestId(root, 'download-btn');
      expect(pressable.props.accessibilityLabel).toBe('Download for offline');
      expect(root.findAll((n) => n.props.testID === 'icon-arrow.down.circle.fill')).toHaveLength(1);
      await firePress(pressable);
      expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it('shows a refresh icon when the download is expired', () => {
      const { root } = renderTree(
        <DownloadStateButton
          isDownloaded={false}
          isDownloading={false}
          isExpired
          onDownload={() => {}}
          downloadTestID="download-btn"
        />,
      );
      expect(root.findAll((n) => n.props.testID === 'icon-arrow.clockwise')).toHaveLength(1);
      expect(root.findAll((n) => n.props.testID === 'icon-arrow.down.circle.fill')).toHaveLength(0);
    });

    it('renders nothing when no download handler is supplied', () => {
      const { toJSON } = renderTree(
        <DownloadStateButton isDownloaded={false} isDownloading={false} />,
      );
      expect(toJSON()).toBeNull();
    });
  });

  it('uses dark surface styling in dark mode', () => {
    colorSchemeMock.value = 'dark';
    const { root } = renderTree(
      <DownloadStateButton
        isDownloaded={false}
        isDownloading={false}
        onDownload={() => {}}
        downloadTestID="download-btn"
      />,
    );
    expect(hostByTestId(root, 'download-btn').props.className).toContain('bg-surface-elevated');
  });

  it('matches the downloaded snapshot', () => {
    const { toJSON } = renderTree(
      <DownloadStateButton
        isDownloaded
        isDownloading={false}
        onRemoveDownload={() => {}}
        removeTestID="remove-btn"
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the downloading snapshot', () => {
    const { toJSON } = renderTree(
      <DownloadStateButton
        isDownloaded={false}
        isDownloading
        downloadProgress={0.6}
        onCancelDownload={() => {}}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the not-downloaded snapshot', () => {
    const { toJSON } = renderTree(
      <DownloadStateButton
        isDownloaded={false}
        isDownloading={false}
        onDownload={() => {}}
        downloadTestID="download-btn"
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
