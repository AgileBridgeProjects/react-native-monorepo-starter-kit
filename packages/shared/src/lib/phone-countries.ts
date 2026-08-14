import { type CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js';

export interface PhoneCountry {
  code: CountryCode;
  dialCode: string;
  name: string;
}

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'ZA';

// Lazy — Intl.DisplayNames must not be called at module-load time in Hermes (React Native).
// Calling new Intl.DisplayNames() before the runtime is ready throws
// "undefined cannot be used as a constructor".
let _countries: PhoneCountry[] | null = null;

function makeRegionNames(): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
}

/** Returns the full sorted list of phone countries. Computed once on first call. */
export function getPhoneCountries(): PhoneCountry[] {
  if (_countries) return _countries;
  const names = makeRegionNames();
  _countries = getCountries()
    .map((code) => ({
      code,
      dialCode: `+${getCountryCallingCode(code)}`,
      name: names?.of(code) ?? code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return _countries;
}

export function getCountryName(code: string): string {
  return makeRegionNames()?.of(code) ?? code;
}

/** Converts an ISO 3166-1 alpha-2 code to its Unicode emoji flag (works on iOS, Android, web). */
export function countryCodeToEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}
