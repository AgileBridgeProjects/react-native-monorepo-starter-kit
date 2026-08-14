import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedButton } from '../segmented-button';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
] as const;

describe('SegmentedButton', () => {
  it('calls onValueChanged with the clicked option', () => {
    const onValueChanged = vi.fn();
    render(
      <SegmentedButton
        legend="Pick one"
        options={OPTIONS}
        value="a"
        onValueChanged={onValueChanged}
      />,
    );

    fireEvent.click(screen.getByText('Option B'));

    expect(onValueChanged).toHaveBeenCalledWith('b');
  });

  it('marks the current value as pressed', () => {
    render(
      <SegmentedButton legend="Pick one" options={OPTIONS} value="b" onValueChanged={vi.fn()} />,
    );

    expect(screen.getByText('Option A').closest('button')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Option B').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks no option as pressed when the value is undefined', () => {
    render(
      <SegmentedButton
        legend="Pick one"
        options={OPTIONS}
        value={undefined}
        onValueChanged={vi.fn()}
      />,
    );

    for (const label of ['Option A', 'Option B']) {
      expect(screen.getByText(label).closest('button')).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('disables every option and does not fire onValueChanged when disabled', () => {
    const onValueChanged = vi.fn();
    render(
      <SegmentedButton
        legend="Pick one"
        options={OPTIONS}
        value="a"
        onValueChanged={onValueChanged}
        disabled
      />,
    );

    const optionB = screen.getByText('Option B').closest('button');
    expect(optionB).toBeDisabled();

    fireEvent.click(optionB as HTMLButtonElement);
    expect(onValueChanged).not.toHaveBeenCalled();
  });
});
