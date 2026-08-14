import { useTranslation } from '@lib/i18n';
import Svg, { Rect } from 'react-native-svg';

import { SocialSignInButton } from './social-sign-in-button';

interface MicrosoftSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
}

/** Official Microsoft four-square logo — brand colors. */
function MicrosoftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 21 21">
      <Rect x={1} y={1} width={9} height={9} fill="#F25022" />
      <Rect x={11} y={1} width={9} height={9} fill="#7FBA00" />
      <Rect x={1} y={11} width={9} height={9} fill="#00A4EF" />
      <Rect x={11} y={11} width={9} height={9} fill="#FFB900" />
    </Svg>
  );
}

export function MicrosoftSignInButton({
  onPress,
  loading,
  disabled,
  fullWidth,
  testID,
}: MicrosoftSignInButtonProps) {
  const { t } = useTranslation('auth');

  return (
    <SocialSignInButton
      icon="windows"
      brandIcon={<MicrosoftIcon />}
      label={t('microsoft.signInWithMicrosoft')}
      accessibilityLabel={t('microsoft.signInWithMicrosoftA11y')}
      fullWidth={fullWidth}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      testID={testID}
    />
  );
}
