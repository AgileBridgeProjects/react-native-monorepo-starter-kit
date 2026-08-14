// This module is client-only by transitive boundary: all callers are 'use client'
// components, so this singleton will never execute in a server context.
import type { PhoneOtpTicket } from '@starterkit/shared';

/**
 * Module-level store for the active phone auth ticket.
 *
 * The GoTrue phone OTP flow is stateless — `sendPhoneOtp` returns a lightweight
 * `PhoneOtpTicket` ({ phoneNumber }) that must be handed back to
 * `confirmPhoneOtp`. This module holds a single in-memory reference for the
 * duration of the phone login flow (phone-login → otp-verify) and is cleared
 * once auth succeeds or the flow is abandoned.
 *
 * Mirrors apps/expo/src/features/auth/presentation/hooks/use-phone-confirmation.ts
 */
let _ticket: PhoneOtpTicket | null = null;

export function setConfirmationResult(ticket: PhoneOtpTicket): void {
  _ticket = ticket;
}

export function getConfirmationResult(): PhoneOtpTicket | null {
  return _ticket;
}

export function clearConfirmationResult(): void {
  _ticket = null;
}
