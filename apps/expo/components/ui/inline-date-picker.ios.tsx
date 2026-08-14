import DateTimePicker from '@react-native-community/datetimepicker';
import { spacing } from '@starterkit/shared';
import { useWindowDimensions, View } from 'react-native';
import { palette } from '@/constants/tokens';
import type { InlineDatePickerProps } from './inline-date-picker.types';

const CALENDAR_HEIGHT = 360;

/**
 * `RNHostView matchContents` sizes the SwiftUI sheet by measuring this RN subtree once on
 * mount. The native inline UIDatePicker doesn't report a trustworthy intrinsic size for that
 * measurement pass, so the pre-measure can read as far wider than the screen — the sheet
 * then renders oversized and centered, clipping content off an edge (the picker itself still
 * looks fine because its FINAL layout obeys the explicit style size below; only the
 * ancestor's one-time pre-measurement is fooled). Giving the wrapper both an explicit width
 * and height means Yoga already has a definite box for that branch and never needs to ask the
 * native view for its own size at all.
 */
export function InlineDatePicker({
  value,
  onChange,
  maximumDate,
  minimumDate,
  mode = 'date',
  testID,
}: InlineDatePickerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const calendarWidth = windowWidth - spacing.lg * 2;

  return (
    <View
      className="w-full items-center overflow-hidden"
      style={{ height: CALENDAR_HEIGHT }}
      testID={testID}
    >
      <DateTimePicker
        value={value}
        mode={mode}
        display={mode === 'time' ? 'spinner' : 'inline'}
        themeVariant="dark"
        accentColor={palette.cyan.DEFAULT}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        style={{ width: calendarWidth, height: CALENDAR_HEIGHT, alignSelf: 'center' }}
        onChange={(_, date) => date && onChange(date)}
      />
    </View>
  );
}
