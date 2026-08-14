import { navigateToAppRoot } from '@features/auth/presentation/navigate-to-app-root';
import { zodResolver } from '@hookform/resolvers/zod';
import { CUSTOM_AUTH_EMAIL_DOMAIN } from '@starterkit/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Platform, Pressable, View } from 'react-native';
import { z } from 'zod';

import volleyballMesh from '@/assets/images/volleyball-mesh.png';
import { Alert, Button, FormField, Typography } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { iconSize, palette } from '@/constants/tokens';
import { getErrorMessage } from '@/src/lib/error-message';
import { isSocialAuthEnabled } from '@/src/lib/feature-flags';
import { useTranslation } from '@/src/lib/i18n';

import { AUTH_TEST_IDS } from '../auth.copy';
import { AppleSignInButton } from '../components/apple-sign-in-button';
import { AUTH_MESH_A11Y_LABEL } from '../components/auth-gradient-hero';
import { AuthScreenLayout } from '../components/auth-screen-layout';
import { GoogleSignInButton } from '../components/google-sign-in-button';
import { useAppleSignIn } from '../hooks/use-apple-sign-in';
import { useLogin } from '../hooks/use-auth';

// ─── Types ───────────────────────────────────────────────────────────────────

type LoginFormValues = { email: string; password: string };

// ─── Component ───────────────────────────────────────────────────────────────

export function LoginScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { resetSuccess } = useLocalSearchParams<{ resetSuccess?: string }>();

  const { mutate: login, isPending, error, reset: resetLogin } = useLogin();

  // Sign in with Apple is offered on iOS only (App Store requirement when other
  // social logins exist). The hook itself re-checks `isAvailableAsync()` before
  // raising the native sheet, so an unavailable device fails gracefully rather
  // than needing a second async gate here that would flicker the button.
  const showApple = Platform.OS === 'ios';
  const {
    signIn: signInWithApple,
    isLoading: isApplePending,
    error: appleError,
  } = useAppleSignIn(() => navigateToAppRoot(router));

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t('login.emailOrUsernameRequired'))
          .refine((val) => !val.includes('@') || z.string().email().safeParse(val).success, {
            message: t('validation.emailInvalid'),
          }),
        password: z.string().min(1, t('validation.passwordRequired')),
      }),
    [t],
  );

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginFormValues) => {
    const email = values.email.includes('@')
      ? values.email
      : `${values.email}${CUSTOM_AUTH_EMAIL_DOMAIN}`;
    login({ email, password: values.password }, { onSuccess: () => navigateToAppRoot(router) });
  };

  const emailErrorMessage = getErrorMessage(error);

  const emailIcon = <Icon name="envelope" size={iconSize.sm} color={palette.white.DEFAULT} />;
  const lockIcon = <Icon name="lock.fill" size={iconSize.sm} color={palette.white.DEFAULT} />;

  // Social sign-in is visual only for now — auth is moving to Supabase.
  const noop = () => {};

  // Social providers ship email/password-only for now; the GoTrue providers are
  // disabled, so gate the whole social section behind EXPO_PUBLIC_SOCIAL_AUTH_ENABLED.
  const socialAuthEnabled = isSocialAuthEnabled();

  return (
    <AuthScreenLayout
      cardVariant="dark"
      heroImage={volleyballMesh}
      heroImageA11yLabel={AUTH_MESH_A11Y_LABEL}
    >
      <Typography variant="h1" className="mb-lg text-center uppercase text-white">
        {t('login.title')}
      </Typography>

      {resetSuccess ? <Alert message={t('login.resetSuccess')} variant="success" /> : null}
      <Alert message={emailErrorMessage} variant="error" onDismiss={resetLogin} />
      {appleError ? <Alert message={getErrorMessage(appleError)} variant="error" /> : null}

      <FormField<LoginFormValues>
        control={control}
        name="email"
        variant="outlinedDark"
        size="auth"
        label={t('login.emailLabel')}
        floatingLabel
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon={emailIcon}
        testID={AUTH_TEST_IDS.login.emailInput}
      />
      <FormField<LoginFormValues>
        control={control}
        name="password"
        variant="outlinedDark"
        size="auth"
        label={t('login.passwordLabel')}
        floatingLabel
        secureTextEntry
        containerClassName="mb-sm"
        leftIcon={lockIcon}
        testID={AUTH_TEST_IDS.login.passwordInput}
      />

      {/* Forgot password */}
      <View className="mb-md flex-row items-center justify-end">
        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          accessibilityRole="link"
          testID={AUTH_TEST_IDS.login.forgotPassword}
          className="touch-target justify-center"
        >
          <Typography variant="caption" className="text-white underline">
            {t('login.forgotPassword')}
          </Typography>
        </Pressable>
      </View>

      {/* Legal microcopy, deliberately quieter than the form around it —
          `text-2xs` (9px) so it reads as a footnote rather than competing with
          the fields, and takes fewer lines than caption size did. */}
      <Typography variant="caption" className="mb-lg text-left text-2xs text-white/70">
        {t('login.terms')}
      </Typography>

      <Button
        variant="primary"
        size="auth"
        fullWidth
        onPress={handleSubmit(onSubmit)}
        loading={isPending}
        testID={AUTH_TEST_IDS.login.submitButton}
        className="mb-md"
        textClassName="font-body-bold"
      >
        {t('login.submitButton')}
      </Button>

      {socialAuthEnabled ? (
        <>
          {/* Or login with */}
          <View className="my-md flex-row items-center">
            <View className="h-px flex-1 bg-white/20" />
            <Typography variant="caption" className="mx-md text-white/70">
              {t('social.orLoginWith')}
            </Typography>
            <View className="h-px flex-1 bg-white/20" />
          </View>

          <View className="flex-row gap-sm">
            <GoogleSignInButton onPress={noop} testID={AUTH_TEST_IDS.login.googleButton} />
            {showApple ? (
              <AppleSignInButton
                onPress={signInWithApple}
                loading={isApplePending}
                testID={AUTH_TEST_IDS.login.appleButton}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </AuthScreenLayout>
  );
}
