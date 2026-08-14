export interface InlineDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  /** Passed straight through to `@react-native-community/datetimepicker`'s `mode` prop. Defaults to `'date'`. */
  mode?: 'date' | 'time';
  testID?: string;
}
