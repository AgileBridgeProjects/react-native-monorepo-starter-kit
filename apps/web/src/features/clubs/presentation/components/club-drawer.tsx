'use client';

import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import type { ClubFormData } from '@features/clubs/presentation/utils/club-schema';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { ConfirmDialog, DrawerFooter, DrawerPanel, notify, StepIndicator } from '@/components/ui';
import { CLUB_FORM_DRAWER_WIDTH } from './club-drawer.constants';
import { ClubFormInline } from './club-form-inline';
import { ClubTeamsStep } from './club-teams-step';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ClubDrawerProps {
  visible: boolean;
  onHide: () => void;
  title: ReactNode;
  'data-testid'?: string;
  control: Control<ClubFormData>;
  errors: Partial<Record<keyof ClubFormData, { message?: string }>>;
  setValue: UseFormSetValue<ClubFormData>;
  /** Submit handler (already wrapped by react-hook-form's handleSubmit). */
  onSubmit: () => void;
  isSubmitting: boolean;
  /** Disables the submit button without showing a spinner (e.g. form is invalid or unchanged). */
  isSubmitDisabled?: boolean;
  /** When true, cancelling the drawer prompts to save or discard before closing. */
  isDirty?: boolean;
  submitLabel: string;
  /**
   * Adds the optional Team wizard step (create flow). Step 1 collects the club profile + its
   * first season and can submit directly ("Create club"); step 2 collects optional teams for
   * that season before the final submit.
   */
  teamsStep?: boolean;
  /** Current logo URL to seed the preview with (editing an existing club). */
  currentLogoUrl?: string;
  /** Called when the user presses Enter on the last field. */
  onRequestSubmit?: () => void;
  /** Footer actions rendered on the left (e.g. Delete on the edit drawer). */
  extraActions?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Hosts the club add/edit form in a slide-in drawer. The club logo is a plain upload —
 * the file is stored as-is and the returned URL is written to the form.
 */
export function ClubDrawer({
  visible,
  onHide,
  title,
  'data-testid': testId,
  control,
  errors,
  setValue,
  onSubmit,
  isSubmitting,
  isSubmitDisabled = false,
  isDirty = false,
  submitLabel,
  teamsStep = false,
  currentLogoUrl,
  onRequestSubmit,
  extraActions,
}: ClubDrawerProps) {
  const { t } = useTranslation();

  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  // Wizard step (create flow only): 0 = Club profile + first season, 1 = optional Teams.
  const [step, setStep] = useState(0);

  // Logo upload state + committed preview shown in the form's logo field.
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl ?? null);

  const handleLogoFile = useCallback(
    (file: File) => {
      setIsUploadingLogo(true);
      clubDatasource
        .uploadLogo(file)
        .then((url) => {
          setLogoPreview(url);
          setValue('logoUrl', url, { shouldDirty: true, shouldValidate: true });
        })
        .catch(() => {
          notify(t('errors:club.toast.logoUploadFailed'), 'error', uiConfig.toast.errorDurationMs);
        })
        .finally(() => setIsUploadingLogo(false));
    },
    [setValue, t],
  );

  const handleLogoRemove = useCallback(() => {
    setLogoPreview(null);
    setValue('logoUrl', '');
  }, [setValue]);

  // Closing the drawer prompts before discarding unsaved changes.
  const handleHide = useCallback(() => {
    if (isDirty) {
      setIsDiscardOpen(true);
      return;
    }
    onHide();
  }, [isDirty, onHide]);

  const handleDiscard = useCallback(() => {
    setIsDiscardOpen(false);
    onHide();
  }, [onHide]);

  // Re-seed the preview when the hosted club changes.
  useEffect(() => {
    setLogoPreview(currentLogoUrl ?? null);
  }, [currentLogoUrl]);

  // Reset transient state when the drawer is fully closed.
  useEffect(() => {
    if (!visible) {
      setIsDiscardOpen(false);
      setLogoPreview(currentLogoUrl ?? null);
      setStep(0);
    }
  }, [visible, currentLogoUrl]);

  let bottomContent: ReactNode;
  if (!teamsStep) {
    // Single-step footer (edit flow).
    bottomContent = (
      <DrawerFooter
        leading={extraActions}
        cancelLabel={t('buttons:cancel')}
        onCancel={handleHide}
        submitLabel={submitLabel}
        onSubmit={onSubmit}
        isLoading={isSubmitting}
        disabled={isSubmitDisabled || isSubmitting || isUploadingLogo}
        submitTestId="club-submit-button"
      />
    );
  } else if (step === 0) {
    // Wizard step 1: Cancel | Create club (submits without teams) | Next.
    bottomContent = (
      <DrawerFooter
        leading={extraActions}
        cancelLabel={t('buttons:cancel')}
        onCancel={handleHide}
        extraActions={[
          {
            label: submitLabel,
            onClick: onSubmit,
            variant: 'primary',
            isLoading: isSubmitting,
            disabled: isSubmitDisabled || isSubmitting || isUploadingLogo,
            testId: 'club-submit-button',
          },
        ]}
        submitLabel={t('clubs:wizard.next')}
        submitVariant="outlined"
        onSubmit={() => setStep(1)}
        disabled={isSubmitDisabled || isSubmitting || isUploadingLogo}
        submitTestId="club-wizard-next"
      />
    );
  } else {
    // Wizard step 2: Cancel | Back | Create club (submits club + season + teams).
    bottomContent = (
      <DrawerFooter
        leading={extraActions}
        cancelLabel={t('buttons:cancel')}
        onCancel={handleHide}
        extraActions={[
          {
            label: t('clubs:wizard.back'),
            onClick: () => setStep(0),
            variant: 'outlined',
            disabled: isSubmitting,
            testId: 'club-wizard-back',
          },
        ]}
        submitLabel={t('clubs:wizard.createClub')}
        onSubmit={onSubmit}
        isLoading={isSubmitting}
        disabled={isSubmitDisabled || isSubmitting || isUploadingLogo}
        submitTestId="club-submit-button"
      />
    );
  }

  const wizardSteps = [
    { id: 'club', label: t('clubs:wizard.step.club') },
    { id: 'team', label: t('clubs:wizard.step.team') },
  ];

  return (
    <>
      <DrawerPanel
        visible={visible}
        onHide={handleHide}
        title={title}
        width={CLUB_FORM_DRAWER_WIDTH}
        topContent={
          teamsStep ? (
            <StepIndicator
              steps={wizardSteps}
              currentStep={step}
              ariaLabel={t('clubs:popup.addTitle')}
            />
          ) : undefined
        }
        bottomContent={bottomContent}
        data-testid={testId}
      >
        <div className="space-y-md p-lg">
          {teamsStep && step === 1 ? (
            <ClubTeamsStep control={control} onRequestSubmit={onRequestSubmit} />
          ) : (
            <ClubFormInline
              control={control}
              errors={errors}
              setValue={setValue}
              onRequestSubmit={onRequestSubmit}
              isLogoUploading={isUploadingLogo}
              logoPreviewUrl={logoPreview ?? undefined}
              onLogoFile={handleLogoFile}
              onLogoRemove={handleLogoRemove}
              showSeasonSection={teamsStep}
            />
          )}
        </div>
      </DrawerPanel>

      <ConfirmDialog
        visible={isDiscardOpen}
        title={t('common:confirm.unsavedChanges.title')}
        message={t('common:confirm.unsavedChanges.message')}
        confirmLabel={t('common:confirm.unsavedChanges.discard')}
        cancelLabel={t('common:confirm.unsavedChanges.keepEditing')}
        onConfirm={handleDiscard}
        onCancel={() => setIsDiscardOpen(false)}
        destructive
      />
    </>
  );
}
