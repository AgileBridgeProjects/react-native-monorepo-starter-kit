'use client';

import type { Team } from '@features/clubs/domain/entities/team';
import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import { LogoUploadField } from '@features/clubs/presentation/components/logo-upload-field';
import { useCreateTeam } from '@features/clubs/presentation/hooks/use-create-team';
import { useCurrentSeason } from '@features/clubs/presentation/hooks/use-current-season';
import { useUpdateTeam } from '@features/clubs/presentation/hooks/use-update-team';
import {
  AGE_GROUPS,
  TEAM_DESCRIPTION_MAX,
  TEAM_NAME_MAX,
  type TeamFormData,
  teamSchema,
} from '@features/clubs/presentation/utils/team-schema';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ApiError } from '@lib/http';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { DrawerFooter, DrawerPanel, FormField, notify, Typography } from '@/components/ui';

// ─── Props ───────────────────────────────────────────────────────────────────

const EMPTY_VALUES: TeamFormData = {
  name: '',
  description: '',
  ageGroup: '',
  logoUrl: '',
};

interface TeamDialogProps {
  /** The club this team belongs to (fixed — this dialog never lets the user change club). */
  clubId: string;
  /**
   * The team to edit. Pass `null` to open in add (create) mode.
   * When provided, the form is pre-populated.
   */
  team: Team | null;
  visible: boolean;
  onHide: () => void;
  /** Called after a successful create so the caller can reload the store. */
  onCreated: () => void;
  /** Called after a successful update so the caller can reload the store. */
  onUpdated: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TeamDialog({
  clubId,
  team,
  visible,
  onHide,
  onCreated,
  onUpdated,
}: TeamDialogProps) {
  const { t } = useTranslation();
  const isEditMode = team !== null;

  const { mutate: createTeam, isPending: isCreating } = useCreateTeam();
  const { mutate: updateTeam, isPending: isUpdating } = useUpdateTeam();
  const isPending = isCreating || isUpdating;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<TeamFormData>({
    resolver: standardSchemaResolver(teamSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onChange',
  });

  // Season the new team will be created into (AC #1.2 — the admin must see which
  // season a team is being created for). Not fetched in edit mode — a team's
  // season never changes after creation.
  const {
    data: currentSeason,
    isLoading: isSeasonLoading,
    isError: isSeasonError,
  } = useCurrentSeason(!isEditMode && visible ? clubId : null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  function handleLogoFile(file: File) {
    setIsUploadingLogo(true);
    clubDatasource
      .uploadLogo(file)
      .then((url) => {
        setLogoPreview(url);
        setValue('logoUrl', url, { shouldDirty: true, shouldValidate: true });
      })
      .catch(() =>
        notify(t('errors:club.toast.logoUploadFailed'), 'error', uiConfig.toast.errorDurationMs),
      )
      .finally(() => setIsUploadingLogo(false));
  }

  function handleLogoRemove() {
    setLogoPreview(null);
    setValue('logoUrl', '');
  }

  function handleHide() {
    reset(EMPTY_VALUES);
    setLogoPreview(null);
    onHide();
  }

  // Sync form values each time the drawer becomes visible
  useEffect(() => {
    if (!visible) return;
    if (isEditMode) {
      reset({
        name: team.name,
        description: team.description ?? '',
        ageGroup: team.ageGroup ?? '',
        logoUrl: team.logoUrl ?? '',
      });
      setLogoPreview(team.logoUrl ?? null);
    } else {
      reset(EMPTY_VALUES);
      setLogoPreview(null);
    }
  }, [visible, isEditMode, team, reset]);

  function handleSubmitForm(data: TeamFormData) {
    if (isEditMode) {
      updateTeam(
        {
          id: team.id,
          name: data.name,
          description: data.description || undefined,
          ageGroup: data.ageGroup || undefined,
          logoUrl: data.logoUrl || undefined,
        },
        {
          onSuccess: () => {
            notify(
              t('clubs:teams.toast.updated', { name: data.name }),
              'success',
              uiConfig.toast.durationMs,
            );
            onUpdated();
            handleHide();
          },
          onError: (error) => {
            const msg =
              error instanceof ApiError && error.isConflict
                ? t('clubs:teams.toast.updateConflict')
                : t('clubs:teams.toast.updateFailed');
            notify(msg, 'error', uiConfig.toast.errorDurationMs);
          },
        },
      );
    } else {
      if (!currentSeason) return;
      createTeam(
        {
          seasonId: currentSeason.id,
          name: data.name,
          description: data.description || undefined,
          ageGroup: data.ageGroup || undefined,
          logoUrl: data.logoUrl || undefined,
        },
        {
          onSuccess: () => {
            notify(
              t('clubs:teams.toast.created', { name: data.name }),
              'success',
              uiConfig.toast.durationMs,
            );
            onCreated();
            handleHide();
          },
          onError: (error) => {
            const msg =
              error instanceof ApiError && error.isConflict
                ? t('clubs:teams.toast.createConflict')
                : t('clubs:teams.toast.createFailed');
            notify(msg, 'error', uiConfig.toast.errorDurationMs);
          },
        },
      );
    }
  }

  const bottomContent = (
    <DrawerFooter
      cancelLabel={t('buttons:cancel')}
      onCancel={handleHide}
      submitLabel={isEditMode ? t('buttons:saveChanges') : t('clubs:teams.popup.createButton')}
      onSubmit={handleSubmit(handleSubmitForm)}
      isLoading={isPending}
      disabled={
        !isValid ||
        isPending ||
        isUploadingLogo ||
        (!isEditMode && (!currentSeason || isSeasonError))
      }
      submitTestId="team-submit-button"
    />
  );

  return (
    <DrawerPanel
      visible={visible}
      onHide={handleHide}
      title={isEditMode ? t('clubs:teams.popup.editTitle') : t('clubs:teams.popup.addTitle')}
      bottomContent={bottomContent}
      data-testid={isEditMode ? 'edit-team-drawer' : 'add-team-drawer'}
    >
      <div className="space-y-md">
        {/* Team logo (optional) */}
        <LogoUploadField
          id="team-logo-upload"
          label={t('clubs:teams.form.logo.label')}
          isUploading={isUploadingLogo}
          previewUrl={logoPreview ?? undefined}
          onChange={handleLogoFile}
          onRemove={handleLogoRemove}
        />

        {/* Season indicator (AC #1.2) — add mode only */}
        {!isEditMode && (
          <Typography
            variant="body-sm"
            className="text-text-secondary"
            data-testid="team-season-indicator"
          >
            {isSeasonLoading && t('clubs:teams.form.season.loading')}
            {isSeasonError && t('clubs:teams.form.season.error')}
            {currentSeason &&
              t('clubs:teams.form.season.label', { season: currentSeason.displayLabel })}
          </Typography>
        )}

        {/* Team name */}
        <FormField
          label={t('clubs:teams.form.name.label')}
          htmlFor="dept-name"
          required
          error={errors.name?.message ? t(errors.name.message, { max: TEAM_NAME_MAX }) : undefined}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextBox
                inputAttr={{ id: 'dept-name' }}
                value={field.value}
                onValueChanged={(e) => field.onChange(e.value ?? '')}
                valueChangeEvent="input"
                placeholder={t('clubs:teams.form.name.placeholder')}
                stylingMode="outlined"
              />
            )}
          />
        </FormField>

        {/* Age group (optional) */}
        <FormField
          label={t('clubs:teams.form.ageGroup.label')}
          htmlFor="dept-age-group"
          error={errors.ageGroup?.message ? t(errors.ageGroup.message) : undefined}
        >
          <Controller
            name="ageGroup"
            control={control}
            render={({ field }) => (
              <SelectBox
                inputAttr={{ id: 'dept-age-group' }}
                dataSource={AGE_GROUPS}
                value={field.value || null}
                onValueChanged={(e) => field.onChange(e.value ?? '')}
                placeholder={t('clubs:teams.form.ageGroup.placeholder')}
                showClearButton
                stylingMode="outlined"
              />
            )}
          />
        </FormField>

        {/* Team description (optional) */}
        <FormField
          label={t('clubs:teams.form.description.label')}
          htmlFor="dept-description"
          error={
            errors.description?.message
              ? t(errors.description.message, { max: TEAM_DESCRIPTION_MAX })
              : undefined
          }
        >
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <textarea
                id="dept-description"
                {...field}
                value={field.value ?? ''}
                placeholder={t('clubs:teams.form.description.placeholder')}
                rows={3}
                className="w-full resize-y rounded border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            )}
          />
        </FormField>
      </div>
    </DrawerPanel>
  );
}
