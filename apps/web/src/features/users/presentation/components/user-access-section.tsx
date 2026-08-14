'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import SelectBox from 'devextreme-react/select-box';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormField } from '@/components/ui';
import type { useTeamSelectStore } from '@/lib/hooks';
import type { AddUserFormData } from '../utils/add-user-schema';

interface UserAccessSectionProps {
  control: Control<AddUserFormData>;
  errors: FieldErrors<AddUserFormData>;
  defaultClubId: string | null;
  deptStore: ReturnType<typeof useTeamSelectStore>;
  /** Hides this field when the role-specific many-to-many Team Assignment section already
   * covers team membership (Athlete/Coach, create mode) — avoids showing two team pickers
   * for the same concept. */
  hideTeamField: boolean;
}

/** Single "Team" field for roles that don't use the many-to-many Team Assignment section
 * (Athlete/Coach; see `hideTeamField`). Submitted as a one-element `teamIds` list — UserTeams
 * is the sole source of truth for team membership. */
export function UserAccessSection({
  control,
  errors,
  defaultClubId,
  deptStore,
  hideTeamField,
}: UserAccessSectionProps) {
  const { t } = useTranslation();
  if (!defaultClubId || hideTeamField) return null;
  return (
    <FormField
      label={t('users:addUser.form.team.label')}
      htmlFor="user-team"
      optional
      error={errors.teamId?.message ? t(errors.teamId.message) : undefined}
    >
      <Controller
        name="teamId"
        control={control}
        render={({ field }) => (
          <SelectBox
            inputAttr={{ id: 'user-team' }}
            dataSource={deptStore}
            displayExpr="name"
            valueExpr="id"
            value={field.value ?? null}
            onValueChanged={(e) => field.onChange(e.value ?? '')}
            placeholder={t('users:addUser.form.team.placeholder')}
            stylingMode="outlined"
            searchEnabled
            searchExpr="name"
            searchTimeout={uiConfig.selectSearch.searchTimeout}
            minSearchLength={uiConfig.selectSearch.minSearchLength}
          />
        )}
      />
    </FormField>
  );
}
