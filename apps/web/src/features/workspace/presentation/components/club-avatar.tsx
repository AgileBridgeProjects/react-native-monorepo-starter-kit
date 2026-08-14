'use client';

import { avatarSize, cn } from '@starterkit/shared';
import Image from 'next/image';
import { useState } from 'react';

interface ClubAvatarProps {
  logoUrl: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'wide';
  /** 'on-primary' = white letter on dark bg (sidebar). 'on-surface' = primary letter on light bg (flyout). */
  variant?: 'on-primary' | 'on-surface';
  /** 'squircle' = rounded-lg (default). 'circle' = rounded-full. */
  shape?: 'squircle' | 'circle';
}

/**
 * Derives up to two initials from a club name: the first two letters of a single-word name
 * (e.g. "Acme" → "AC"), or the first letter of each of the first two words ("StarterKit Corp" → "GC").
 */
function getClubInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

/** Club logo image, falling back to name initials on a neutral tile when there's no logo. */
export function ClubAvatar({
  logoUrl,
  name,
  size = 'md',
  variant = 'on-surface',
  shape = 'squircle',
}: ClubAvatarProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const isLg = size === 'lg';
  const isWide = size === 'wide';
  const dim =
    size === 'sm'
      ? 'h-6 w-6 text-2xs'
      : isLg
        ? 'h-14 w-14 text-lg'
        : isWide
          ? 'h-12 w-36 text-sm'
          : 'h-10 w-10 text-sm';
  const imgWidth = isWide ? 144 : size === 'sm' ? 24 : isLg ? 56 : avatarSize.md;
  const imgHeight = isWide ? 48 : size === 'sm' ? 24 : isLg ? 56 : avatarSize.md;
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  const hasImageError = logoUrl === failedLogoUrl;

  if (logoUrl && !hasImageError) {
    return (
      <div className={cn(dim, radius, 'relative shrink-0 overflow-hidden')}>
        <Image
          src={logoUrl}
          alt={name}
          width={imgWidth}
          height={imgHeight}
          className="absolute inset-0 h-full w-full object-contain"
          onError={() => setFailedLogoUrl(logoUrl)}
        />
      </div>
    );
  }

  const fallbackCls =
    variant === 'on-primary'
      ? 'bg-white/20 font-bold text-white'
      : 'bg-primary/10 font-bold text-primary';

  if (isWide) {
    const nameCls =
      variant === 'on-primary' ? 'font-semibold text-white' : 'font-semibold text-primary';
    return (
      <div className={cn(dim, 'flex shrink-0 items-center justify-center overflow-hidden', radius)}>
        <span className={cn('truncate px-sm text-sm leading-normal', nameCls)}>{name}</span>
      </div>
    );
  }

  return (
    // Initials inside a sized avatar — not a text block, so Typography not applicable.
    <div className={cn(dim, 'flex shrink-0 items-center justify-center', radius, fallbackCls)}>
      {getClubInitials(name)}
    </div>
  );
}
