/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StepIndicator } from '../step-indicator';

describe('StepIndicator', () => {
  const steps = [
    { id: 'details', label: 'Details' },
    { id: 'trigger', label: 'Trigger' },
    { id: 'sharing', label: 'Sharing' },
  ];

  it('renders each step label', () => {
    render(<StepIndicator steps={steps} currentStep={0} />);

    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toBeInTheDocument();
    expect(screen.getByText('Sharing')).toBeInTheDocument();
  });

  it('marks completed steps with an icon instead of the step number', () => {
    render(<StepIndicator steps={steps} currentStep={1} />);

    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('exposes step semantics with an active current step', () => {
    render(<StepIndicator steps={steps} currentStep={1} ariaLabel="Reward setup progress" />);

    expect(screen.getByRole('navigation', { name: 'Reward setup progress' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Trigger');
  });

  it('falls back to index-label keys when id is missing', () => {
    const duplicateLabelSteps = [{ label: 'Step' }, { label: 'Step' }];

    render(<StepIndicator steps={duplicateLabelSteps} currentStep={0} />);

    expect(screen.getAllByText('Step')).toHaveLength(2);
  });
});
