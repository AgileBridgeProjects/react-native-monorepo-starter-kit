import { ClubAvatar } from '@features/workspace/presentation/components/club-avatar';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // biome-ignore lint/performance/noImgElement: next/image mock in test — Next Image cannot be used in vitest DOM
    <img src={src} alt={alt} className={className} />
  ),
}));

describe('ClubAvatar', () => {
  it('renders the club logo when a URL is provided', () => {
    render(
      <ClubAvatar logoUrl="https://cdn.example.com/logo.png" name="Weelee" variant="on-primary" />,
    );

    expect(screen.getByAltText('Weelee')).toBeTruthy();
  });

  it('falls back to club initials when there is no logo', () => {
    render(<ClubAvatar logoUrl={null} name="Texas Slam" variant="on-surface" />);

    expect(screen.getByText('TS')).toBeTruthy();
  });

  it('renders the club name in the wide variant fallback', () => {
    render(<ClubAvatar logoUrl={null} name="Texas Slam" size="wide" variant="on-primary" />);

    expect(screen.getByText('Texas Slam')).toBeTruthy();
  });
});
