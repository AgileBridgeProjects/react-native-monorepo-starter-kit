import {
  InvalidPhoneNumberFailure,
  OtpExpiredFailure,
  OtpInvalidFailure,
  OtpTooManyRequestsFailure,
} from '@starterkit/shared';
import { describe, expect, it } from 'vitest';

describe('Phone / OTP failure classes', () => {
  describe('InvalidPhoneNumberFailure', () => {
    it('has the correct message and localeKey', () => {
      const failure = new InvalidPhoneNumberFailure();
      expect(failure.message).toBeTruthy();
      expect(failure.localeKey).toBe('auth.invalidPhoneNumber');
    });
  });

  describe('OtpInvalidFailure', () => {
    it('has the correct message and localeKey', () => {
      const failure = new OtpInvalidFailure();
      expect(failure.message).toBeTruthy();
      expect(failure.localeKey).toBe('auth.otpInvalid');
    });
  });

  describe('OtpExpiredFailure', () => {
    it('has the correct message and localeKey', () => {
      const failure = new OtpExpiredFailure();
      expect(failure.message).toBeTruthy();
      expect(failure.localeKey).toBe('auth.otpExpired');
    });
  });

  describe('OtpTooManyRequestsFailure', () => {
    it('has the correct message and localeKey', () => {
      const failure = new OtpTooManyRequestsFailure();
      expect(failure.message).toBeTruthy();
      expect(failure.localeKey).toBe('auth.otpTooManyRequests');
    });
  });
});
