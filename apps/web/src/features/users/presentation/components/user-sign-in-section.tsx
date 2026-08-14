'use client';

import type { User } from '@features/users/domain/entities/user';
import { useTranslation } from '@lib/i18n';
import { getCountryName } from '@starterkit/shared';
import TextBox from 'devextreme-react/text-box';
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { CountryPhoneInput, FormField } from '@/components/ui';
import { AuthenticationMethod } from '@/proxy/models';
import { type AddUserFormData, PHONE_REQUIRED_ROLES } from '../utils/add-user-schema';

interface UserSignInSectionProps {
  control: Control<AddUserFormData>;
  errors: FieldErrors<AddUserFormData>;
  emailTouched: boolean;
  setValue: UseFormSetValue<AddUserFormData>;
  authMethod: AuthenticationMethod;
  countryCode: string;
  isEditMode: boolean;
  editUser?: User | null;
  roleName: string;
}

export function UserSignInSection({
  control,
  errors,
  emailTouched,
  setValue,
  authMethod,
  countryCode,
  isEditMode,
  editUser,
  roleName,
}: UserSignInSectionProps) {
  const { t } = useTranslation();

  // the identity split: email/Credentials is the only sign-in method for new users. There is no method
  // picker — an admin can no longer switch a user between methods. `isCustomAuth` only exists
  // so a pre-the identity split legacy CustomAuthentication user still displays their username/password
  // fields when edited, instead of an incorrect Email field.
  const isCustomAuth = isEditMode && authMethod === AuthenticationMethod.CustomAuthentication;
  const isPhoneRequiredForRole = PHONE_REQUIRED_ROLES.includes(roleName);

  return (
    <>
      {/* Email — hidden for legacy CustomAuthentication users; always shown otherwise. */}
      {!isCustomAuth && (
        <FormField
          label={t('users:addUser.form.email.label')}
          htmlFor="user-email"
          required
          error={errors.email?.message && emailTouched ? t(errors.email.message) : undefined}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextBox
                inputAttr={{ id: 'user-email', type: 'text', autoComplete: 'off' }}
                value={field.value ?? ''}
                onValueChanged={(e) => field.onChange(e.value ?? '')}
                onFocusOut={() => field.onBlur()}
                placeholder={t('users:addUser.form.email.placeholder')}
                stylingMode="outlined"
              />
            )}
          />
        </FormField>
      )}

      {/* Phone — a plain contact field, unrelated to sign-in (the identity split — email/Credentials is
          the only sign-in method; Phone Number is just a recordable contact field for every
          role, shown in both create and edit mode). Hidden only for CustomAuthentication
          (username/password instead). */}
      {!isCustomAuth && (
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <CountryPhoneInput
              countryCode={countryCode}
              onCountryChange={(code) => setValue('countryCode', code)}
              phoneNumber={field.value ?? ''}
              onPhoneChange={field.onChange}
              htmlFor="user-phone"
              required={isPhoneRequiredForRole}
              optional={!isPhoneRequiredForRole}
              error={
                errors.phoneNumber?.message
                  ? t(errors.phoneNumber.message, { country: getCountryName(countryCode) })
                  : undefined
              }
            />
          )}
        />
      )}

      {/* Username + Password — shown for CustomAuthentication */}
      {isCustomAuth && (
        <>
          <FormField
            label={t('users:addUser.form.username.label')}
            htmlFor="user-username"
            required
            error={errors.username?.message ? t(errors.username.message) : undefined}
          >
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <TextBox
                  inputAttr={{ id: 'user-username', autoComplete: 'off' }}
                  value={field.value ?? ''}
                  onValueChanged={(e) => field.onChange(e.value ?? '')}
                  placeholder={t('users:addUser.form.username.placeholder')}
                  stylingMode="outlined"
                  disabled={
                    isEditMode && editUser?.authMethod === AuthenticationMethod.CustomAuthentication
                  }
                />
              )}
            />
          </FormField>
          {(!isEditMode ||
            (isEditMode && editUser?.authMethod !== AuthenticationMethod.CustomAuthentication)) && (
            <FormField
              label={t('users:addUser.form.password.label')}
              htmlFor="user-password"
              required
              error={errors.password?.message ? t(errors.password.message) : undefined}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextBox
                    inputAttr={{ id: 'user-password', autoComplete: 'new-password' }}
                    value={field.value ?? ''}
                    onValueChanged={(e) => field.onChange(e.value ?? '')}
                    placeholder={t('users:addUser.form.password.placeholder')}
                    stylingMode="outlined"
                    mode="text"
                  />
                )}
              />
            </FormField>
          )}
        </>
      )}
    </>
  );
}
