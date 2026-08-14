import {
  clearPhoneOtpTicket,
  getPhoneOtpTicket,
  setPhoneOtpTicket,
} from '@features/auth/presentation/hooks/use-phone-confirmation';
import type { PhoneOtpTicket } from '@starterkit/shared';
import { beforeEach, describe, expect, it } from 'vitest';

describe('usePhoneConfirmation', () => {
  const mockTicket: PhoneOtpTicket = { phoneNumber: '+27821234567' };

  beforeEach(() => {
    clearPhoneOtpTicket();
  });

  describe('setPhoneOtpTicket', () => {
    it('stores the phone OTP ticket', () => {
      setPhoneOtpTicket(mockTicket);
      expect(getPhoneOtpTicket()).toBe(mockTicket);
    });
  });

  describe('getPhoneOtpTicket', () => {
    it('returns null when no ticket has been set', () => {
      expect(getPhoneOtpTicket()).toBeNull();
    });

    it('returns the stored ticket', () => {
      setPhoneOtpTicket(mockTicket);
      expect(getPhoneOtpTicket()).toBe(mockTicket);
    });
  });

  describe('clearPhoneOtpTicket', () => {
    it('clears the stored ticket', () => {
      setPhoneOtpTicket(mockTicket);
      clearPhoneOtpTicket();
      expect(getPhoneOtpTicket()).toBeNull();
    });
  });
});
