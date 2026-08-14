import { useTranslation } from '@lib/i18n';

import { SocialSignInButton } from './social-sign-in-button';

interface PhoneSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  fullWidth?: boolean;
  testID?: string;
}

export function PhoneSignInButton({ onPress, loading, fullWidth, testID }: PhoneSignInButtonProps) {
  const { t } = useTranslation('auth');
  return (
    <SocialSignInButton
      icon="phone.fill"
      label={t('phone.signInWithPhone')}
      accessibilityLabel={t('phone.signInWithPhone')}
      fullWidth={fullWidth}
      onPress={onPress}
      loading={loading}
      testID={testID}
    />
  );
}
