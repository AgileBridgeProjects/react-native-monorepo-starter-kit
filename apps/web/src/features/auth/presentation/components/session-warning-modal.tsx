'use client';

import { SESSION_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { useTranslation } from '@lib/i18n';
import { ClockIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { ModalShell, Typography } from '@/components/ui';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SessionWarningModalProps {
  visible: boolean;
  remainingSeconds: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Countdown warning modal displayed before idle session expiry.
 *
 * Any mouse movement, key press, click, or touch while this modal is visible
 * dismisses it and resets the server-side idle timer (handled in
 * use-signalr-session-manager). No explicit buttons are needed.
 */
export function SessionWarningModal({ visible, remainingSeconds }: SessionWarningModalProps) {
  const { t } = useTranslation();

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay =
    minutes > 0
      ? t('auth:session.countdownMinSec', { minutes, seconds: seconds.toString().padStart(2, '0') })
      : t('auth:session.countdownSec', { seconds });

  return (
    <ModalShell
      visible={visible}
      onHide={() => {}}
      icon={<ClockIcon size={iconSize.sm} className="text-primary" />}
      title={t('auth:session.warningTitle')}
      description={t('auth:session.warningMessage')}
      testId={SESSION_TEST_IDS.warningModal}
    >
      <div className="flex flex-col items-center gap-lg text-center">
        <Typography
          variant="body-sm"
          className="text-4xl font-bold tabular-nums text-black"
          data-testid={SESSION_TEST_IDS.countdown}
        >
          {timeDisplay}
        </Typography>

        <Typography variant="body-sm" className="text-text-muted">
          {t('auth:session.warningHint')}
        </Typography>
      </div>
    </ModalShell>
  );
}
