'use client';

import { AuthLayout } from '@features/auth/presentation/components/auth-layout';
import { useAuthButtonStyle } from '@features/auth/presentation/hooks/use-auth-button-style';
import { useRequestPasswordReset } from '@features/users/presentation/hooks/use-request-password-reset';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { ArrowBackIcon, EmailIcon, SuccessIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, FormField, notify, Typography } from '@/components/ui';

interface ForgotPasswordFormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const authButton = useAuthButtonStyle();
  const [submitted, setSubmitted] = useState(false);
  const { mutate: requestReset, isPending } = useRequestPasswordReset();

  const schema = z.object({
    email: z
      .string()
      .min(1, { error: t('auth:forgotPassword.validation.emailRequired') })
      .email({ error: t('auth:forgotPassword.validation.emailInvalid') }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    requestReset(values.email, {
      onError: () => {
        notify(t('auth:forgotPassword.requestError'), 'error', uiConfig.toast.errorDurationMs);
      },
      onSuccess: () => {
        setSubmitted(true);
      },
    });
  };

  return (
    <AuthLayout>
      {/* ── Back button — top-left of white panel ── */}
      <Link
        href="/login"
        className="absolute left-md top-md inline-flex items-center gap-xs text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowBackIcon size={iconSize.xs} />
        {t('auth:forgotPassword.backToLogin')}
      </Link>

      <div className="space-y-xl">
        {submitted ? (
          /* ── Success state ── */
          <div className="space-y-lg text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <SuccessIcon size={iconSize.lg} className="text-success" />
            </div>
            <div className="space-y-xs">
              <Typography variant="h1">{t('auth:forgotPassword.successTitle')}</Typography>
              <Typography variant="body" className="text-text-secondary">
                {t('auth:forgotPassword.successMessage')}
              </Typography>
            </div>
            <div className="flex items-center justify-center gap-xs rounded-lg border border-border bg-surface-secondary p-md">
              <EmailIcon size={iconSize.sm} className="shrink-0 text-text-secondary" />
              <Typography variant="body-sm" className="text-text-secondary">
                {t('auth:forgotPassword.checkSpam')}
              </Typography>
            </div>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="space-y-lg">
            <div className="space-y-xs">
              <Typography variant="h1">{t('auth:forgotPassword.title')}</Typography>
              <Typography variant="body" className="text-text-secondary">
                {t('auth:forgotPassword.subtitle')}
              </Typography>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-lg">
              <FormField
                label={t('auth:forgotPassword.emailLabel')}
                htmlFor="email"
                required
                error={errors.email?.message}
              >
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth:forgotPassword.emailPlaceholder')}
                  className="h-12 w-full rounded-md bg-input px-sm text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('email')}
                />
              </FormField>

              <Button
                type="submit"
                fullWidth
                isLoading={isPending}
                className={authButton.className}
                style={authButton.style}
              >
                {t('auth:forgotPassword.submitButton')}
              </Button>
            </form>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
