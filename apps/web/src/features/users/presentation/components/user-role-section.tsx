'use client';

import type { Role } from '@features/users/domain/entities/role';
import { useTranslation } from '@lib/i18n';
import SelectBox from 'devextreme-react/select-box';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormField } from '@/components/ui';
import type { AddUserFormData } from '../utils/add-user-schema';

interface UserRoleSectionProps {
  control: Control<AddUserFormData>;
  errors: FieldErrors<AddUserFormData>;
  availableRoles: Role[];
  isMultiOrgUser: boolean;
}

/**
 * Role selector — deliberately the first field in the Add User form: every other
 * section (sign-in requirements, team assignment, athlete/guardian fields) branches on the
 * selected role, so the admin must pick it before anything else makes sense to fill in.
 */
export function UserRoleSection({
  control,
  errors,
  availableRoles,
  isMultiOrgUser,
}: UserRoleSectionProps) {
  const { t } = useTranslation();
  return (
    <FormField
      label={t('users:addUser.form.role.label')}
      htmlFor="user-role"
      required
      error={errors.roleName?.message ? t(errors.roleName.message) : undefined}
      hint={isMultiOrgUser ? t('users:editUser.roleRestricted.hint') : undefined}
    >
      <Controller
        name="roleName"
        control={control}
        render={({ field }) => (
          <SelectBox
            inputAttr={{ id: 'user-role' }}
            items={availableRoles.map((r) => ({
              name: r.name,
              label: r.name.replace(/([A-Z])/g, ' $1').trim(),
            }))}
            displayExpr="label"
            valueExpr="name"
            value={field.value}
            onValueChanged={(e) => field.onChange(e.value)}
            placeholder={t('users:addUser.form.role.placeholder')}
            stylingMode="outlined"
          />
        )}
      />
    </FormField>
  );
}
