'use client';

import {
  CLUB_SEASON_NAME_MAX,
  type ClubFormData,
} from '@features/clubs/presentation/utils/club-schema';
import { US_STATES, zoneOptionsForState } from '@features/clubs/presentation/utils/us-timezones';
import { useTranslation } from '@lib/i18n';
import NumberBox from 'devextreme-react/number-box';
import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { Banner, DateRangeBox, FormField, Typography } from '@/components/ui';
import { LogoUploadField } from './logo-upload-field';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ClubFormInlineProps {
  control: Control<ClubFormData>;
  errors: Partial<Record<keyof ClubFormData, { message?: string }>>;
  setValue: UseFormSetValue<ClubFormData>;
  /** Called when the user presses Enter on the last field — use to trigger form submit. */
  onRequestSubmit?: () => void;
  /** True while the selected logo file is uploading. */
  isLogoUploading?: boolean;
  /** Committed logo URL to show in the logo field preview (null/undefined = empty). */
  logoPreviewUrl?: string;
  /** Called with the selected file — the host opens the logo studio to process it. */
  onLogoFile: (file: File) => void;
  /** Called when the user clears the logo field. */
  onLogoRemove: () => void;
  /** Optional override for the logo field — replaces the default ImageUploadField. */
  logoSection?: ReactNode;
  /**
   * Shows the "first season" fields — onboarding always defines a club's initial
   * season explicitly. Only relevant in the create wizard; the edit form never touches season
   * data, so this defaults to false there.
   */
  showSeasonSection?: boolean;
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

/** A titled group of fields — keeps each row's column count consistent within one topic. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-sm">
      <Typography as="div" variant="section-label">
        {title}
      </Typography>
      {children}
    </section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Club profile fields (wizard step 1), grouped into Details / Address / Additional sections.
 * The state picker doubles as the timezone narrower — it stores the club's state AND filters the
 * IANA zone options, but never derives the stored timezone.
 */
export function ClubFormInline({
  control,
  errors,
  setValue,
  onRequestSubmit,
  isLogoUploading = false,
  logoPreviewUrl,
  onLogoFile,
  onLogoRemove,
  logoSection,
  showSeasonSection = false,
}: ClubFormInlineProps) {
  const { t } = useTranslation();

  const selectedState = useWatch({ control, name: 'state' });
  const timezoneOptions = useMemo(
    () => zoneOptionsForState(selectedState || null),
    [selectedState],
  );

  return (
    <div className="flex flex-col gap-xl">
      {/* ── Club details: logo + name ─────────────────────────────────────── */}
      <Section title={t('clubs:form.section.details')}>
        {logoSection ?? (
          <LogoUploadField
            isUploading={isLogoUploading}
            previewUrl={logoPreviewUrl}
            onChange={onLogoFile}
            onRemove={onLogoRemove}
          />
        )}

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <FormField
              label={t('clubs:form.name.label')}
              htmlFor="club-name"
              required
              error={errors.name?.message ? t(errors.name.message) : undefined}
            >
              <TextBox
                inputAttr={{ id: 'club-name' }}
                value={field.value}
                onValueChanged={(e) => field.onChange(e.value ?? '')}
                valueChangeEvent="input"
                placeholder={t('clubs:form.name.placeholder')}
                stylingMode="outlined"
              />
            </FormField>
          )}
        />
      </Section>

      {/* ── Address: street, then city / state / ZIP ──────────────────────── */}
      <Section title={t('clubs:form.section.address')}>
        <Controller
          name="streetAddress"
          control={control}
          render={({ field }) => (
            <FormField
              label={t('clubs:form.streetAddress.label')}
              htmlFor="club-street-address"
              required
              error={errors.streetAddress?.message ? t(errors.streetAddress.message) : undefined}
            >
              <TextBox
                inputAttr={{ id: 'club-street-address' }}
                value={field.value}
                onValueChanged={(e) => field.onChange(e.value ?? '')}
                valueChangeEvent="input"
                placeholder={t('clubs:form.streetAddress.placeholder')}
                stylingMode="outlined"
                maxLength={200}
              />
            </FormField>
          )}
        />

        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <FormField
                label={t('clubs:form.city.label')}
                htmlFor="club-city"
                required
                error={errors.city?.message ? t(errors.city.message) : undefined}
              >
                <TextBox
                  inputAttr={{ id: 'club-city' }}
                  value={field.value}
                  onValueChanged={(e) => field.onChange(e.value ?? '')}
                  valueChangeEvent="input"
                  placeholder={t('clubs:form.city.placeholder')}
                  stylingMode="outlined"
                  maxLength={100}
                />
              </FormField>
            )}
          />

          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <FormField
                label={t('clubs:form.state.label')}
                htmlFor="club-state"
                required
                error={errors.state?.message ? t(errors.state.message) : undefined}
              >
                <SelectBox
                  id="club-state"
                  dataSource={US_STATES}
                  displayExpr="name"
                  valueExpr="code"
                  value={field.value || null}
                  onValueChanged={(e) => {
                    const code = (e.value as string | null) ?? '';
                    field.onChange(code);
                    // Narrow the timezone: single-zone states auto-select their zone (still
                    // editable); straddling states leave the choice to the user.
                    const zones = zoneOptionsForState(code || null);
                    if (zones.length === 1) {
                      setValue('timezone', zones[0].id, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  placeholder={t('clubs:form.state.placeholder')}
                  searchEnabled
                  searchTimeout={300}
                  stylingMode="outlined"
                />
              </FormField>
            )}
          />

          <Controller
            name="zipCode"
            control={control}
            render={({ field }) => (
              <FormField
                label={t('clubs:form.zipCode.label')}
                htmlFor="club-zip-code"
                error={errors.zipCode?.message ? t(errors.zipCode.message) : undefined}
              >
                <TextBox
                  inputAttr={{ id: 'club-zip-code' }}
                  value={field.value ?? ''}
                  onValueChanged={(e) => field.onChange(e.value ?? '')}
                  valueChangeEvent="input"
                  placeholder={t('clubs:form.zipCode.placeholder')}
                  stylingMode="outlined"
                  maxLength={10}
                />
              </FormField>
            )}
          />
        </div>
      </Section>

      {/* ── Additional: timezone + capacity ───────────────────────────────── */}
      <Section title={t('clubs:form.section.additional')}>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <FormField
                label={t('clubs:form.timezone.label')}
                htmlFor="club-timezone"
                error={errors.timezone?.message ? t(errors.timezone.message) : undefined}
              >
                <SelectBox
                  id="club-timezone"
                  dataSource={timezoneOptions}
                  displayExpr="label"
                  valueExpr="id"
                  value={field.value ?? null}
                  onValueChanged={(e) => field.onChange(e.value ?? null)}
                  placeholder={t('clubs:form.timezone.placeholder')}
                  searchEnabled
                  searchTimeout={300}
                  showClearButton
                  stylingMode="outlined"
                />
              </FormField>
            )}
          />

          <Controller
            name="maxAthletes"
            control={control}
            render={({ field }) => (
              <FormField
                label={t('clubs:form.maxAthletes.label')}
                htmlFor="club-max-athletes"
                error={errors.maxAthletes?.message ? t(errors.maxAthletes.message) : undefined}
              >
                <NumberBox
                  inputAttr={{ id: 'club-max-athletes' }}
                  min={1}
                  value={field.value ?? undefined}
                  onValueChanged={(e) => field.onChange(e.value ?? null)}
                  onFocusOut={() => field.onBlur()}
                  placeholder={t('clubs:form.maxAthletes.placeholder')}
                  showSpinButtons
                  stylingMode="outlined"
                  width="100%"
                  onEnterKey={() => onRequestSubmit?.()}
                />
              </FormField>
            )}
          />
        </div>
      </Section>

      {/* ── Season: the club's first season, defined explicitly at onboarding ──── */}
      {showSeasonSection && (
        <Section title={t('clubs:form.section.season')}>
          <Typography variant="body-sm" className="text-text-secondary">
            {t('clubs:form.season.hint')}
          </Typography>

          <Banner variant="warning">{t('clubs:form.season.temporaryNotice')}</Banner>

          <Controller
            name="seasonName"
            control={control}
            render={({ field }) => (
              <FormField
                label={t('clubs:form.season.name.label')}
                htmlFor="club-season-name"
                error={errors.seasonName?.message ? t(errors.seasonName.message) : undefined}
              >
                <TextBox
                  inputAttr={{ id: 'club-season-name' }}
                  value={field.value ?? ''}
                  onValueChanged={(e) => field.onChange(e.value ?? '')}
                  valueChangeEvent="input"
                  placeholder={t('clubs:form.season.name.placeholder')}
                  stylingMode="outlined"
                  maxLength={CLUB_SEASON_NAME_MAX}
                />
              </FormField>
            )}
          />

          <Controller
            name="seasonStartDate"
            control={control}
            render={({ field: startField }) => (
              <Controller
                name="seasonEndDate"
                control={control}
                render={({ field: endField }) => (
                  <FormField
                    label={t('clubs:form.season.dateRange.label')}
                    htmlFor="club-season-date-range"
                    required
                  >
                    <DateRangeBox
                      id="club-season-date-range"
                      startDate={startField.value || null}
                      endDate={endField.value || null}
                      startDateLabel={t('clubs:form.season.dateRange.startLabel')}
                      endDateLabel={t('clubs:form.season.dateRange.endLabel')}
                      onChange={({ startDate, endDate }) => {
                        startField.onChange(startDate ?? '');
                        endField.onChange(endDate ?? '');
                      }}
                    />
                  </FormField>
                )}
              />
            )}
          />
        </Section>
      )}
    </div>
  );
}
