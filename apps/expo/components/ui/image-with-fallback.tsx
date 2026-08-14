import {
  COVER_PATTERN_TILES,
  coverGradientColors,
  generateBrandGradientColors,
  getGradientId,
  getPatternId,
} from '@starterkit/shared';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import { normalizeWebImageUri } from '@/src/lib/utils/normalize-web-image-uri';

import { Icon } from './icon';

export interface ImageWithFallbackProps {
  /** Remote image URL. Shows the fallback icon when null/undefined. */
  uri: string | null | undefined;
  /** SF Symbol name for the fallback icon. Defaults to "square.grid.3x3.fill". */
  fallbackIcon?: Parameters<typeof Icon>[0]['name'];
  /** Tailwind classes applied to both the Image and the fallback container. */
  className?: string;
  /** Content description for accessibility. Required for screen reader support. */
  accessibilityLabel: string;
  /** Tint color applied to the image (recolors non-transparent pixels). */
  tintColor?: string;
  /** How the image fits within its container. Defaults to "cover". */
  contentFit?: 'cover' | 'contain' | 'fill';
  /** Additional inline styles merged onto the expo-image element (e.g. CSS filters). */
  imageStyle?: Record<string, unknown>;
  /** Brand primary color hex used to derive gradient colors instead of static presets. */
  brandColor?: string | null;
}

/** Spacing between icon centres in each row/column of the diagonal grid. */
const ICON_SPACING = 24;

/**
 * Displays a remote image via expo-image, or a faint diagonal mosaic pattern
 * when no URI is available. The mosaic fills the entire container regardless
 * of size, using an onLayout measurement to compute the grid.
 */
export function ImageWithFallback({
  uri,
  fallbackIcon = 'square.grid.3x3.fill',
  className,
  accessibilityLabel,
  tintColor,
  contentFit = 'cover',
  imageStyle,
  brandColor,
}: ImageWithFallbackProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const [loaded, setLoaded] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Detect gradient sentinel and resolve to native color stops.
  const gradientId = getGradientId(uri);
  const gradientColors =
    gradientId !== null
      ? brandColor
        ? generateBrandGradientColors(brandColor)[gradientId]
        : coverGradientColors[gradientId]
      : undefined;

  // Detect pattern overlay sentinel and resolve to SVG tile data.
  const patternId = getPatternId(uri);
  const patternTile = patternId ? COVER_PATTERN_TILES[patternId] : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: uri is a prop; the effect must re-run when the image source changes
  useEffect(() => {
    setLoaded(false);
  }, [uri]);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setDims({ w: width, h: height });
      }
    },
    [],
  );

  // Build diagonal grid that fills the measured container.
  // Odd rows are offset by half-spacing for a diamond/diagonal pattern.
  const renderMosaic = () => {
    if (!dims) return null;

    const iconSz = iconSize.sm;
    const cols = Math.ceil(dims.w / ICON_SPACING) + 1;
    const rows = Math.ceil(dims.h / ICON_SPACING) + 1;
    const iconColor = colors[colorScheme].textMuted;
    const elements: React.ReactNode[] = [];

    for (let row = 0; row < rows; row++) {
      const offsetX = row % 2 === 1 ? ICON_SPACING / 2 : 0;
      for (let col = 0; col < cols; col++) {
        elements.push(
          <View
            key={`${row}-${col}`}
            style={{
              position: 'absolute',
              left: col * ICON_SPACING + offsetX,
              top: row * ICON_SPACING,
            }}
          >
            <Icon name={fallbackIcon} size={iconSz} color={iconColor} />
          </View>,
        );
      }
    }

    return elements;
  };

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      className={cn('items-center justify-center overflow-hidden bg-border/40', className)}
      onLayout={onLayout}
    >
      {/* Gradient cover — rendered natively when the imageUrl is a gradient sentinel */}
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Pattern overlay — tiled SVG rendered on top of the gradient */}
      {patternTile && dims && (
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
          {Array.from({ length: Math.ceil(dims.h / patternTile.tileHeight) + 1 }, (_, row) =>
            Array.from({ length: Math.ceil(dims.w / patternTile.tileWidth) + 1 }, (_, col) => (
              <SvgXml
                // biome-ignore lint/suspicious/noArrayIndexKey: static tile grid — tiles are generated in fixed row/col order and never reordered
                key={`${row}-${col}`}
                xml={patternTile.svgXml}
                width={patternTile.tileWidth}
                height={patternTile.tileHeight}
                style={{
                  position: 'absolute',
                  left: col * patternTile.tileWidth,
                  top: row * patternTile.tileHeight,
                }}
              />
            )),
          ).flat()}
        </View>
      )}

      {!gradientColors && (
        <>
          {/* Diagonal mosaic fallback — fills entire container */}
          {!loaded && dims && <View className="absolute inset-0 opacity-20">{renderMosaic()}</View>}

          {uri && (
            <Image
              source={{ uri: normalizeWebImageUri(uri, Platform.OS === 'web') }}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                ...imageStyle,
              }}
              tintColor={tintColor}
              contentFit={contentFit}
              transition={200}
              // Persist to disk so cover images survive FlatList recycling and don't
              // re-hit the network (where an expired/rotated SAS URL could 403 → blank).
              cachePolicy="memory-disk"
              // Tie the cached image to its URL so recycled rows never show a stale
              // neighbour's image while the new one loads.
              recyclingKey={uri}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(false)}
            />
          )}
        </>
      )}
    </View>
  );
}
