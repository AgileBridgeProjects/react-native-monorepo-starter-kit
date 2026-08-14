'use client';

import { useTranslation } from '@lib/i18n';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Button, Typography } from '@/components/ui';

/**
 * Web fallback for the athlete/coach mobile setup-account deep link.
 *
 * The email link is a real HTTPS Universal Link / App Link: when the native app
 * is installed and its association with this domain has been verified, the OS
 * hands off directly to the app WITHOUT ever rendering this page. This page is
 * only reached when that handoff didn't happen (app not installed yet, or
 * verification hasn't completed) — see `apps/web/public/.well-known/`.
 *
 * The native URL scheme differs per build profile (dev / uat / production), so it is
 * configurable via NEXT_PUBLIC_MOBILE_APP_SCHEME — each deployed web instance sets the
 * scheme of the build distributed for that environment. Defaults to the dev build.
 */
const MOBILE_APP_SCHEME = process.env.NEXT_PUBLIC_MOBILE_APP_SCHEME ?? 'starterkit-mobile-dev';

export function MobileSetupAccountPage() {
  const { t } = useTranslation('mobile-setup');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const purpose = searchParams.get('purpose');

  const deepLink = useMemo(() => {
    if (!token) return undefined;
    const purposeParam = purpose ? `&purpose=${encodeURIComponent(purpose)}` : '';
    return `${MOBILE_APP_SCHEME}://mobile-setup-account?token=${encodeURIComponent(token)}${purposeParam}`;
  }, [token, purpose]);

  useEffect(() => {
    if (!deepLink) return;
    window.location.href = deepLink;
  }, [deepLink]);

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-lg">
        <Typography variant="body">{t('missingToken')}</Typography>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-md bg-background p-lg text-center">
      <Typography variant="h1">{t('title')}</Typography>
      <Typography variant="body" className="text-text-secondary">
        {t('subtitle')}
      </Typography>
      <Button
        variant="primary"
        onClick={() => {
          if (deepLink) window.location.href = deepLink;
        }}
      >
        {t('openInAppButton')}
      </Button>
      <Typography variant="body" className="mt-lg text-text-secondary">
        {t('noAppInstalled')}
      </Typography>
      {process.env.NEXT_PUBLIC_APP_STORE_URL && (
        <Button
          variant="outlined"
          onClick={() => {
            window.location.href = process.env.NEXT_PUBLIC_APP_STORE_URL as string;
          }}
        >
          {t('appStoreButton')}
        </Button>
      )}
      {process.env.NEXT_PUBLIC_PLAY_STORE_URL && (
        <Button
          variant="outlined"
          onClick={() => {
            window.location.href = process.env.NEXT_PUBLIC_PLAY_STORE_URL as string;
          }}
        >
          {t('playStoreButton')}
        </Button>
      )}
    </main>
  );
}
