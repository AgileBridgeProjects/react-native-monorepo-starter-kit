import { useOAuthSignIn } from './use-oauth-sign-in';

export function useGoogleSignIn(onSuccess?: () => void) {
  return useOAuthSignIn('google', onSuccess);
}
