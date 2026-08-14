import { useTranslation } from '@lib/i18n';
import { GradientBackground } from '@/components/ui';
import { cn } from '@/src/lib/cn';
import { useIsOnline } from '@/src/lib/hooks/use-is-online';
import { InfoBanner } from './info-banner';

interface ContentSheetProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Suppress the built-in offline banner. Use on screens that render
   * their own contextual status banners (e.g. GamesScreen).
   */
  hideStatusBanner?: boolean;
  /** Override the default offline banner message text. */
  offlineBannerMessage?: string;
}

/**
 * Content sheet for detail screens (profile, settings, notifications).
 *
 * Adds NO top padding of its own. Every consumer sits under the root stack's
 * `detailScreenOptions`, which is an OPAQUE header (`headerTransparent: false`), so React
 * Navigation already reserves that space and content starts below it — `'none'` in
 * {@link useHeaderClearance}'s documented contract.
 *
 * It used to pad by `useHeaderClearance('detail')`, from when these screens had transparent
 * floating headers. Once the headers became opaque that padding was counted twice, which is
 * where the large empty band at the top of Settings and the profile screen came from.
 *
 * The hook is not called at all rather than called with `'none'` for a value that is always
 * zero: dev arrived at the same fix that way, but with no padding left to apply the result
 * would be an unused binding.
 *
 * Renders a shared offline banner above the scrollable content when the device
 * has no connectivity.
 */
export function ContentSheet({
  children,
  className,
  hideStatusBanner = false,
  offlineBannerMessage,
}: ContentSheetProps) {
  const { t } = useTranslation('common');
  const isOnline = useIsOnline();
  const banner =
    !hideStatusBanner && !isOnline ? (
      <InfoBanner
        message={offlineBannerMessage ?? t('statusBanner.offline')}
        icon="wifi.slash"
        variant="muted"
      />
    ) : null;

  return (
    <GradientBackground className={cn(className)}>
      {banner}
      {children}
    </GradientBackground>
  );
}
