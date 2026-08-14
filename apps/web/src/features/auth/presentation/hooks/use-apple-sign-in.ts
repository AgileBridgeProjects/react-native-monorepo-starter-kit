import { useOAuthSignIn } from './use-oauth-sign-in';

export function useAppleSignIn(onSuccess?: () => void) {
  return useOAuthSignIn('apple', onSuccess);
}
