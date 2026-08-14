/**
 * Phone number validation and normalization utilities.
 *
 * Centralised so every consumer (mobile, web, backend) uses the same rules.
 */

import type { CountryCode } from 'libphonenumber-js';
import { parsePhoneNumber } from 'libphonenumber-js';

/** Number of digits in a local SA mobile number (after removing prefix). */
export const SA_LOCAL_DIGIT_COUNT = 9;

/** International dialling code for South Africa. */
export const SA_COUNTRY_CODE = '+27';

/** Matches a 9-digit local SA mobile number (no prefix). */
export const SA_LOCAL_PHONE_REGEX = /^\d{9}$/;

/** Strip spaces, dashes, parentheses and normalize away any leading 0 or +27 prefix. */
export function normalizeSALocal(val: string): string {
  return val.replace(/[\s\-()]/g, '').replace(/^(\+27|0)/, '');
}

/** Validate that a string is a valid SA local number (after normalization). */
export function isValidSAPhone(val: string): boolean {
  return SA_LOCAL_PHONE_REGEX.test(normalizeSALocal(val));
}

/** Return a full E.164 number (`+27XXXXXXXXX`) from a local input string. */
export function toInternationalSA(val: string): string {
  return `${SA_COUNTRY_CODE}${normalizeSALocal(val)}`;
}

/** Validate that a phone number string is valid for the given ISO country code. */
export function isValidPhone(val: string, countryCode: string): boolean {
  try {
    return parsePhoneNumber(val, countryCode as CountryCode).isValid();
  } catch {
    return false;
  }
}

/** Return an E.164 phone number for the given local input and ISO country code. */
export function toInternational(val: string, countryCode: string): string {
  return parsePhoneNumber(val, countryCode as CountryCode).number;
}
