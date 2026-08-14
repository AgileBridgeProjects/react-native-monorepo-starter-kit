import { useTranslation } from '@lib/i18n';
import { ScrollView } from 'react-native';
import { Card, GradientBackground, Typography } from '@/components/ui';

export const HOME_TEST_IDS = {
  screen: 'home-screen',
  welcomeCard: 'home-welcome-card',
} as const;

/**
 * Starter-kit placeholder home screen.
 *
 * Deliberately minimal: one welcome card pointing at the docs. Replace this screen
 * with your app's real home content — scaffold a feature with
 * `npm run scaffold:frontend -- --feature <name> --app expo` and follow the
 * Screen → Hook → Datasource → Proxy layering described in
 * `docs/standards/frontend-mobile.md`.
 */
export function HomeScreen() {
  const { t } = useTranslation('home');

  return (
    <GradientBackground headerClearance="tab" testID={HOME_TEST_IDS.screen}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg px-lg py-lg w-full self-center md:max-w-reading"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Card className="gap-sm" testID={HOME_TEST_IDS.welcomeCard}>
          <Typography variant="h2">{t('placeholderTitle')}</Typography>
          <Typography variant="body" className="text-text-secondary">
            {t('placeholderBody')}
          </Typography>
          <Typography variant="caption" className="text-text-muted">
            {t('placeholderDocsHint')}
          </Typography>
        </Card>
      </ScrollView>
    </GradientBackground>
  );
}
