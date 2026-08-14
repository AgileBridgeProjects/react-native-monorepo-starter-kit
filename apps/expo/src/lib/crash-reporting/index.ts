import { noopReporter } from './noop';
import type { CrashReporter } from './types';

export type { CrashReporter };

// Crash reporting is a no-op — Firebase Crashlytics was removed (the app no longer
// depends on Firebase). To enable real crash/error telemetry, add a reporter that
// implements CrashReporter (e.g. @sentry/react-native) and select it here.
export const crashReporter: CrashReporter = noopReporter;
