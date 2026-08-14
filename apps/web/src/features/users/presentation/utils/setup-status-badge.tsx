import { CancelIcon, ClockIcon, SuccessIcon } from '@starterkit/icons';
import { StatusBadge } from '@/components/ui';
import { SetupStatus } from '@/proxy/models';

/**
 * Returns a `StatusBadge` for the given `SetupStatus`.
 * Pass the `t` function so callers can provide their own i18n scope.
 */
export function getSetupStatusBadge(
  setupStatus: SetupStatus | undefined,
  t: (key: string) => string,
) {
  switch (setupStatus) {
    case SetupStatus.PendingSetup:
      return (
        <StatusBadge
          icon={ClockIcon}
          variant="warning"
          tooltip={t('users:setupStatus.pendingSetup')}
        />
      );
    case SetupStatus.SetupExpired:
      return (
        <StatusBadge
          icon={CancelIcon}
          variant="error"
          tooltip={t('users:setupStatus.setupExpired')}
        />
      );
    default:
      return (
        <StatusBadge
          icon={SuccessIcon}
          variant="success"
          tooltip={t('users:setupStatus.completed')}
        />
      );
  }
}
