import '../global.css';
import '@lib/i18n';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthInitializer } from '@features/auth/presentation/components/auth-initializer';
import { useTranslation } from '@lib/i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useAuthStore } from '@store/auth-store';
import { Toaster } from 'sonner-native';
import { Uniwind } from 'uniwind';
import { AnimatedSplash, Button, Typography } from '@/components/ui';
import { colors, palette } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { crashReporter } from '@/src/lib/crash-reporting';
import { queryClient } from '@/src/lib/http/query-client';
import { UpdateBanner } from '@/src/lib/update-banner';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Keep the native splash up until <AnimatedSplash /> has painted and can take
// over the animation — see the handoff sequence in RootLayout below.
void SplashScreen.preventAutoHideAsync();

// Cross-fade the native splash out instead of cutting, so the seam between it and
// <AnimatedSplash /> is softened even further (iOS only; a no-op on Android).
SplashScreen.setOptions({ fade: true, duration: 250 });

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background p-md">
      <Typography variant="h2" className="mb-sm">
        Something went wrong
      </Typography>
      <Typography variant="body" className="mb-md px-lg" selectable>
        {error instanceof Error ? error.message : JSON.stringify(error)}
      </Typography>
      <Button variant="primary" onPress={resetErrorBoundary} className="mt-lg">
        Try again
      </Button>
    </View>
  );
}

function NavigationBreadcrumb() {
  const pathname = usePathname();
  useEffect(() => {
    crashReporter.log(`nav: ${pathname}`);
  }, [pathname]);
  return null;
}

function handleErrorBoundary(error: unknown) {
  crashReporter.recordError(error instanceof Error ? error : new Error(String(error)), {
    layer: 'react',
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { isHydrated, isAuthenticated, isResolvingOrg } = useAuthStore();
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const isReady = isHydrated && fontsLoaded;

  // ─── Splash handoff ────────────────────────────────────────────────────────
  // The native splash cannot animate (static launch storyboard on iOS, static
  // splash theme on Android), so it hands the screen to <AnimatedSplash />, which
  // draws the same wordmark at the same size on the same navy. Nothing moves at
  // the seam, so the two read as one continuous animated splash. It stays up for
  // exactly as long as isReady takes — no artificial minimum hold — so a warm
  // start dismisses immediately instead of forcing a loop nobody needed to see.
  const nativeSplashHiddenRef = useRef(false);

  // Called on the first frame <AnimatedSplash /> has painted — hiding any earlier
  // exposes an unpainted screen. Also fires as soon as the app is ready, as a
  // safety net in case that first frame is somehow never reported.
  const hideNativeSplash = useCallback(() => {
    if (nativeSplashHiddenRef.current) return;
    nativeSplashHiddenRef.current = true;
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (isReady) hideNativeSplash();
  }, [isReady, hideNativeSplash]);

  const showSplash = !isReady;

  const scheme = colorScheme ?? 'light';
  const stackHeaderStyle = {
    backgroundColor: colors[scheme].tabBar,
    borderBottomColor: colors[scheme].tabBarBorder,
    borderBottomWidth: 0.5,
    shadowOpacity: 0 as const,
    elevation: 0,
  } as const;
  const stackHeaderTitleStyle = {
    color: colors[scheme].text,
    fontSize: 16,
    fontWeight: '600' as const,
  };

  // Detail screens (previously a nested (detail) Stack) live directly on the root stack
  // so the push from (tabs) gives them a real in-stack predecessor — that's what makes
  // the NATIVE back button render. A nested stack's first screen has no predecessor, so
  // the native control rendered nothing there.
  //
  // The header is OPAQUE navy, deliberately not transparent. A transparent header means
  // the list scrolls underneath it, and iOS 26 then draws a scroll-edge material over
  // that region to keep the header legible — which is what washed the whole thread out
  // to ~15% opacity and blurred it further when the keyboard pushed content up.
  // `scrollEdgeEffects: hidden` did not contain it. An opaque header removes the cause
  // rather than fighting the symptom: content simply starts below the header, and the
  // navy matches the screen so the join is invisible anyway.
  const detailScreenOptions = {
    headerTransparent: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: palette.blue.screen },
    headerTitleStyle: {
      color: colors[scheme].primaryForeground,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    headerTintColor: colors[scheme].primaryForeground,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerBackVisible: true,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    contentStyle: { backgroundColor: palette.blue.screen },
  } as const;

  // Lock to portrait on startup — individual content screens unlock as needed.
  // Dynamic import: the native module may be absent in older dev client builds.
  useEffect(() => {
    import('expo-screen-orientation')
      .then((m) => m.lockAsync(m.OrientationLock.PORTRAIT_UP))
      .catch(() => {});
  }, []);

  // Sync Inwiwnd's theme with the app store preference.
  // Inwiwnd uses Appearance.getColorScheme() (OS preference) by default, which
  // bypasses our store. Calling setTheme() disables adaptive OS-tracking and
  // forces the HTML class (and native color scheme) to match our stored value.
  useEffect(() => {
    Uniwind.setTheme(colorScheme);
  }, [colorScheme]);

  const content = isReady ? (
    <Stack
      screenOptions={{
        headerStyle: stackHeaderStyle,
        headerTitleStyle: stackHeaderTitleStyle,
        headerTransparent: false,
        headerTitleAlign: 'center',
        // Native back everywhere — the platform owns its alignment, hit target,
        // and iOS 26 glass treatment. Tinted to brand primary on the opaque
        // default header; detail screens override to white below.
        headerTintColor: colors[scheme].primary,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      {/* The auth group is deliberately NOT wrapped in Stack.Protected: in expo-router 56
          a failed guard excludes its screens from the navigator without redirecting
          (`withLayoutContext`: `excludeChildren = exclude || !guard`), so guarding it
          deleted `/login` out from under the navigation state the instant a sign-in
          flipped the guard — leaving no route to render at all (the black-screen-on-login
          that a reload "fixed"). (auth)/_layout redirects signed-in users itself instead,
          a pattern proven in production on this same Expo version. The authenticated group
          below stays guarded: that direction always has a mounted /login to land on. */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* OAuth redirect target — always reachable regardless of auth state, since it's
          what produces that state (see app/auth/microsoft.tsx). */}
      <Stack.Screen name="auth/microsoft" options={{ headerShown: false }} />

      {/* Universal Link / App Link setup-account entry — reachable before
          sign-in, since it's what sets up the account. Renders its own layout; without
          this the route path shows up as the navigation title. */}
      <Stack.Screen name="mobile-setup-account" options={{ headerShown: false }} />

      <Stack.Protected guard={isAuthenticated && !isResolvingOrg}>
        <Stack.Screen name="select-org" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Detail screens — the (detail) group has no _layout, so these are pushed
            directly onto this stack (see detailScreenOptions above for why). */}
        <Stack.Screen
          name="(detail)/profile"
          options={{ ...detailScreenOptions, title: t('titles:profile') }}
        />
        <Stack.Screen
          name="(detail)/edit-profile"
          options={{ ...detailScreenOptions, title: t('titles:editProfile') }}
        />
        <Stack.Screen
          name="(detail)/settings"
          options={{ ...detailScreenOptions, title: t('titles:settings') }}
        />
        <Stack.Screen
          name="(detail)/help"
          options={{ ...detailScreenOptions, title: t('titles:help') }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack.Protected>
    </Stack>
  ) : (
    // <AnimatedSplash /> is a full-bleed overlay rendered below, so it already
    // covers the entire !isReady window on every platform — including web, where
    // the native splash APIs are no-ops and nothing else would fill the screen.
    <View className="flex-1 bg-brand-blue-screen" />
  );

  return (
    <GestureHandlerRootView className="flex-1">
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleErrorBoundary}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <NavigationBreadcrumb />
            <AuthInitializer />
            {content}
            <StatusBar style="auto" />
            {/* Transient toast overlay — mounted once for the entire app. */}
            <Toaster position="top-center" />
            {/* Full-screen OTA restart prompt — overlays everything once an EAS
                 update has downloaded. No-ops in dev clients. */}
            <UpdateBanner />
            {/* Animated continuation of the native splash. Mounted last so it sits
                 above every other layer, and self-fades on unmount. */}
            {showSplash && <AnimatedSplash onLayout={hideNativeSplash} />}
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
