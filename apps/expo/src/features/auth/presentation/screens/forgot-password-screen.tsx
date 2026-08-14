import { zodResolver } from '@hookform/resolvers/zod';
import { CUSTOM_AUTH_EMAIL_DOMAIN } from '@starterkit/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import volleyballMesh from '@/assets/images/volleyball-mesh.png';
import { Button, FormField, Typography } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { iconSize, palette } from '@/constants/tokens';
import { useTranslation } from '@/src/lib/i18n';

import { AUTH_TEST_IDS } from '../auth.copy';
import { AUTH_MESH_A11Y_LABEL } from '../components/auth-gradient-hero';
import { AuthScreenLayout } from '../components/auth-screen-layout';
import { useRequestPasswordReset } from '../hooks/use-request-password-reset';

// ─── Schema ──────────────────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

export function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, { message: t('forgotPassword.emailRequired') })
          .email({ message: t('forgotPassword.emailInvalid') })
          .refine((val) => !val.toLowerCase().endsWith(CUSTOM_AUTH_EMAIL_DOMAIN), {
            message: t('forgotPassword.emailNotEligible'),
          }),
      }),
    [t],
  );

  type ForgotPasswordFormValues = z.infer<typeof schema>;

  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const { mutate: sendReset, isPending } = useRequestPasswordReset();

  const onSubmit = (values: ForgotPasswordFormValues) => {
    sendReset(values.email, {
      onSettled: () => {
        // Always show success — never reveal whether the email exists (OWASP)
        setSubmitted(true);
      },
    });
  };

  const emailIcon = <Icon name="envelope" size={iconSize.sm} color={palette.white.DEFAULT} />;

  const successIcon = (
    <Icon name="checkmark.circle.fill" size={iconSize.lg} color={palette.status.success} />
  );

  return (
    <AuthScreenLayout
      cardVariant="dark"
      heroImage={volleyballMesh}
      heroImageA11yLabel={AUTH_MESH_A11Y_LABEL}
      // Forgot-password has little content (one field + button), so grow the
      // hero and shorten the card rather than stretching it full-height — but
      // not so much that the CTA is pushed off the bottom. The Sign-In screen
      // omits this prop and keeps the default taller card.
      heroExpandedRatio={0.48}
    >
      {/* Back button */}
      <Pressable
        onPress={() => router.replace('/(auth)/login')}
        accessibilityRole="link"
        className="flex-row items-center gap-xs mb-xl"
        testID={AUTH_TEST_IDS.forgotPassword.backButton}
      >
        <Icon name="chevron.left" size={iconSize.xs} color={palette.white.DEFAULT} />
        <Typography variant="body-sm" className="text-white">
          {t('forgotPassword.backToLogin')}
        </Typography>
      </Pressable>

      <Typography variant="h1" className="mb-xs text-white">
        {t('forgotPassword.title')}
      </Typography>
      {!submitted && (
        <Typography variant="body-sm" className="mb-2xl text-white/70">
          {t('forgotPassword.subtitle')}
        </Typography>
      )}

      {submitted ? (
        <View
          className="rounded-xl border border-white/20 bg-white/10 p-lg gap-sm items-center"
          testID={AUTH_TEST_IDS.forgotPassword.successCard}
        >
          {successIcon}
          <Typography variant="body" className="text-center font-semibold text-white">
            {t('forgotPassword.successTitle')}
          </Typography>
          <Typography variant="body-sm" className="text-center text-white/70">
            {t('forgotPassword.successMessage')}
          </Typography>
        </View>
      ) : (
        <>
          <FormField<ForgotPasswordFormValues>
            control={control}
            name="email"
            variant="outlinedDark"
            size="auth"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('forgotPassword.emailPlaceholder')}
            leftIcon={emailIcon}
            testID={AUTH_TEST_IDS.forgotPassword.emailInput}
          />

          <View className="mt-lg">
            <Button
              variant="primary"
              size="auth"
              fullWidth
              onPress={handleSubmit(onSubmit)}
              loading={isPending}
              testID={AUTH_TEST_IDS.forgotPassword.submitButton}
              textClassName="font-body-bold"
            >
              {t('forgotPassword.submitButton')}
            </Button>
          </View>
        </>
      )}
    </AuthScreenLayout>
  );
}
