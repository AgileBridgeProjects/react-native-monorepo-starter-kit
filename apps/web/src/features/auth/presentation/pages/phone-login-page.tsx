'use client';

import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { AuthLayout } from '@features/auth/presentation/components/auth-layout';
import { useSendPhoneOtp } from '@features/auth/presentation/hooks/use-auth';
import { useAuthButtonStyle } from '@features/auth/presentation/hooks/use-auth-button-style';
import { setConfirmationResult } from '@features/auth/presentation/hooks/use-phone-confirmation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@lib/i18n';
import {
  AuthFailure,
  DEFAULT_PHONE_COUNTRY,
  getCountryName,
  getErrorMessage,
  isValidPhone,
  toInternational,
} from '@starterkit/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, CountryPhoneInput, Typography, toast } from '@/components/ui';

interface PhoneLoginFormValues {
  phoneLocal: string;
  countryCode: string;
}

export function PhoneLoginPage() {
  const { t } = useTranslation();
  const authButton = useAuthButtonStyle();
  const router = useRouter();
  const { mutate: sendOtp, isPending } = useSendPhoneOtp();

  const phoneSchema = z
    .object({
      phoneLocal: z.string().min(1, { error: t('auth:phone.phoneRequired') }),
      countryCode: z.string(),
    })
    .superRefine((data, ctx) => {
      if (!isValidPhone(data.phoneLocal, data.countryCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('auth:phone.phoneInvalid'),
          path: ['phoneLocal'],
        });
      }
    });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PhoneLoginFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneLocal: '', countryCode: DEFAULT_PHONE_COUNTRY },
  });

  const countryCode = watch('countryCode');

  const onSubmit = ({ phoneLocal, countryCode: cc }: PhoneLoginFormValues) => {
    const phoneNumber = toInternational(phoneLocal, cc);

    sendOtp(
      { phoneNumber },
      {
        onSuccess: (ticket) => {
          setConfirmationResult(ticket);
          router.push(`/login/otp-verify?phone=${encodeURIComponent(phoneNumber)}`);
        },
        onError: (error) => {
          const message =
            error instanceof AuthFailure
              ? t(`errors:${error.localeKey}`, error.localeParams)
              : (getErrorMessage(error) ?? t('errors:genericError'));
          toast.error(message);
        },
      },
    );
  };

  return (
    <AuthLayout>
      <div className="space-y-xl">
        <div>
          <Typography variant="h1">{t('auth:phone.title')}</Typography>
          <Typography variant="body-sm" className="mt-xs text-text-secondary">
            {t('auth:phone.subtitle')}
          </Typography>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-lg">
          <Controller
            name="countryCode"
            control={control}
            render={({ field: ccField }) => (
              <Controller
                name="phoneLocal"
                control={control}
                render={({ field: phoneField }) => (
                  <CountryPhoneInput
                    countryCode={ccField.value}
                    onCountryChange={ccField.onChange}
                    phoneNumber={phoneField.value}
                    onPhoneChange={phoneField.onChange}
                    error={
                      errors.phoneLocal?.message
                        ? t(errors.phoneLocal.message, { country: getCountryName(countryCode) })
                        : undefined
                    }
                    testID={AUTH_TEST_IDS.phoneLogin.phoneInput}
                  />
                )}
              />
            )}
          />

          <Button
            type="submit"
            fullWidth
            isLoading={isPending}
            data-testid={AUTH_TEST_IDS.phoneLogin.submitButton}
            className={authButton.className}
            style={authButton.style}
          >
            {isPending ? t('common:actions.signingIn') : t('auth:phone.submitButton')}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            {t('auth:phone.backToEmail')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
