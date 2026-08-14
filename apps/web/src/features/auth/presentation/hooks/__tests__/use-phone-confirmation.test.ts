import {
  clearConfirmationResult,
  getConfirmationResult,
  setConfirmationResult,
} from '@features/auth/presentation/hooks/use-phone-confirmation';
import type { PhoneOtpTicket } from '@starterkit/shared';
import { afterEach, describe, expect, it } from 'vitest';

function makeMockConfirmationResult(): PhoneOtpTicket {
  return { phoneNumber: '+27821234567' };
}

describe('use-phone-confirmation', () => {
  afterEach(() => {
    clearConfirmationResult();
  });

  describe('getConfirmationResult', () => {
    it('returns null when nothing has been set', () => {
      expect(getConfirmationResult()).toBeNull();
    });
  });

  describe('setConfirmationResult', () => {
    it('stores the confirmation result so getConfirmationResult returns it', () => {
      const result = makeMockConfirmationResult();
      setConfirmationResult(result);
      expect(getConfirmationResult()).toBe(result);
    });

    it('replaces a previously stored result', () => {
      const first = makeMockConfirmationResult();
      const second = makeMockConfirmationResult();
      setConfirmationResult(first);
      setConfirmationResult(second);
      expect(getConfirmationResult()).toBe(second);
    });
  });

  describe('clearConfirmationResult', () => {
    it('sets the stored result back to null', () => {
      setConfirmationResult(makeMockConfirmationResult());
      clearConfirmationResult();
      expect(getConfirmationResult()).toBeNull();
    });

    it('is idempotent when nothing is stored', () => {
      expect(() => clearConfirmationResult()).not.toThrow();
      expect(getConfirmationResult()).toBeNull();
    });
  });
});
