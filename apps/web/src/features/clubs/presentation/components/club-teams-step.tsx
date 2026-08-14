'use client';

import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import { InlineLogoPicker } from '@features/clubs/presentation/components/inline-logo-picker';
import type { ClubFormData } from '@features/clubs/presentation/utils/club-schema';
import { AGE_GROUPS } from '@features/clubs/presentation/utils/team-schema';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { DeleteIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import { useState } from 'react';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button, NewButton, notify, Typography } from '@/components/ui';
import type { AgeGroup } from '@/proxy/models';

type TeamRow = NonNullable<ClubFormData['teams']>[number];

// ─── Props ───────────────────────────────────────────────────────────────────

interface ClubTeamsStepProps {
  control: Control<ClubFormData>;
  /** Called when the user presses Enter on a team row — use to trigger form submit. */
  onRequestSubmit?: () => void;
}

// ─── Row ───────────────────────────────────────────────────────────────────────

interface TeamRowFieldsProps {
  team: TeamRow;
  onChange: (next: TeamRow) => void;
  onRemove: () => void;
  onRequestSubmit?: () => void;
}

function TeamRowFields({ team, onChange, onRemove, onRequestSubmit }: TeamRowFieldsProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);

  function handleFile(file: File) {
    setIsUploading(true);
    clubDatasource
      .uploadLogo(file)
      .then((url) => onChange({ ...team, logoUrl: url }))
      .catch(() =>
        notify(t('errors:club.toast.logoUploadFailed'), 'error', uiConfig.toast.errorDurationMs),
      )
      .finally(() => setIsUploading(false));
  }

  return (
    <div className="flex items-center gap-sm">
      <InlineLogoPicker
        previewUrl={team.logoUrl}
        isUploading={isUploading}
        onFile={handleFile}
        onRemove={() => onChange({ ...team, logoUrl: '' })}
        ariaLabel={t('clubs:form.teams.logoAlt')}
      />
      <div className="flex-1">
        <TextBox
          value={team.name}
          onValueChanged={(e) => onChange({ ...team, name: e.value ?? '' })}
          valueChangeEvent="input"
          placeholder={t('clubs:form.teams.placeholder')}
          stylingMode="outlined"
          width="100%"
          onEnterKey={() => onRequestSubmit?.()}
        />
      </div>
      <div className="w-32 shrink-0">
        <SelectBox
          dataSource={AGE_GROUPS}
          value={team.ageGroup || null}
          onValueChanged={(e) => onChange({ ...team, ageGroup: (e.value as AgeGroup) ?? '' })}
          placeholder={t('clubs:teams.form.ageGroup.placeholder')}
          showClearButton
          stylingMode="outlined"
        />
      </div>
      <Button variant="outlined" aria-label={t('clubs:form.teams.remove')} onClick={onRemove}>
        <DeleteIcon size={iconSize.sm} />
      </Button>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Wizard step 2 (Team): optional teams created alongside the club. Each row has a compact logo
 * picker, a free-text name, and an age group; more teams can be added later from the Teams page.
 */
export function ClubTeamsStep({ control, onRequestSubmit }: ClubTeamsStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-xs">
      <Typography as="div" variant="section-label">
        {t('clubs:form.teams.section')}
      </Typography>
      <Typography variant="body" className="text-text-secondary">
        {t('clubs:form.teams.hint')}
      </Typography>
      <Controller
        name="teams"
        control={control}
        render={({ field }) => {
          const teams = field.value ?? [];
          return (
            <div className="mt-sm flex flex-col gap-sm">
              {teams.map((team, index) => (
                <TeamRowFields
                  // biome-ignore lint/suspicious/noArrayIndexKey: free-text rows with no stable id; index keeps row focus stable during edits
                  key={`team-${index}`}
                  team={team}
                  onChange={(next) =>
                    field.onChange(teams.map((tm, i) => (i === index ? next : tm)))
                  }
                  onRemove={() => field.onChange(teams.filter((_, i) => i !== index))}
                  onRequestSubmit={onRequestSubmit}
                />
              ))}
              <div>
                <NewButton
                  label={t('clubs:form.teams.add')}
                  onClick={() =>
                    field.onChange([...teams, { name: '', logoUrl: '', ageGroup: '' }])
                  }
                />
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
