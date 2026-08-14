import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import type { Href } from 'expo-router';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

interface RequirePermissionProps {
  /** e.g. `'StarterKit.CheckIns.Access'` — checked against the caller's resolved permission set. */
  permission: string;
  /** Where to send a caller who lacks the permission (e.g. deep link, stale bookmark). */
  fallbackHref: Href;
  children: ReactNode;
}

/**
 * Route-level permission gate for `(detail)` screens reached by navigation rather than
 * being the tab root itself (which has nowhere to redirect to and gates inline instead —
 * see `AthleteYouScreen`). Mirrors the web portal's `requirePermission` route guard
 * (`apps/web/src/features/auth/presentation/guards/route-guards.ts`).
 */
export function RequirePermission({ permission, fallbackHref, children }: RequirePermissionProps) {
  const { hasPermission } = useCurrentSession();

  if (!hasPermission(permission)) {
    return <Redirect href={fallbackHref} />;
  }

  return <>{children}</>;
}
