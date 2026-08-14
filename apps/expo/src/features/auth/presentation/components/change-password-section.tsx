import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Alert, Button } from '@/components/ui';
import { useTranslation } from '@/src/lib/i18n';
import { useChangePassword } from '../hooks/use-change-password';
import { createSetupSchema, type SetupFormValues } from '../screens/setup-account-screen.schema';
import { PasswordField } from './password-field';
import { PasswordRulesChecklist } from './password-rules-checklist';

/**
 * Self-contained "change password" form, designed to sit as a section inside the
 * Edit profile screen. Owns its own form state, validation, and inline success /
 * error feedback so the host screen stays a thin composition.
 */
export function ChangePasswordSection() {
  const { t } = useTranslation('auth');
  const [showSuccess, setShowSuccess] = useState(false);

  const schema = useMemo(() => createSetupSchema(t), [t]);

  const { control, handleSubmit, watch, reset } = useForm<SetupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');
  const hasPasswordInput = passwordValue.length > 0 && confirmPasswordValue.length > 0;

  const { mutate: changePassword, isPending, error } = useChangePassword();

  const onSubmit = (values: SetupFormValues) => {
    setShowSuccess(false);
    changePassword(values.password, {
      onSuccess: () => {
        reset();
        setShowSuccess(true);
      },
    });
  };

  return (
    <View className="gap-md">
      {showSuccess && (
        <Alert
          variant="success"
          message={t('changePassword.successMessage')}
          onDismiss={() => setShowSuccess(false)}
        />
      )}

      {error && <Alert variant="error" message={t('changePassword.errorGeneric')} />}

      <PasswordField<SetupFormValues>
        control={control}
        name="password"
        label={t('changePassword.newPasswordLabel')}
        placeholder={t('changePassword.newPasswordPlaceholder')}
        variant="outlinedDark"
        size="auth"
      />

      <PasswordRulesChecklist password={passwordValue} translationFn={t} i18nPrefix="setup.rules" />

      <PasswordField<SetupFormValues>
        control={control}
        name="confirmPassword"
        label={t('changePassword.confirmPasswordLabel')}
        placeholder={t('changePassword.confirmPasswordPlaceholder')}
        variant="outlinedDark"
        size="auth"
      />

      <Button
        testID={AUTH_TEST_IDS.components.changePassword.submitButton}
        variant="primary"
        size="auth"
        onPress={handleSubmit(onSubmit)}
        loading={isPending}
        disabled={!hasPasswordInput}
        fullWidth
        textClassName="font-body-bold"
      >
        {t('changePassword.submitButton')}
      </Button>
    </View>
  );
}
