import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { useTranslation } from '@lib/i18n';
import { iconSize } from '@starterkit/shared';
import { View } from 'react-native';
import { Typography } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors } from '@/constants/tokens';

interface SelectOrgHeaderProps {
  scheme: keyof typeof colors;
}

export function SelectOrgHeader({ scheme }: SelectOrgHeaderProps) {
  const { t } = useTranslation('auth');

  return (
    <View
      testID={AUTH_TEST_IDS.components.selectOrgHeader}
      className="w-full max-w-auth-form items-center mb-2xl"
    >
      <View className="mb-lg h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <IconSymbol name="building.2.fill" size={iconSize.md} color={colors[scheme].primary} />
      </View>
      <Typography variant="h1" className="text-center mb-xs">
        {t('selectOrg.title')}
      </Typography>
      <Typography variant="body-sm" className="text-center text-text-secondary px-md">
        {t('selectOrg.subtitle')}
      </Typography>
    </View>
  );
}
