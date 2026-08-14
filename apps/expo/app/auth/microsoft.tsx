import { microsoftAuthDatasource } from '@features/auth/infrastructure/datasources/microsoft-auth.datasource';
import {
  MS_PKCE_STATE_KEY,
  MS_PKCE_VERIFIER_KEY,
} from '@features/auth/infrastructure/utils/microsoft-pkce';
import { useFinalizeAuthSession } from '@features/auth/presentation/hooks/use-finalize-auth-session';
import { navigateToAppRoot } from '@features/auth/presentation/navigate-to-app-root';
import { useTranslation } from '@lib/i18n';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import { Button, Typography } from '@/components/ui';

/**
 * OAuth redirect handler for Microsoft Entra ID sign-in.
 *
 * Native: Azure AD redirects to starterkit-mobile://auth/microsoft after authentication.
 * Calling maybeCompleteAuthSession() signals expo-auth-session to close the in-app
 * browser and resolve the auth request in the originating screen (login-screen).
 *
 * Web: Microsoft redirects to /auth/microsoft?code=… after authentication. This
 * component exchanges the code for tokens via the PKCE flow, then signs in with
 * a Firebase custom token that contains the club_id claim.
 */
WebBrowser.maybeCompleteAuthSession();

const MS_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ?? '';
const MS_TENANT_ID = process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID ?? 'common';

/** Seconds before showing "taking too long" hint on the redirect page. */
const WEB_REDIRECT_TIMEOUT_S = 15;

export default function MicrosoftAuthRedirect() {
  const router = useRouter();
  const finalizeAuthSession = useFinalizeAuthSession();
  const { t } = useTranslation('auth');
  const [error, setError] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => setIsSlow(true), WEB_REDIRECT_TIMEOUT_S * 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const codeVerifier = sessionStorage.getItem(MS_PKCE_VERIFIER_KEY);
    const expectedState = sessionStorage.getItem(MS_PKCE_STATE_KEY);

    if (!code || !codeVerifier) {
      // No code or verifier — redirect back to login
      router.replace('/(auth)/login');
      return;
    }

    // Verify CSRF state before exchanging the code
    if (!expectedState || returnedState !== expectedState) {
      sessionStorage.removeItem(MS_PKCE_VERIFIER_KEY);
      sessionStorage.removeItem(MS_PKCE_STATE_KEY);
      setError(t('microsoft.stateMismatch'));
      return;
    }

    sessionStorage.removeItem(MS_PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(MS_PKCE_STATE_KEY);

    (async () => {
      try {
        // Exchange auth code for tokens with Microsoft
        const tokenUrl = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
        const body = new URLSearchParams({
          client_id: MS_CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${window.location.origin}/auth/microsoft`,
          code_verifier: codeVerifier,
        });

        const tokenRes = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!tokenRes.ok) {
          // Log the raw response for diagnostics without exposing it to the user
          const errBody = await tokenRes.text();
          void errBody; // diagnostic — do not render to the user
          throw new Error(t('microsoft.tokenExchangeFailed'));
        }

        const tokens = (await tokenRes.json()) as { id_token?: string };
        if (!tokens.id_token) throw new Error(t('microsoft.noIdToken'));

        // Exchange Microsoft id_token for Firebase custom token via backend
        const { user, idToken } = await microsoftAuthDatasource.exchangeToken(tokens.id_token);
        await finalizeAuthSession(user, idToken);

        // Clean URL and navigate to main app
        window.history.replaceState({}, '', '/auth/microsoft');
        navigateToAppRoot(router);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('microsoft.tokenExchangeFailed'));
      }
    })();
  }, [router, finalizeAuthSession, t]);

  if (Platform.OS !== 'web') return null;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-md">
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../assets/images/icon.png')}
          className="mb-2xl h-20 w-20"
          resizeMode="contain"
          accessibilityLabel="StarterKit"
        />
        <Typography variant="h2" className="mb-sm">
          {t('microsoft.redirectErrorTitle')}
        </Typography>
        <Typography variant="body" className="mb-md text-text-secondary text-center">
          {t('microsoft.redirectErrorMessage')}
        </Typography>
        <Button variant="ghost" size="sm" onPress={() => router.replace('/(auth)/login')}>
          {t('microsoft.redirectBackToLogin')}
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../assets/images/icon.png')}
        className="mb-2xl h-20 w-20"
        resizeMode="contain"
        accessibilityLabel="StarterKit"
      />
      <ActivityIndicator size="large" />
      <Typography variant="body" className="mt-md text-text-secondary">
        {t('microsoft.redirectCompletingSignIn')}
      </Typography>
      {isSlow && (
        <View className="mt-lg items-center">
          <Typography variant="body-sm" className="mb-sm text-text-muted text-center px-2xl">
            {t('oauth.takingLong')}
          </Typography>
          <Button variant="ghost" size="sm" onPress={() => router.replace('/(auth)/login')}>
            {t('microsoft.redirectBackToLogin')}
          </Button>
        </View>
      )}
    </View>
  );
}
