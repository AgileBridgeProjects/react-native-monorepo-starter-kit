/**
 * Generic type for a { id, name } dropdown/select option.
 * Use instead of feature-specific interfaces like ClubOption, TeamOption, NamedOption.
 */
export interface SelectOption {
  id: string;
  name: string;
}

/**
 * Generic type for a { value, label } dropdown/select option.
 * Use for filter dropdowns where the value is not necessarily a string ID.
 */
export interface LabelledOption<T = string> {
  value: T;
  label: string;
}
