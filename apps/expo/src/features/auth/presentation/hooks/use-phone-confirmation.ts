import type { PhoneOtpTicket } from '@starterkit/shared';

/**
 * Module-level store for the active phone auth ticket.
 *
 * GoTrue phone OTP is stateless — the `PhoneOtpTicket` simply carries the phone
 * number needed for the confirm step. This module holds a single in-memory
 * reference for the duration of the phone login flow (phone-login → otp-verify)
 * and is cleared once auth succeeds or the flow is abandoned.
 */
let _ticket: PhoneOtpTicket | null = null;

export function setPhoneOtpTicket(ticket: PhoneOtpTicket): void {
  _ticket = ticket;
}

export function getPhoneOtpTicket(): PhoneOtpTicket | null {
  return _ticket;
}

export function clearPhoneOtpTicket(): void {
  _ticket = null;
}
