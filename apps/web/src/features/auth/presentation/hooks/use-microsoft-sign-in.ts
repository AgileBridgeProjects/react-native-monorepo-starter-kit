import { useOAuthSignIn } from './use-oauth-sign-in';

export function useMicrosoftSignIn(onSuccess?: () => void) {
  return useOAuthSignIn('microsoft', onSuccess);
}
