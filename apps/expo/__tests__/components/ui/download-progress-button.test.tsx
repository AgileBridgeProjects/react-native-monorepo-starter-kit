import { describe, expect, it, vi } from 'vitest';

import { DownloadProgressButton } from '@/components/ui/download-progress-button';
import { firePress, hostByTestId, renderTree } from '@/test/utils/rtr';

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const noop = () => {};

describe('DownloadProgressButton', () => {
  it('exposes the cancel button role and default accessibility label', () => {
    const { root } = renderTree(
      <DownloadProgressButton progress={0.5} onCancel={noop} testID="dl-progress" />,
    );
    const pressable = hostByTestId(root, 'dl-progress');
    expect(pressable.props.accessibilityRole).toBe('button');
    expect(pressable.props.accessibilityLabel).toBe('Cancel download');
  });

  it('uses a custom accessibility label when provided', () => {
    const { root } = renderTree(
      <DownloadProgressButton
        progress={0.5}
        onCancel={noop}
        accessibilityLabel="Stop downloading game"
        testID="dl-progress"
      />,
    );
    expect(hostByTestId(root, 'dl-progress').props.accessibilityLabel).toBe(
      'Stop downloading game',
    );
  });

  it('fires onCancel when pressed', async () => {
    const onCancel = vi.fn();
    const { root } = renderTree(
      <DownloadProgressButton progress={0.5} onCancel={onCancel} testID="dl-progress" />,
    );
    await firePress(hostByTestId(root, 'dl-progress'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders a determinate arc whose offset reflects the progress fraction', () => {
    const size = 32;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const { root } = renderTree(
      <DownloadProgressButton progress={0.25} onCancel={noop} testID="dl-progress" />,
    );
    const arcs = root.findAll((n) => n.type === 'Circle' && n.props.strokeDasharray != null);
    // The progress arc is the circle that also sets strokeDashoffset.
    const progressArc = arcs.find((c) => c.props.strokeDashoffset != null);
    expect(progressArc).toBeDefined();
    expect(progressArc?.props.strokeDashoffset).toBeCloseTo(circumference * (1 - 0.25), 4);
  });

  it('treats null progress as a full indeterminate ring (zero offset)', () => {
    const { root } = renderTree(
      <DownloadProgressButton progress={null} onCancel={noop} testID="dl-progress" />,
    );
    const progressArc = root
      .findAll((n) => n.type === 'Circle')
      .find((c) => c.props.strokeDashoffset != null);
    expect(progressArc?.props.strokeDashoffset).toBeCloseTo(0, 4);
  });

  it('draws a centred stop square sized relative to the button', () => {
    const size = 40;
    const { root } = renderTree(
      <DownloadProgressButton progress={1} onCancel={noop} size={size} testID="dl-progress" />,
    );
    const rect = root.find((n) => n.type === 'Rect');
    const expectedStop = size * 0.32;
    expect(rect.props.width).toBeCloseTo(expectedStop, 4);
    expect(rect.props.height).toBeCloseTo(expectedStop, 4);
  });

  it('matches the determinate snapshot', () => {
    const { toJSON } = renderTree(
      <DownloadProgressButton progress={0.5} onCancel={noop} testID="dl-progress" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the indeterminate snapshot', () => {
    const { toJSON } = renderTree(
      <DownloadProgressButton progress={null} onCancel={noop} testID="dl-progress" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
