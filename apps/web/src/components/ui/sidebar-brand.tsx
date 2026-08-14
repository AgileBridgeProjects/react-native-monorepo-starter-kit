'use client';

import { useTranslation } from '@lib/i18n';
import { appConfig } from '@starterkit/shared';
import { Typography } from '@/components/ui/typography';

// ─── Component ───────────────────────────────────────────────────────────────

export function SidebarBrand() {
  const { t } = useTranslation();

  return (
    <div className="flex h-14 shrink-0 items-center gap-xs border-b border-white/10 px-md">
      <Typography variant="h4" as="span" className="text-white">
        {appConfig.name}
      </Typography>
      <Typography variant="body-sm" as="span" className="text-white/50">
        {t('common:portal.admin')}
      </Typography>
    </div>
  );
}
