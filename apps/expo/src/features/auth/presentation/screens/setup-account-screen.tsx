import { navigateToAppRoot } from '@features/auth/presentation/navigate-to-app-root';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';

import { Alert, Typography } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { iconSize, palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { ApiError } from '@/src/lib/http/api-error';
import { useTranslation } from '@/src/lib/i18n';

import { AUTH_TEST_IDS } from '../auth.copy';
import { AuthScreenLayout } from '../components/auth-screen-layout';
import { GradientCtaButton } from '../components/gradient-cta-button';
import { PasswordField } from '../components/password-field';
import { PasswordRulesChecklist } from '../components/password-rules-checklist';
import { useLogin } from '../hooks/use-auth';
import { useCompleteSetup } from '../hooks/use-complete-setup';
import { useValidateSetupToken } from '../hooks/use-validate-setup-token';
import { createSetupSchema, type SetupFormValues } from './setup-account-screen.schema';

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

export function SetupAccountScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  // Centre the heading only in the wide-web split panel. Mobile web uses the
  // native hero/card layout, which left-aligns like native.
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 768;
  const { token, purpose } = useLocalSearchParams<{ token: string; purpose?: string }>();

  const { mutate: completeSetup, isPending, error, isSuccess } = useCompleteSetup();
  const login = useLogin();
  const hasAutoSignedIn = useRef(false);

  // Validate the token on mount — stop refetching once the mutation succeeds
  // because the backend will have consumed the token by then.
  const {
    data: tokenData,
    isLoading: isValidating,
    isError: isTokenInvalid,
    error: tokenError,
  } = useValidateSetupToken(token, { enabled: !isSuccess });

  const setupSchema = useMemo(() => createSetupSchema(t), [t]);

  const { control, handleSubmit, watch } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  const isPasswordReset = tokenData?.purpose === 'PasswordReset' || purpose === 'reset';

  useEffect(() => {
    if (!isSuccess) return;

    if (isPasswordReset) {
      router.replace({ pathname: '/(auth)/login', params: { resetSuccess: '1' } });
      return;
    }

    // New-account setup: automatically sign the user in and drop them straight into
    // the app instead of making them re-enter credentials on the login screen.
    if (hasAutoSignedIn.current || !tokenData?.email) {
      if (!tokenData?.email) router.replace('/(auth)/login');
      return;
    }
    hasAutoSignedIn.current = true;

    login.mutate(
      { email: tokenData.email, password: passwordValue },
      {
        onSuccess: () => navigateToAppRoot(router),
        onError: () => router.replace('/(auth)/login'),
      },
    );
  }, [isSuccess, isPasswordReset, tokenData?.email, router, login, passwordValue]);

  const onSubmit = (values: SetupFormValues) => {
    if (!token) return;
    completeSetup({ token, newPassword: values.password });
  };

  // After a successful password set, show nothing while navigating to login.
  // The token is consumed — any re-validation would incorrectly show "invalid link".
  if (isSuccess) {
    return null;
  }

  if (!token) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background p-lg"
        testID={AUTH_TEST_IDS.setup.invalidLink}
      >
        <Alert variant="error" message={t('setup.invalidLink')} />
      </View>
    );
  }

  if (isValidating) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        testID={AUTH_TEST_IDS.setup.validating}
      >
        <Typography variant="body" className="text-text-secondary">
          {t('setup.validating')}
        </Typography>
      </View>
    );
  }

  if (isTokenInvalid) {
    // Backend now sends a specific reason (used / superseded by a newer link / expired /
    // deactivated) via ProblemDetails.Detail — prefer that over the generic fallback copy,
    // but only for genuine 4xx validation failures, not network/server errors.
    const specificReason =
      tokenError instanceof ApiError && !tokenError.isNetworkError && !tokenError.isServerError
        ? tokenError.message
        : undefined;

    return (
      <View
        className="flex-1 items-center justify-center bg-background p-lg"
        testID={AUTH_TEST_IDS.setup.tokenInvalid}
      >
        <Alert
          variant="error"
          message={
            specificReason ??
            (purpose === 'reset' ? t('setup.tokenExpiredPasswordReset') : t('setup.tokenExpired'))
          }
        />
      </View>
    );
  }

  const formContent = (
    <View className="w-full gap-lg">
      {/* Back button — matches admin portal */}
      <Pressable
        onPress={() => router.replace('/(auth)/login')}
        accessibilityRole="link"
        className="flex-row items-center gap-xs"
        testID={AUTH_TEST_IDS.setup.backButton}
      >
        <Icon name="chevron.left" size={iconSize.xs} color={palette.neutral[400]} />
        <Typography variant="body-sm" className="text-text-muted">
          {t('setup.backToLogin')}
        </Typography>
      </Pressable>

      <View className="gap-xs">
        <Typography variant="h1" className={isWideWeb ? 'text-center' : ''}>
          {isPasswordReset ? t('setup.titlePasswordReset') : t('setup.title')}
        </Typography>
        <Typography
          variant="body-sm"
          className={cn('text-text-secondary', isWideWeb && 'text-center')}
        >
          {isPasswordReset ? (
            <>
              {t('setup.subtitlePasswordReset')}
              {tokenData?.email ? (
                <>
                  {' '}
                  {t('setup.subtitlePasswordResetEmailPrefix')}{' '}
                  <Typography variant="body-sm" className="font-semibold text-primary">
                    {tokenData.email}
                  </Typography>
                </>
              ) : null}
            </>
          ) : (
            <>
              {t('setup.subtitle')}
              {tokenData?.email ? (
                <>
                  {' '}
                  {t('setup.subtitleEmailPrefix')}{' '}
                  <Typography variant="body-sm" className="font-semibold text-primary">
                    {tokenData.email}
                  </Typography>
                </>
              ) : null}
            </>
          )}
        </Typography>
      </View>

      {error ? (
        <Alert
          variant="error"
          message={isPasswordReset ? t('setup.errorPasswordReset') : t('setup.errorGeneric')}
        />
      ) : null}

      <PasswordField
        control={control}
        name="password"
        label={t('setup.passwordLabel')}
        placeholder={t('setup.passwordPlaceholder')}
        testID={AUTH_TEST_IDS.setup.passwordInput}
      />

      <PasswordField
        control={control}
        name="confirmPassword"
        label={t('setup.confirmPasswordLabel')}
        placeholder={t('setup.confirmPasswordPlaceholder')}
        testID={AUTH_TEST_IDS.setup.confirmPasswordInput}
      />

      <PasswordRulesChecklist
        password={passwordValue ?? ''}
        translationFn={t}
        i18nPrefix="setup.rules"
      />

      <GradientCtaButton
        onPress={handleSubmit(onSubmit)}
        loading={isPending}
        testID={AUTH_TEST_IDS.setup.submitButton}
      >
        {isPasswordReset ? t('setup.submitPasswordReset') : t('setup.submit')}
      </GradientCtaButton>
    </View>
  );

  return <AuthScreenLayout>{formContent}</AuthScreenLayout>;
}
