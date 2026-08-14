'use client';

import { SupabaseAuthDatasource } from '@features/auth/infrastructure/datasources/supabase-auth.datasource';
import { revokeAndSignOut } from '@features/auth/infrastructure/revoke-session';
import { lastVisitedPath } from '@lib/last-visited-path';
import { isEmail } from '@lib/validation-utils';
import { useAuthStore } from '@store/auth-store';
import { useMutation } from '@tanstack/react-query';
import { CUSTOM_AUTH_EMAIL_DOMAIN, type PhoneOtpTicket } from '@starterkit/shared';

const authDatasource = new SupabaseAuthDatasource();

export function useLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => {
      // Only treat input as an email when it matches email format.
      // Usernames may include "@" but still be CustomAuthentication usernames.
      const identifier = email.trim();
      const resolvedEmail = isEmail(identifier)
        ? identifier
        : `${identifier}${CUSTOM_AUTH_EMAIL_DOMAIN}`;
      return authDatasource.login(resolvedEmail, password);
    },
    onSuccess: ({ user, idToken }) => {
      setAuth(user, idToken);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // Revoke server-side refresh tokens and sign out of Supabase.
      // revokeAndSignOut is fire-and-forget internally — always resolves.
      await revokeAndSignOut();
    },
    onSuccess: () => {
      // Deliberate sign-out — clear stored path so the next login starts at home.
      lastVisitedPath.clear();
      logout();
    },
  });
}

export function useSendPhoneOtp() {
  return useMutation({
    mutationFn: ({ phoneNumber }: { phoneNumber: string }) =>
      authDatasource.sendPhoneOtp(phoneNumber),
  });
}

export function useVerifyOtp() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: ({ ticket, otp }: { ticket: PhoneOtpTicket; otp: string }) =>
      authDatasource.confirmPhoneOtp(ticket, otp),
    onSuccess: ({ user, idToken }) => {
      setAuth(user, idToken);
    },
  });
}
