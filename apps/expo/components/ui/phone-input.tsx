import { DEFAULT_PHONE_COUNTRY, getPhoneCountries } from '@starterkit/shared';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import { useTranslation } from '@/src/lib/i18n';
import { CountryFlag } from './country-flag';
import { CountryPickerSheet } from './country-picker-sheet';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  countryCode?: string;
  onCountryChange?: (code: string) => void;
  /** Optional label displayed above the input. */
  label?: string;
  /** Error state — highlights the border red. */
  error?: boolean;
  /** Error message displayed below the input. */
  errorMessage?: string;
  placeholder?: string;
  testID?: string;
}

/**
 * Phone number input with a tappable country-code prefix.
 *
 * Displays the selected country's emoji flag and dial code in a non-editable
 * leading cell. Tapping it opens a searchable country picker modal.
 */
export function PhoneInput({
  value,
  onChangeText,
  onBlur,
  countryCode = DEFAULT_PHONE_COUNTRY,
  onCountryChange,
  label,
  error = false,
  errorMessage,
  placeholder,
  testID,
}: PhoneInputProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const countryAnchorRef = useRef<View>(null);
  const { t } = useTranslation('auth');
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const theme = colors[colorScheme];
  const selected = getPhoneCountries().find((c) => c.code === countryCode);

  return (
    <View>
      {label && <Text className="text-text-secondary text-sm mb-xs">{label}</Text>}
      <View
        className={cn(
          'flex-row items-center bg-surface border rounded-md overflow-hidden',
          error || errorMessage ? 'border-error' : 'border-border',
        )}
      >
        <Pressable
          ref={countryAnchorRef}
          onPress={() => onCountryChange && setPickerVisible(true)}
          disabled={!onCountryChange}
          className="flex-row items-center gap-xs px-md py-sm border-r border-border"
          accessibilityRole="button"
          accessibilityLabel={t('phone.countryAccessibilityLabel', {
            name: selected?.name ?? countryCode,
            dialCode: selected?.dialCode ?? '',
          })}
        >
          <CountryFlag code={countryCode} size={iconSize.sm} />
          <Text className="text-text text-base">{selected?.dialCode ?? countryCode}</Text>
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          autoCorrect={false}
          className="flex-1 px-md py-sm text-text text-base"
          testID={testID}
        />
      </View>
      {errorMessage && (
        <Text className="text-error text-xs mt-xs" accessibilityRole="alert">
          {errorMessage}
        </Text>
      )}
      {onCountryChange && (
        <CountryPickerSheet
          visible={pickerVisible}
          selected={countryCode}
          onSelect={onCountryChange}
          onClose={() => setPickerVisible(false)}
          anchorRef={countryAnchorRef}
        />
      )}
    </View>
  );
}

export type { PhoneInputProps };
