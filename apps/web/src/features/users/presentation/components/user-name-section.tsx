'use client';

import { useTranslation } from '@lib/i18n';
import TextBox from 'devextreme-react/text-box';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormField } from '@/components/ui';
import type { AddUserFormData } from '../utils/add-user-schema';

interface UserNameSectionProps {
  control: Control<AddUserFormData>;
  errors: FieldErrors<AddUserFormData>;
}

export function UserNameSection({ control, errors }: UserNameSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-md">
      <FormField
        label={t('users:addUser.form.firstName.label')}
        htmlFor="user-first-name"
        required
        error={errors.firstName?.message ? t(errors.firstName.message) : undefined}
      >
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => (
            <TextBox
              inputAttr={{ id: 'user-first-name' }}
              value={field.value}
              onValueChanged={(e) => field.onChange(e.value ?? '')}
              placeholder={t('users:addUser.form.firstName.placeholder')}
              stylingMode="outlined"
            />
          )}
        />
      </FormField>

      <FormField
        label={t('users:addUser.form.lastName.label')}
        htmlFor="user-last-name"
        required
        error={errors.lastName?.message ? t(errors.lastName.message) : undefined}
      >
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <TextBox
              inputAttr={{ id: 'user-last-name' }}
              value={field.value}
              onValueChanged={(e) => field.onChange(e.value ?? '')}
              placeholder={t('users:addUser.form.lastName.placeholder')}
              stylingMode="outlined"
            />
          )}
        />
      </FormField>
    </div>
  );
}
