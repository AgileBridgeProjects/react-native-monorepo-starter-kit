import { navigateToAppRoot } from '@features/auth/presentation/navigate-to-app-root';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { Alert, OtpInput, Typography } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { iconSize, palette } from '@/constants/tokens';
import { getErrorMessage } from '@/src/lib/error-message';
import { useTranslation } from '@/src/lib/i18n';

import { AUTH_TEST_IDS } from '../auth.copy';
import { AuthScreenLayout } from '../components/auth-screen-layout';
import { GradientCtaButton } from '../components/gradient-cta-button';
import { useVerifyOtp } from '../hooks/use-auth';
import { devBootstrapPhone } from '../hooks/use-dev-bootstrap-phone';
import { useFinalizeAuthSession } from '../hooks/use-finalize-auth-session';
import { clearPhoneOtpTicket, getPhoneOtpTicket } from '../hooks/use-phone-confirmation';

type OtpFormValues = {
  otp: string;
};

export function OtpVerifyScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { mutate: verifyOtp, isPending, error } = useVerifyOtp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const finalizeAuthSession = useFinalizeAuthSession();

  const otpSchema = useMemo(
    () =>
      z.object({
        otp: z.string().length(6, t('otp.otpLength', { length: '6' })),
      }),
    [t],
  );

  const { control, handleSubmit } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = ({ otp }: OtpFormValues) => {
    if (isSubmitting) return;

    const ticket = getPhoneOtpTicket();
    if (!ticket) {
      router.replace('/(auth)/login');
      return;
    }

    setIsSubmitting(true);
    verifyOtp(
      { ticket, otp },
      {
        onSettled: () => setIsSubmitting(false),
        onSuccess: async ({ user, idToken }) => {
          // In dev, phone users have no club yet — auto-bootstrap them to the
          // seeded StarterKit dev club so the flow works without manual DB setup.
          if (__DEV__ && !user.clubId) {
            try {
              const result = await devBootstrapPhone(user, idToken);
              await finalizeAuthSession(result.user, result.idToken);
              clearPhoneOtpTicket();
              navigateToAppRoot(router);
              return;
            } catch (_bootstrapError) {
              // biome-ignore lint/suspicious/noConsole: dev-only diagnostic
              if (__DEV__) console.warn('Dev phone bootstrap failed:', _bootstrapError);
            }
          }
          // Normal path (has clubId) or bootstrap fallback.
          await finalizeAuthSession(user, idToken);
          clearPhoneOtpTicket();
          navigateToAppRoot(router);
        },
      },
    );
  };

  const errorMessage = getErrorMessage(error);

  const formContent = (
    <View className="w-full max-w-auth-form">
      {/* Back button — matches admin portal */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="link"
        className="flex-row items-center gap-xs mb-lg"
        testID={AUTH_TEST_IDS.otpVerify.backButton}
      >
        <Icon name="chevron.left" size={iconSize.xs} color={palette.neutral[400]} />
        <Typography variant="body-sm" className="text-text-muted">
          {t('otp.backButton')}
        </Typography>
      </Pressable>

      <Typography variant="h1" className="mb-xs">
        {t('otp.title')}
      </Typography>
      <Typography variant="body-sm" className="mb-xl text-text-secondary">
        {t('otp.subtitle', { phone: phone ?? '' })}
      </Typography>

      <Alert message={errorMessage} variant="error" />

      <Controller
        control={control}
        name="otp"
        render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
          <View className="mb-xl">
            <Typography variant="body-sm" className="text-text-secondary mb-sm">
              {t('otp.codeLabel')}
            </Typography>
            <OtpInput
              value={value}
              onChange={onChange}
              onComplete={() => handleSubmit(onSubmit)()}
              error={!!fieldError}
              errorMessage={fieldError?.message}
              testID={AUTH_TEST_IDS.otpVerify.codeInput}
            />
          </View>
        )}
      />

      <GradientCtaButton
        onPress={handleSubmit(onSubmit)}
        loading={isPending || isSubmitting}
        testID={AUTH_TEST_IDS.otpVerify.submitButton}
      >
        {t('otp.submitButton')}
      </GradientCtaButton>
    </View>
  );

  return <AuthScreenLayout>{formContent}</AuthScreenLayout>;
}
