'use client';

import { PasswordField } from '@features/auth/presentation/components/password-field';
import { useTranslation } from '@lib/i18n';
import { CheckIcon, CloseIcon, WarningIcon } from '@starterkit/icons';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '@starterkit/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DrawerFooter, DrawerPanel, StatusBadge, Typography } from '@/components/ui';
import { cn } from '@/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChangePasswordDrawerProps {
  visible: boolean;
  userName: string;
  isSelf: boolean;
  isPending: boolean;
  onConfirm: (newPassword: string) => void;
  onCancel: () => void;
}

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChangePasswordDrawer({
  visible,
  userName,
  isSelf,
  isPending,
  onConfirm,
  onCancel,
}: ChangePasswordDrawerProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const passwordValue = watch('newPassword');

  // Clear the form whenever the drawer closes — covers both the cancel path and the
  // parent closing the drawer after a successful change.
  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  function handleCancel() {
    reset();
    onCancel();
  }

  function onSubmit(data: FormValues) {
    if (data.newPassword !== data.confirmPassword) return;
    onConfirm(data.newPassword);
  }

  const contextContent = isSelf ? (
    <div className="flex items-start gap-sm rounded-md border border-warning bg-warning/10 p-sm">
      <WarningIcon className="mt-0.5 shrink-0 text-warning" />
      <Typography variant="body-sm" className="text-warning">
        {t('users:changePassword.selfWarning')}
      </Typography>
    </div>
  ) : (
    <Typography variant="body-sm" className="text-text-secondary">
      {t('users:changePassword.description')}{' '}
      <span className="font-semibold text-primary">{userName}</span>.
    </Typography>
  );

  const bottomContent = (
    <DrawerFooter
      cancelLabel={t('buttons:cancel')}
      onCancel={handleCancel}
      submitLabel={
        isSelf ? t('users:changePassword.confirmSelf') : t('users:changePassword.confirm')
      }
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isPending}
      disabled={isPending}
      submitTestId="change-password-submit"
    />
  );

  return (
    <DrawerPanel
      visible={visible}
      onHide={handleCancel}
      title={t('users:changePassword.title')}
      subtitle={isSelf ? undefined : userName}
      badge={
        isSelf ? <StatusBadge label={t('users:indicator.you')} variant="primary" /> : undefined
      }
      bottomContent={bottomContent}
      data-testid="change-password-drawer"
    >
      <div className="space-y-md">
        {contextContent}

        <div className="flex flex-col gap-xs">
          <PasswordField
            id="new-password"
            label={t('users:changePassword.newPasswordLabel')}
            placeholder={t('users:changePassword.newPasswordPlaceholder')}
            error={errors.newPassword?.message}
            showLabel={t('common:actions.show')}
            hideLabel={t('common:actions.hide')}
            registration={register('newPassword', {
              required: t('errors:validation.required'),
              validate: (v) =>
                PASSWORD_RULES.every((r) => r.test(v)) ||
                t('users:changePassword.passwordComplexity'),
            })}
          />
          {passwordValue && (
            <div className="flex flex-col gap-1 pl-xs">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(passwordValue);
                return (
                  <p
                    key={rule.key}
                    className={cn(
                      'flex items-center gap-1 text-xs',
                      met ? 'text-success' : 'text-error',
                    )}
                  >
                    {met ? (
                      <CheckIcon className="size-3 shrink-0" />
                    ) : (
                      <CloseIcon className="size-3 shrink-0" />
                    )}
                    {t(`users:changePassword.rules.${rule.key}`, { min: PASSWORD_MIN_LENGTH })}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        <PasswordField
          id="confirm-password"
          label={t('users:changePassword.confirmPasswordLabel')}
          placeholder={t('users:changePassword.confirmPasswordPlaceholder')}
          error={errors.confirmPassword?.message}
          showLabel={t('common:actions.show')}
          hideLabel={t('common:actions.hide')}
          registration={register('confirmPassword', {
            required: t('errors:validation.required'),
            validate: (value, formValues) =>
              value === formValues.newPassword || t('users:changePassword.passwordsMismatch'),
          })}
        />
      </div>
    </DrawerPanel>
  );
}
