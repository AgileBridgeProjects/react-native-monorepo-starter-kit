import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { CheckmarkIcon, CloseIcon } from '@starterkit/icons';
import { iconSize, PASSWORD_MIN_LENGTH, PASSWORD_RULES, palette } from '@starterkit/shared';
import { View } from 'react-native';

import { Typography } from '@/components/ui';
import { cn } from '@/src/lib/cn';

interface PasswordRulesChecklistProps {
  password: string;
  translationFn: (key: string, options?: Record<string, unknown>) => string;
  i18nPrefix: string;
}

export function PasswordRulesChecklist({
  password,
  translationFn: t,
  i18nPrefix,
}: PasswordRulesChecklistProps) {
  if (!password || password.length === 0) return null;

  return (
    <View className="gap-xs">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View
            key={rule.key}
            testID={AUTH_TEST_IDS.components.passwordRules.rule(rule.key)}
            accessibilityState={{ checked: met }}
            className="flex-row items-center gap-1"
            accessibilityLabel={`${t(`${i18nPrefix}.${rule.key}`, { min: PASSWORD_MIN_LENGTH })}: ${met ? t('common:met') : t('common:notMet')}`}
          >
            {met ? (
              <CheckmarkIcon size={iconSize.xs} color={palette.status.success} />
            ) : (
              <CloseIcon size={iconSize.xs} color={palette.status.error} />
            )}
            <Typography
              variant="caption"
              className={cn('text-xs', met ? 'text-success' : 'text-error')}
            >
              {t(`${i18nPrefix}.${rule.key}`, { min: PASSWORD_MIN_LENGTH })}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}
