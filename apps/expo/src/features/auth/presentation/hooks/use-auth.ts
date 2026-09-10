import { clearCachedAvatarUrl } from '@features/profile/presentation/hooks/use-profile';
import { crashReporter } from '@lib/crash-reporting';
import type { PhoneOtpTicket } from '@starterkit/shared';
import { useAuthStore } from '@store/auth-store';
import { useMutation } from '@tanstack/react-query';
import { SupabaseAuthDatasource } from '../../infrastructure/datasources/supabase-auth.datasource';
import { useFinalizeAuthSession } from './use-finalize-auth-session';

const authDataSource = new SupabaseAuthDatasource();

export function useLogin() {
  const finalizeAuthSession = useFinalizeAuthSession();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authDataSource.login(email, password);
      await finalizeAuthSession(result.user, result.idToken);
      return result;
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => authDataSource.logout(),
    onSuccess: () => {
      clearCachedAvatarUrl();
      crashReporter.setUserId(null);
      logout();
    },
  });
}

export function useSendPhoneOtp() {
  return useMutation({
    mutationFn: ({ phoneNumber }: { phoneNumber: string }) =>
      authDataSource.sendPhoneOtp(phoneNumber),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ ticket, otp }: { ticket: PhoneOtpTicket; otp: string }) =>
      authDataSource.confirmPhoneOtp(ticket, otp),
    // No onSuccess here — the caller (OtpVerifyScreen) owns the full auth commit
    // so it can bootstrap the dev phone user before setting auth state.
  });
}
