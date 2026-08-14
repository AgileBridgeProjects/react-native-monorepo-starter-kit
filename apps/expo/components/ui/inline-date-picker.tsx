import DateTimePicker from '@react-native-community/datetimepicker';
import type { InlineDatePickerProps } from './inline-date-picker.types';

/** Android's `calendar` display renders a full month grid inline — no expand/collapse needed. */
export function InlineDatePicker({
  value,
  onChange,
  maximumDate,
  minimumDate,
  mode = 'date',
  testID,
}: InlineDatePickerProps) {
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={mode === 'time' ? 'spinner' : 'calendar'}
      maximumDate={maximumDate}
      minimumDate={minimumDate}
      onChange={(_, date) => date && onChange(date)}
      testID={testID}
    />
  );
}
