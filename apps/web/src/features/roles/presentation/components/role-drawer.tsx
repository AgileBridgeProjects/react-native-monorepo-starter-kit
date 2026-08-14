'use client';

import { useClubOptions } from '@features/clubs/presentation/hooks/use-club-options';
import type { Role } from '@features/roles/domain/entities/role';
import { useCreateRole } from '@features/roles/presentation/hooks/use-create-role';
import { useUpdateRole } from '@features/roles/presentation/hooks/use-update-role';
import { useConfirm } from '@lib/hooks/use-confirm';
import { ApiError } from '@lib/http';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ConfirmDialog,
  DrawerFooter,
  DrawerPanel,
  FeatureToggleCard,
  FormField,
  TextAreaField,
  toast,
} from '@/components/ui';
import { Typography } from '@/components/ui/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleDrawerProps {
  visible: boolean;
  onHide: () => void;
  onSaved: () => void;
  role?: Role | null;
}

interface RoleFormValues {
  name: string;
  description: string;
  isElevated: boolean;
  isPortalRole: boolean;
  clubId: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoleDrawer({ visible, onHide, onSaved, role }: RoleDrawerProps) {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const isEditing = !!role;
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const { mutate: createRole, isPending: isCreating } = useCreateRole();
  const { mutate: updateRole, isPending: isUpdating } = useUpdateRole();
  const { data: clubs = [] } = useClubOptions();
  const isPending = isCreating || isUpdating;

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isDirty, isValid },
  } = useForm<RoleFormValues>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      isElevated: false,
      isPortalRole: false,
      clubId: null,
    },
  });

  useEffect(() => {
    if (visible) {
      reset({
        name: role?.name ?? '',
        description: role?.description ?? '',
        isElevated: role?.isElevated ?? false,
        isPortalRole: role?.isPortalRole ?? false,
        clubId: role?.clubId ?? null,
      });
    }
  }, [visible, role, reset]);

  function handleHide() {
    if (isPending) return;
    if (isDirty) {
      setIsDiscardOpen(true);
      return;
    }
    onHide();
  }

  function onSubmit(values: RoleFormValues) {
    const description = values.description.trim() || null;
    void submitWithConfirmation(values, description);
  }

  async function submitWithConfirmation(values: RoleFormValues, description: string | null) {
    const confirmed = await confirm({
      title: isEditing ? t('roles:confirm.save.editTitle') : t('roles:confirm.save.createTitle'),
      message: isEditing
        ? t('roles:confirm.save.editMessage', { name: values.name.trim() })
        : t('roles:confirm.save.createMessage', { name: values.name.trim() }),
      confirmLabel: isEditing
        ? t('roles:confirm.save.editTitle')
        : t('roles:confirm.save.createTitle'),
    });
    if (!confirmed) return;

    if (isEditing) {
      updateRole(
        {
          id: role.id,
          name: values.name.trim(),
          description,
          isElevated: values.isElevated,
          isPortalRole: values.isPortalRole,
          clubId: values.clubId,
        },
        {
          onSuccess: () => {
            toast.success(t('roles:toast.updated'), { duration: uiConfig.toast.durationMs });
            onSaved();
          },
          onError: (error: unknown) => {
            const msg =
              error instanceof ApiError && error.isConflict
                ? error.message
                : t('roles:toast.updateFailed');
            toast.error(msg, { duration: uiConfig.toast.errorDurationMs });
          },
        },
      );
    } else {
      createRole(
        {
          name: values.name.trim(),
          description,
          isElevated: values.isElevated,
          isPortalRole: values.isPortalRole,
          clubId: values.clubId,
        },
        {
          onSuccess: () => {
            toast.success(t('roles:toast.created'), { duration: uiConfig.toast.durationMs });
            onSaved();
          },
          onError: (error: unknown) => {
            const msg =
              error instanceof ApiError && error.isConflict
                ? error.message
                : t('roles:toast.createFailed');
            toast.error(msg, { duration: uiConfig.toast.errorDurationMs });
          },
        },
      );
    }
  }

  const bottomContent = (
    <DrawerFooter
      cancelLabel={t('buttons:cancel')}
      onCancel={handleHide}
      cancelDisabled={isPending}
      submitLabel={isEditing ? t('buttons:saveChanges') : t('roles:actions.createRole')}
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isPending}
      disabled={isPending || !isValid}
      submitTestId={isEditing ? 'edit-role-submit-button' : 'add-role-submit-button'}
    />
  );

  return (
    <>
      {confirmDialog}
      <ConfirmDialog
        visible={isDiscardOpen}
        title={t('common:confirm.unsavedChanges.title')}
        message={t('common:confirm.unsavedChanges.message')}
        confirmLabel={t('common:confirm.unsavedChanges.discard')}
        cancelLabel={t('common:confirm.unsavedChanges.keepEditing')}
        onConfirm={() => {
          setIsDiscardOpen(false);
          onHide();
        }}
        onCancel={() => setIsDiscardOpen(false)}
        destructive
      />
      <DrawerPanel
        visible={visible}
        onHide={handleHide}
        title={isEditing ? t('roles:drawer.editTitle') : t('roles:drawer.createTitle')}
        bottomContent={bottomContent}
        data-testid="role-drawer"
      >
        <div className="space-y-md p-lg">
          <FormField
            label={t('roles:fields.name')}
            htmlFor="role-name"
            required
            error={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              rules={{
                validate: (value) => value.trim().length > 0 || t('roles:validation.nameRequired'),
                maxLength: {
                  value: 64,
                  message: t('roles:validation.nameMaxLength'),
                },
              }}
              render={({ field }) => (
                <TextBox
                  inputAttr={{
                    id: 'role-name',
                    'aria-describedby': errors.name ? 'role-name-error' : undefined,
                    'aria-invalid': errors.name ? 'true' : undefined,
                  }}
                  value={field.value}
                  onValueChanged={(e) => field.onChange(e.value ?? '')}
                  onFocusOut={() => field.onBlur()}
                  valueChangeEvent="input"
                  placeholder={t('roles:fields.namePlaceholder')}
                  stylingMode="outlined"
                  maxLength={64}
                />
              )}
            />
          </FormField>

          <Controller
            name="description"
            control={control}
            rules={{
              maxLength: { value: 500, message: t('roles:validation.descriptionMaxLength') },
            }}
            render={({ field }) => (
              <TextAreaField
                id="role-description"
                label={t('roles:fields.description')}
                value={field.value ?? ''}
                onChange={field.onChange}
                onFocusOut={() => field.onBlur()}
                placeholder={t('roles:fields.descriptionPlaceholder')}
                error={errors.description?.message}
                maxLength={500}
                height={92}
              />
            )}
          />

          <FormField label={t('roles:fields.club')} htmlFor="role-club">
            <Controller
              name="clubId"
              control={control}
              render={({ field }) => (
                <SelectBox
                  id="role-club"
                  dataSource={clubs}
                  displayExpr="name"
                  valueExpr="id"
                  value={field.value}
                  onValueChanged={(e) => field.onChange(e.value ?? null)}
                  placeholder={t('roles:fields.clubPlaceholder')}
                  searchEnabled
                  showClearButton
                />
              )}
            />
            <Typography variant="caption" className="mt-xs block text-text-muted">
              {t('roles:fields.clubHint')}
            </Typography>
          </FormField>

          <FeatureToggleCard
            id="role-portal-role"
            label={t('roles:fields.portalRole')}
            description={t('roles:fields.portalRoleHint')}
            checked={watch('isPortalRole')}
            onCheckedChange={(checked) => setValue('isPortalRole', checked, { shouldDirty: true })}
          />

          <FeatureToggleCard
            id="role-elevated-role"
            label={t('roles:fields.elevatedRole')}
            description={t('roles:fields.elevatedRoleHint')}
            checked={watch('isElevated')}
            onCheckedChange={(checked) => setValue('isElevated', checked, { shouldDirty: true })}
          />
        </div>
      </DrawerPanel>
    </>
  );
}
