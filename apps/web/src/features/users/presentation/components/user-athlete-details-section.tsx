'use client';

import { useTranslation } from '@lib/i18n';
import { JERSEY_NUMBER_MAX } from '@starterkit/shared';
import DateBox from 'devextreme-react/date-box';
import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormField } from '@/components/ui';
import { toIsoDateString } from '@/lib/dx-date-box-value';
import { PlayingPosition } from '@/proxy/models';
import type { AddUserFormData } from '../utils/add-user-schema';

const JERSEY_NUMBER_MAX_LENGTH = String(JERSEY_NUMBER_MAX).length;

const POSITION_OPTIONS = Object.values(PlayingPosition).map((name) => ({
  name,
  label: name.replace(/([A-Z])/g, ' $1').trim(),
}));

interface UserAthleteDetailsSectionProps {
  control: Control<AddUserFormData>;
  errors: FieldErrors<AddUserFormData>;
}

/** Shown only for the Athlete role: date of birth, position, jersey number, Parent/Guardian email. */
export function UserAthleteDetailsSection({ control, errors }: UserAthleteDetailsSectionProps) {
  const { t } = useTranslation();
  return (
    <>
      <FormField
        label={t('users:addUser.form.dateOfBirth.label')}
        htmlFor="user-date-of-birth"
        required
        error={errors.dateOfBirth?.message ? t(errors.dateOfBirth.message) : undefined}
      >
        <Controller
          name="dateOfBirth"
          control={control}
          render={({ field }) => (
            <DateBox
              inputAttr={{ id: 'user-date-of-birth', 'data-testid': 'user-date-of-birth-input' }}
              type="date"
              value={field.value || null}
              onValueChanged={(e) => field.onChange(toIsoDateString(e.value ?? null))}
              placeholder={t('users:addUser.form.dateOfBirth.placeholder')}
              stylingMode="outlined"
              max={new Date()}
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-md">
        <FormField
          label={t('users:addUser.form.position.label')}
          htmlFor="user-position"
          optional
          error={errors.position?.message ? t(errors.position.message) : undefined}
        >
          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <SelectBox
                inputAttr={{ id: 'user-position', 'data-testid': 'user-position-input' }}
                items={POSITION_OPTIONS}
                displayExpr="label"
                valueExpr="name"
                value={field.value || null}
                onValueChanged={(e) => field.onChange(e.value ?? undefined)}
                placeholder={t('users:addUser.form.position.placeholder')}
                stylingMode="outlined"
                showClearButton
              />
            )}
          />
        </FormField>

        <FormField
          label={t('users:addUser.form.jerseyNumber.label')}
          htmlFor="user-jersey-number"
          optional
          error={errors.jerseyNumber?.message ? t(errors.jerseyNumber.message) : undefined}
        >
          <Controller
            name="jerseyNumber"
            control={control}
            render={({ field }) => (
              <TextBox
                inputAttr={{
                  id: 'user-jersey-number',
                  'data-testid': 'user-jersey-number-input',
                  inputMode: 'numeric',
                }}
                value={field.value ?? ''}
                onValueChanged={(e) => field.onChange(e.value ?? '')}
                placeholder={t('users:addUser.form.jerseyNumber.placeholder')}
                stylingMode="outlined"
                maxLength={JERSEY_NUMBER_MAX_LENGTH}
              />
            )}
          />
        </FormField>
      </div>

      <FormField
        label={t('users:addUser.form.parentGuardianEmail.label')}
        htmlFor="user-parent-guardian-email"
        optional
        hint={t('users:addUser.form.parentGuardianEmail.hint')}
        error={
          errors.parentGuardianEmail?.message ? t(errors.parentGuardianEmail.message) : undefined
        }
      >
        <Controller
          name="parentGuardianEmail"
          control={control}
          render={({ field }) => (
            <TextBox
              inputAttr={{
                id: 'user-parent-guardian-email',
                type: 'text',
                autoComplete: 'off',
                'data-testid': 'user-parent-guardian-email-input',
              }}
              value={field.value ?? ''}
              onValueChanged={(e) => field.onChange(e.value ?? '')}
              placeholder={t('users:addUser.form.parentGuardianEmail.placeholder')}
              stylingMode="outlined"
            />
          )}
        />
      </FormField>
    </>
  );
}
