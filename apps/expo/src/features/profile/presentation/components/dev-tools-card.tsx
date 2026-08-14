import { PROFILE_TEST_IDS } from '@features/profile/presentation/profile.copy';
import { useTranslation } from '@lib/i18n';
import { SettingsGroup } from '@/components/ui';
import { areDevToolsEnabled } from '@/src/lib/app-environment';

export interface DevToolsCardProps {
  className?: string;
}

/**
 * Developer-only shortcuts for demoing and manual testing.
 *
 * Renders NOTHING outside the dev client and the `dev` build — see
 * {@link areDevToolsEnabled}. UAT deliberately does not qualify: it is what we demo to people
 * outside the team, so it has to look like production.
 *
 * The starter kit ships this card empty. Add a `SettingsRow` per shortcut as your app grows —
 * e.g. a row that jumps straight into a wizard or a gated flow so a demo never has to wait
 * for the real trigger.
 */
export function DevToolsCard({ className }: DevToolsCardProps) {
  const { t } = useTranslation('profile');

  if (!areDevToolsEnabled()) return null;

  return (
    <SettingsGroup
      className={className}
      header={t('devTools.title')}
      footer={t('devTools.description')}
      testID={PROFILE_TEST_IDS.devToolsCard}
    >
      {/* Add a <SettingsRow /> per dev shortcut here. */}
      {null}
    </SettingsGroup>
  );
}
