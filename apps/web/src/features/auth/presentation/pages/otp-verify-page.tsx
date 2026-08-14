'use client';

import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { AuthLayout } from '@features/auth/presentation/components/auth-layout';
import { useSendPhoneOtp, useVerifyOtp } from '@features/auth/presentation/hooks/use-auth';
import { useAuthButtonStyle } from '@features/auth/presentation/hooks/use-auth-button-style';
import {
  clearConfirmationResult,
  getConfirmationResult,
  setConfirmationResult,
} from '@features/auth/presentation/hooks/use-phone-confirmation';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useTranslation } from '@lib/i18n';
import { AuthFailure, getErrorMessage } from '@starterkit/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, OtpInput, Typography, toast } from '@/components/ui';

interface OtpFormValues {
  otp: string;
}

export function OtpVerifyPage() {
  const { t } = useTranslation();
  const authButton = useAuthButtonStyle();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const { mutate: verifyOtp, isPending } = useVerifyOtp();
  const { mutate: sendOtp, isPending: isResending } = useSendPhoneOtp();

  const otpSchema = z.object({
    otp: z
      .string()
      .length(6, { error: t('auth:otp.otpLength', { length: '6' }) })
      .regex(/^\d+$/, { error: t('auth:otp.otpLength', { length: '6' }) }),
  });

  const { control, handleSubmit } = useForm<OtpFormValues>({
    resolver: standardSchemaResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = ({ otp }: OtpFormValues) => {
    const ticket = getConfirmationResult();
    if (!ticket) {
      router.replace('/login/phone');
      return;
    }

    verifyOtp(
      { ticket, otp },
      {
        onSuccess: () => {
          clearConfirmationResult();
          router.replace('/');
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

  const onResend = () => {
    sendOtp(
      { phoneNumber: phone },
      {
        onSuccess: (ticket) => {
          setConfirmationResult(ticket);
          toast.success(t('auth:otp.resendSuccess'));
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

  // Mask the phone number for display: +27821234567 → +27 **** 4567
  const maskedPhone = phone.replace(/^(\+\d{2})(\d+)(\d{4})$/, (_, prefix, _mid, last4) => {
    return `${prefix} **** ${last4}`;
  });

  return (
    <AuthLayout>
      <div className="space-y-xl">
        <div>
          <Typography variant="h1">{t('auth:otp.title')}</Typography>
          <Typography variant="body-sm" className="mt-xs text-text-secondary">
            {t('auth:otp.subtitle', { phone: maskedPhone || phone })}
          </Typography>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-lg">
          <Controller
            control={control}
            name="otp"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <OtpInput
                value={value}
                onChange={onChange}
                onComplete={() => handleSubmit(onSubmit)()}
                error={!!error}
                errorMessage={error?.message}
                data-testid={AUTH_TEST_IDS.otpVerify.codeInput}
              />
            )}
          />

          <Button
            type="submit"
            fullWidth
            isLoading={isPending}
            data-testid={AUTH_TEST_IDS.otpVerify.submitButton}
            className={authButton.className}
            style={authButton.style}
          >
            {isPending ? t('common:actions.signingIn') : t('auth:otp.submitButton')}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-xs text-center text-sm text-text-secondary">
          <Button
            variant="ghost"
            type="button"
            onClick={onResend}
            disabled={isResending}
            className="text-primary underline-offset-4 hover:underline"
            data-testid={AUTH_TEST_IDS.otpVerify.resendButton}
          >
            {isResending ? t('common:actions.saving') : t('auth:otp.resendButton')}
          </Button>
          <Link
            href="/login/phone"
            className="text-primary underline-offset-4 hover:underline"
            data-testid={AUTH_TEST_IDS.otpVerify.backButton}
          >
            {t('auth:otp.backButton')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
