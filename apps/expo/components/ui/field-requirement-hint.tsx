import { useTranslation } from '@lib/i18n';
import { Text } from 'react-native';

/** Whether a form field must be filled in. */
export type FieldRequirement = 'required' | 'optional';

/**
 * The translated word for a requirement — for accessibility labels, where the visual hint below
 * isn't reachable.
 */
export function useFieldRequirementLabel(requirement?: FieldRequirement): string | undefined {
  const { t } = useTranslation('common');
  return requirement ? t(`field.${requirement}`) : undefined;
}

/**
 * Small muted "Required"/"Optional" suffix rendered after a field's label.
 *
 * Lives in one component (rather than being written into each label's translation string) so the
 * marker looks the same on every field and translators aren't asked to remember the convention in
 * a dozen places. Rendered as a nested `Text` so it flows inline after the label rather than
 * taking its own line, and deliberately quieter than the label so it reads as an annotation.
 */
export function FieldRequirementHint({ requirement }: { requirement?: FieldRequirement }) {
  const label = useFieldRequirementLabel(requirement);
  if (!label) return null;

  return <Text className="font-body text-text-secondary text-xs"> · {label}</Text>;
}
