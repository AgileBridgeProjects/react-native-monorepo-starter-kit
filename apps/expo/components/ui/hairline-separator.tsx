import { View } from 'react-native';

/**
 * Hairline between two rows in a flat list — the Reflect/Surveys/Roster list treatment.
 * Previously duplicated verbatim across `SurveyTemplateRowSeparator`, `RosterAthleteRowSeparator`
 * and `ReflectionAssignmentRowSeparator`; use this directly as a `FlatList`/`SectionList`
 * `ItemSeparatorComponent` instead of adding another copy.
 */
export function HairlineSeparator() {
  return <View className="mx-lg h-px bg-white/10" />;
}
