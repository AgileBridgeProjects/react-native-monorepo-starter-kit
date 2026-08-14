import { SetupAccountScreen } from '@features/auth/presentation/screens/setup-account-screen';

/**
 * Universal Link / App Link entry point — matches the
 * `/mobile-setup-account` path declared in `app.json`'s `associatedDomains` /
 * `intentFilters` and in `apps/web/public/.well-known/`. Renders the same
 * screen as the `(auth)/setup-account` route; kept as a separate path so the
 * mobile deep link never collides with the Admin Portal's own
 * `/setup-account` page on the shared pre-launch host.
 */
export default SetupAccountScreen;
