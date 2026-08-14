/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProcessingStatus } from '../processing-status';

describe('ProcessingStatus', () => {
  it('renders nothing when inactive', () => {
    render(<ProcessingStatus isActive={false} label="Processing" />);

    expect(screen.queryByText('Processing')).not.toBeInTheDocument();
  });

  it('renders a fallback label when active', () => {
    render(<ProcessingStatus isActive label="Processing" />);

    expect(screen.getByRole('status', { name: 'Processing' })).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('prefers the latest server-authored message over the fallback label', () => {
    render(<ProcessingStatus isActive label="Processing" message="Preparing" />);

    expect(screen.getByText('Preparing')).toBeInTheDocument();
    expect(screen.queryByText('Processing')).not.toBeInTheDocument();
  });

  it('renders the shared preview overlay when requested', () => {
    render(<ProcessingStatus isActive label="Processing" showOverlay />);

    expect(document.querySelector('.image-processing-shimmer')).toBeInTheDocument();
    expect(document.querySelector('.image-processing-progress')).toBeInTheDocument();
  });
});
