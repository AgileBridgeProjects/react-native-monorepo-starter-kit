import { Platform, Pressable, View } from 'react-native';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import { DownloadProgressButton } from './download-progress-button';
import { Icon } from './icon';

export interface DownloadStateButtonProps {
  /** Whether this item has a valid offline download. */
  isDownloaded: boolean;
  /** Whether a download is currently in progress. */
  isDownloading: boolean;
  /** Download progress as a 0–1 fraction (null = indeterminate). */
  downloadProgress?: number | null;
  /** Whether the download has expired (shows refresh icon). */
  isExpired?: boolean;
  /** Called when the user taps to start a download. */
  onDownload?: () => void;
  /** Called to cancel an in-progress download. */
  onCancelDownload?: () => void;
  /** Called when the user taps to remove a completed download. */
  onRemoveDownload?: () => void;
  /** Accessibility label for download action. */
  downloadLabel?: string;
  /** Accessibility label for remove action. */
  removeLabel?: string;
  /** Test ID for the download button. */
  downloadTestID?: string;
  /** Test ID for the remove button. */
  removeTestID?: string;
}

/**
 * Shared 3-state download button used by both TopicCard and GameCard.
 *
 * States:
 * - **Downloaded** → checkmark icon (tap to remove)
 * - **Downloading** → circular progress ring with stop icon (tap to cancel)
 * - **Not downloaded** → download arrow icon (tap to start) or refresh icon if expired
 *
 * Only renders on native platforms.
 */
export function DownloadStateButton({
  isDownloaded,
  isDownloading,
  downloadProgress,
  isExpired = false,
  onDownload,
  onCancelDownload,
  onRemoveDownload,
  downloadLabel,
  removeLabel,
  downloadTestID,
  removeTestID,
}: DownloadStateButtonProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  if (Platform.OS === 'web') return null;

  // State: Downloaded — checkmark (tap to remove)
  if (isDownloaded && onRemoveDownload) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
        testID={removeTestID}
        onPress={onRemoveDownload}
        className="items-center justify-center"
      >
        <Icon
          name="checkmark.circle.fill"
          size={iconSize.md}
          color={colors[colorScheme].textMuted}
        />
      </Pressable>
    );
  }

  // State: Downloading — progress ring with cancel
  if (isDownloading) {
    return (
      <View
        className={cn(
          'items-center justify-center rounded-xl px-md py-md',
          colorScheme === 'dark' ? 'bg-surface-elevated' : 'bg-white',
        )}
      >
        <DownloadProgressButton
          progress={downloadProgress ?? null}
          onCancel={onCancelDownload ?? (() => {})}
          size={iconSize.xs}
        />
      </View>
    );
  }

  // State: Not downloaded — download arrow (or refresh if expired)
  if (onDownload) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={downloadLabel}
        testID={downloadTestID}
        onPress={onDownload}
        className={cn(
          'items-center justify-center rounded-xl px-md py-md',
          colorScheme === 'dark' ? 'bg-surface-elevated' : 'bg-white',
        )}
      >
        <Icon
          name={isExpired ? 'arrow.clockwise' : 'arrow.down.circle.fill'}
          size={iconSize.xs}
          color={
            isExpired
              ? (colors[colorScheme].warning ?? colors[colorScheme].textMuted)
              : colors[colorScheme].textMuted
          }
        />
      </Pressable>
    );
  }

  return null;
}
