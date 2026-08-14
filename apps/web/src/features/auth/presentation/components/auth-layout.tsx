'use client';

import { appConfig } from '@starterkit/shared';
import Image from 'next/image';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Centered-card auth layout for the admin portal: the wordmark above a single
 * hairline-bordered card on the volt-tinted dark backdrop — the starterkit.com
 * look. White-labelling (per-club branding) is off, so branding is static.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-hero-gradient auth-hero-pattern relative flex min-h-screen items-center justify-center px-md py-xl">
      <div className="relative z-10 flex w-full max-w-auth-card flex-col items-center gap-xl">
        {/* ── Brand ── */}
        <div className="flex flex-col items-center gap-md">
          <Image
            src="/brand-wordmark.png"
            alt="StarterKit logo"
            width={280}
            height={77}
            priority
            className="h-auto w-40 sm:w-48"
          />
          <div className="flex items-center gap-sm">
            <div className="h-px w-8 bg-white/40" />
            <span className="text-xs font-semibold tracking-[0.2em] text-white/80 uppercase">
              {appConfig.adminPortalTitle}
            </span>
            <div className="h-px w-8 bg-white/40" />
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="w-full rounded-lg border border-border bg-surface p-xl">{children}</div>
      </div>
    </div>
  );
}
