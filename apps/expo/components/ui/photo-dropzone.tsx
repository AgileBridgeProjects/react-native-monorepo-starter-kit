import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { iconSize, palette } from '@/constants/tokens';
import { Icon } from './icon';
import { Typography } from './typography';

/** The remove badge is `h-7 w-7 rounded-full` (28px, so a 14px corner radius)
 * — the box uses that same radius so its corner curves into the badge rather
 * than clashing with a tighter/looser curve of its own. */
const BOX_RADIUS_CLASS = 'rounded-[14px]';

interface PhotoDropzoneProps {
  imageUri?: string | null;
  isUploading?: boolean;
  onPress: () => void;
  /** Clears the picked photo so the caller can pick a different one. Omit to
   * hide the remove control (e.g. while there's nothing selected yet). */
  onRemove?: () => void;
  /** Required whenever `onRemove` is provided — the remove button is icon-only
   * and needs a label for screen readers. */
  removeLabel: string;
  testID?: string;
  uploadCta: string;
  uploadHint: string;
  accessibilityLabel: string;
}

export function PhotoDropzone({
  imageUri,
  isUploading = false,
  onPress,
  onRemove,
  removeLabel,
  testID,
  uploadCta,
  uploadHint,
  accessibilityLabel,
}: PhotoDropzoneProps) {
  const placeholderIcon = isUploading ? (
    <ActivityIndicator color={palette.white.DEFAULT} />
  ) : (
    <View className="size-2xl items-center justify-center rounded-full bg-white">
      <Icon name="camera.fill" size={iconSize.sm} color={palette.blue.dark} />
    </View>
  );

  const boxContent = imageUri ? (
    <Image
      source={{ uri: imageUri }}
      className={`h-full w-full ${BOX_RADIUS_CLASS}`}
      resizeMode="cover"
    />
  ) : (
    <View className="items-center gap-xs">
      {placeholderIcon}
      <Typography variant="caption" className="text-white">
        {uploadCta}
      </Typography>
      <Typography variant="caption" className="text-2xs text-white">
        {uploadHint}
      </Typography>
    </View>
  );

  return (
    <View className="h-[118px] w-[157px] self-center">
      <Pressable
        onPress={onPress}
        disabled={isUploading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        className={`h-full w-full items-center justify-center ${BOX_RADIUS_CLASS} border border-dashed border-brand-cyan-light`}
      >
        {boxContent}
      </Pressable>

      {/* Only once a photo is actually selected — re-picking (tap the preview)
          already replaces it; this is specifically for clearing back to empty. */}
      {imageUri && onRemove && !isUploading && (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/60"
        >
          <Icon name="xmark" size={iconSize.xs} color={palette.white.DEFAULT} />
        </Pressable>
      )}
    </View>
  );
}
