/// <reference types="@testing-library/jest-dom" />

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClubAvatar } from '../club-avatar';

vi.mock('next/image', () => ({
  default: ({ alt, onError, src }: { alt: string; onError?: () => void; src: string }) => (
    // biome-ignore lint/performance/noImgElement: test-only mock for Next Image error handling
    <img alt={alt} src={src} onError={onError} />
  ),
}));

describe('ClubAvatar', () => {
  it('retries image rendering when the logo URL changes after a load error', () => {
    const { rerender } = render(
      <ClubAvatar logoUrl="https://assets.test/expired-logo.png" name="Acme" />,
    );

    fireEvent.error(screen.getByAltText('Acme'));
    expect(screen.getByText('AC')).toBeInTheDocument();

    rerender(<ClubAvatar logoUrl="https://assets.test/new-logo.png" name="Acme" />);

    expect(screen.getByAltText('Acme')).toHaveAttribute('src', 'https://assets.test/new-logo.png');
  });
});
