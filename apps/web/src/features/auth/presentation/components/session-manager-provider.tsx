'use client';

import { useSignalRSessionManager as useSessionManager } from '@features/auth/presentation/hooks/use-signalr-session-manager';
import { useAuthStore } from '@store/auth-store';
import { SessionWarningModal } from './session-warning-modal';

/**
 * Root-level session management provider.
 *
 * Mounts the idle/absolute timer hook and renders the warning modal.
 * Only active when the user is authenticated — no-ops for public routes.
 *
 * Mount once in client-providers.tsx.
 */
export function SessionManagerProvider() {
  const { isAuthenticated } = useAuthStore();
  const { showWarning, remainingSeconds } = useSessionManager();

  if (!isAuthenticated) return null;

  return <SessionWarningModal visible={showWarning} remainingSeconds={remainingSeconds} />;
}
