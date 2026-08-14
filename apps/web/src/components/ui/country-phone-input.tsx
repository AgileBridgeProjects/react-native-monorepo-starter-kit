'use client';

import { useTranslation } from '@lib/i18n';
import { getPhoneCountries, type PhoneCountry } from '@starterkit/shared';
import DropDownBox from 'devextreme-react/drop-down-box';
import List from 'devextreme-react/list';
import TextBox from 'devextreme-react/text-box';
import { useMemo, useState } from 'react';
import { CountryFlag } from './country-flag';
import { FormField } from './form-field';

// ─── CountrySelector ─────────────────────────────────────────────────────────

interface CountrySelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const selected = getPhoneCountries().find((c) => c.code === value);

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

  function handleOpenedChange(opened: boolean) {
    setIsOpen(opened);
    if (!opened) setSearch('');
  }

  return (
    <DropDownBox
      elementAttr={{ class: 'country-select' }}
      opened={isOpen}
      onOptionChanged={(e) => {
        if (e.name === 'opened') handleOpenedChange(e.value as boolean);
      }}
      stylingMode="outlined"
      width={104}
      className="h-full"
      dropDownOptions={{ width: 300 }}
      fieldRender={() => (
        /* DX requires a TextBox in fieldRender. We make it read-only and show
           the dial code; the flag is overlaid by the parent's absolute span. */
        <TextBox value={selected?.dialCode ?? ''} readOnly stylingMode="outlined" />
      )}
      contentRender={() => (
        <div className="flex flex-col gap-1">
          <TextBox
            value={search}
            onValueChanged={(e) => setSearch(e.value ?? '')}
            valueChangeEvent="input"
            placeholder={t('users:addUser.form.phone.searchPlaceholder')}
            stylingMode="outlined"
            inputAttr={{ autoFocus: true }}
          />
          <List
            dataSource={filtered}
            height={250}
            itemRender={(item: PhoneCountry) => (
              <div className="flex items-center gap-2.5 py-1">
                <CountryFlag code={item.code} className="h-3.5 w-5 shrink-0" />
                <span className="text-text-secondary w-12 shrink-0 text-sm tabular-nums">
                  {item.dialCode}
                </span>
                <span className="text-text truncate">{item.name}</span>
              </div>
            )}
            onItemClick={(e) => {
              onChange((e.itemData as PhoneCountry).code);
              handleOpenedChange(false);
            }}
          />
        </div>
      )}
    />
  );
}

// ─── CountryPhoneInput ────────────────────────────────────────────────────────

export interface CountryPhoneInputProps {
  countryCode: string;
  onCountryChange: (code: string) => void;
  phoneNumber: string;
  onPhoneChange: (val: string) => void;
  /** Already-formatted error message (caller handles i18n). */
  error?: string;
  label?: string;
  htmlFor?: string;
  placeholder?: string;
  testID?: string;
  /** Renders a muted "(optional)" marker after the label. Ignored when `required`. */
  optional?: boolean;
  /** Renders a "*" marker after the label. */
  required?: boolean;
}

export function CountryPhoneInput({
  countryCode,
  onCountryChange,
  phoneNumber,
  onPhoneChange,
  error,
  label,
  htmlFor = 'phone-number',
  placeholder,
  testID,
  optional,
  required,
}: CountryPhoneInputProps) {
  const { t } = useTranslation();

  return (
    <FormField
      label={label ?? t('users:addUser.form.phone.label')}
      htmlFor={htmlFor}
      error={error}
      optional={optional}
      required={required}
    >
      {/* Single fused control: inner DX borders stripped via .country-phone-group. */}
      <div className="country-phone-group border-border-strong focus-within:border-primary flex items-stretch overflow-hidden rounded-[var(--starterkit-admin-radius-sm)] border bg-surface-elevated transition-colors">
        {/* Country selector — flag overlaid, dial code in trigger, search inside dropdown */}
        <div className="border-border relative flex shrink-0 border-r">
          <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2">
            <CountryFlag code={countryCode} className="h-3.5 w-5" />
          </span>
          <CountrySelector value={countryCode} onChange={onCountryChange} />
        </div>

        {/* Local phone number */}
        <div className="flex-1">
          <TextBox
            inputAttr={{ id: htmlFor, type: 'tel', autoComplete: 'off', 'data-testid': testID }}
            value={phoneNumber}
            onValueChanged={(e) => onPhoneChange(e.value ?? '')}
            placeholder={placeholder ?? t('users:addUser.form.phone.placeholder')}
            stylingMode="outlined"
          />
        </div>
      </div>
    </FormField>
  );
}
