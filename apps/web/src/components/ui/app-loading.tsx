'use client';

import { appConfig, cn } from '@starterkit/shared';
import Image from 'next/image';
import { Spinner } from './spinner';

// ─── Props ───────────────────────────────────────────────────────────────────

interface AppLoadingProps {
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AppLoading({ className }: AppLoadingProps) {
  return (
    <div
      className={cn(
        'auth-hero-gradient auth-hero-pattern flex h-screen w-full flex-col items-center justify-center gap-lg',
        className,
      )}
    >
      <Image
        src="/brand-wordmark.png"
        alt={appConfig.name}
        width={200}
        height={55}
        priority
        className="h-auto w-40"
      />
      <Spinner className="border-white" />
    </div>
  );
}
