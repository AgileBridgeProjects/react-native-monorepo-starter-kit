import { countryCodeToEmoji, getPhoneCountries, type PhoneCountry, spacing } from '@starterkit/shared';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/src/lib/i18n';

export interface CountryPickerContentProps {
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  insetBottom?: number;
}

export function CountryPickerContent({
  selected,
  onSelect,
  onClose,
  insetBottom = 0,
}: CountryPickerContentProps) {
  const [search, setSearch] = useState('');
  const { t } = useTranslation('auth');
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const theme = colors[colorScheme];

  const filtered = useMemo(
    () =>
      !search
        ? getPhoneCountries()
        : getPhoneCountries().filter(
            (c) =>
              c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search),
          ),
    [search],
  );

  function handleClose() {
    setSearch('');
    onClose();
  }

  function handleSelect(code: string) {
    onSelect(code);
    setSearch('');
    onClose();
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>
          {t('phone.selectCountry')}
        </Text>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('phone.countryPickerDone')}
        >
          <Text style={{ color: theme.primary, fontSize: 16 }}>{t('phone.countryPickerDone')}</Text>
        </Pressable>
      </View>

      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('phone.searchCountryPlaceholder')}
          placeholderTextColor={theme.textMuted}
          style={{
            backgroundColor: theme.surface,
            color: theme.text,
            borderRadius: 8,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontSize: 16,
          }}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={({ item }: { item: PhoneCountry }) => (
          <Pressable
            onPress={() => handleSelect(item.code)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              ...(item.code === selected && { backgroundColor: `${theme.primary}1A` }),
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${item.dialCode}`}
          >
            <Text style={{ fontSize: 24 }}>{countryCodeToEmoji(item.code)}</Text>
            <Text style={{ color: theme.textSecondary, width: 56, fontSize: 14 }}>
              {item.dialCode}
            </Text>
            <Text style={{ color: theme.text, flex: 1, fontSize: 16 }}>{item.name}</Text>
          </Pressable>
        )}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insetBottom }}
      />
    </View>
  );
}
