import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { KeyboardTypeOptions } from 'react-native';
import { TextInput, View } from 'react-native';
import { Typography } from '@/components/ui/typography';
import { palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import type { FieldRequirement } from './field-requirement-hint';
import { useFieldRequirementLabel } from './field-requirement-hint';

export interface SettingsTextRowProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  /** Doubles as the row's label — there is no separate label line, matching a native
   * Settings-style borderless field. */
  placeholder: string;
  /**
   * Renders a small muted "Optional" tag beside the field. Omit for a required field —
   * required rows in this form are left unmarked; only the fields a caller can safely skip
   * carry a marker, so a marker is never a decision the reader has to make twice.
   */
  requirement?: FieldRequirement;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  testID?: string;
  /** Overrides the row's own placeholder as the field's accessible name (e.g. when the
   * placeholder is truncated or the field needs a fuller description). */
  accessibilityLabel?: string;
}

/**
 * One borderless text row inside a `SettingsGroup` card — a text-input sibling of
 * `SettingsRow` for forms that mix nav rows with editable fields. Same row metrics as
 * `SettingsRow` (`min-h-14`, `px-md`, `py-md`) so it sits flush against nav rows in the same
 * card, but `SettingsRow` has no editable variant, so this is a small sibling rather than an
 * extension of it.
 *
 * Returns a plain fragment-free element (not wrapped in extra `View`s beyond what's needed for
 * layout) so `SettingsGroup`'s `Children.toArray` sees exactly one row per field — the
 * validation error, when present, renders inside the same slot rather than opening a second
 * hairline-separated row.
 */
export function SettingsTextRow<T extends FieldValues>({
  control,
  name,
  placeholder,
  requirement,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  testID,
  accessibilityLabel,
}: SettingsTextRowProps<T>) {
  const requirementLabel = useFieldRequirementLabel(requirement);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View className={cn('min-h-14 justify-center gap-1 px-md py-sm', error && 'gap-1')}>
          <View className="flex-row items-center gap-sm">
            <TextInput
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor={palette.white[50]}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              testID={testID}
              accessibilityLabel={
                requirementLabel
                  ? `${accessibilityLabel ?? placeholder}, ${requirementLabel}`
                  : accessibilityLabel
              }
              className="flex-1 font-body text-base text-white"
            />
            {requirementLabel && (
              <Typography variant="caption" className="shrink-0 text-text-secondary">
                {requirementLabel}
              </Typography>
            )}
          </View>
          {error && (
            <Typography variant="caption" className="text-error" accessibilityRole="alert">
              {error.message}
            </Typography>
          )}
        </View>
      )}
    />
  );
}
