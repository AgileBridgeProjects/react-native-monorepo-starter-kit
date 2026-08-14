import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AllocationSlider } from '../allocation-slider';

describe('AllocationSlider', () => {
  const segments = [
    { id: 'easy', label: 'Easy', value: 2, colorClassName: 'bg-success' },
    { id: 'medium', label: 'Medium', value: 2, colorClassName: 'bg-warning' },
    { id: 'hard', label: 'Hard', value: 1, colorClassName: 'bg-error' },
  ] as const;

  it('renders compact segment labels with counts', () => {
    render(
      <AllocationSlider
        segments={segments}
        total={5}
        firstBoundaryAriaLabel="Adjust easy"
        secondBoundaryAriaLabel="Adjust hard"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('emits three segment values when a boundary moves', () => {
    const handleChange = vi.fn();

    render(
      <AllocationSlider
        segments={segments}
        total={5}
        firstBoundaryAriaLabel="Adjust easy"
        secondBoundaryAriaLabel="Adjust hard"
        onChange={handleChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Adjust easy'), { target: { value: '3' } });

    expect(handleChange).toHaveBeenCalledWith([3, 1, 1]);
  });
});
