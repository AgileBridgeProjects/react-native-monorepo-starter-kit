'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import TagBox from 'devextreme-react/tag-box';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormField } from '@/components/ui';
import { tagBoxValuesEqual } from '@/lib/dx-tagbox-value-changed';
import type { useAthleteSelectStore, useTeamSelectStore } from '@/lib/hooks';
import type { AddUserFormData } from '../utils/add-user-schema';

interface UserMultiSelectSectionProps {
  control: Control<AddUserFormData>;
  errors: FieldErrors<AddUserFormData>;
  /** The array-valued form field this TagBox is bound to. */
  fieldName: 'teamIds' | 'dependentUserIds';
  /** `id` on the underlying input — used by e2e/unit tests to target the field. */
  htmlFor: string;
  label: string;
  placeholder: string;
  dataSource: ReturnType<typeof useTeamSelectStore> | ReturnType<typeof useAthleteSelectStore>;
  displayExpr: string;
  searchExpr: string;
  /**
   * A Coach's Team Assignment and a Parent's Linked Athletes are required;
   * an Athlete's Team Assignment remains optional.
   */
  required?: boolean;
}

/**
 * Shared many-to-many multi-select — backs both "Team Assignment" (Athlete/Coach) and
 * "Linked Athlete(s)" (Parent). Same TagBox/Controller wiring, only the bound
 * field, data source, and copy differ per caller.
 */
export function UserMultiSelectSection({
  control,
  errors,
  fieldName,
  htmlFor,
  label,
  placeholder,
  dataSource,
  displayExpr,
  searchExpr,
  required = false,
}: UserMultiSelectSectionProps) {
  const { t } = useTranslation();
  const errorKey = errors[fieldName]?.message;
  return (
    <FormField
      label={label}
      htmlFor={htmlFor}
      required={required}
      optional={!required}
      error={errorKey ? t(errorKey) : undefined}
    >
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <TagBox
            inputAttr={{ id: htmlFor }}
            dataSource={dataSource}
            displayExpr={displayExpr}
            valueExpr="id"
            value={field.value ?? []}
            onValueChanged={(e) => {
              const next = e.value ?? [];
              if (tagBoxValuesEqual(next, field.value ?? [])) return;
              field.onChange(next);
            }}
            placeholder={placeholder}
            stylingMode="outlined"
            searchEnabled
            searchExpr={searchExpr}
            searchTimeout={uiConfig.selectSearch.searchTimeout}
            minSearchLength={uiConfig.selectSearch.minSearchLength}
          />
        )}
      />
    </FormField>
  );
}
