// Fallback for using MaterialIcons on Android and web.
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import MaterialIcons from '@react-native-vector-icons/material-icons/static';
import type { SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';
import { Platform } from 'react-native';
import { iconSize } from '@/constants/tokens';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type CommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Maps SF Symbol names to Material Icons (filled variants).
 */
const MAPPING: Record<string, MaterialIconName> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',
  'camera.fill': 'photo-camera',
  'trophy.fill': 'emoji-events',
  'star.fill': 'star',
  'lock.fill': 'lock',
  'book.fill': 'menu-book',
  laptopcomputer: 'laptop',
  // gamecontroller.fill is handled in COMMUNITY_MAPPING for shape-consistent active/inactive icons
  'chart.bar.fill': 'leaderboard',
  'paintbrush.fill': 'brush',
  iphone: 'phone-iphone',
  'building.2.fill': 'business',
  'pencil.and.ruler.fill': 'design-services',
  'bell.fill': 'notifications',
  'bell.slash': 'notifications-off',
  'flame.fill': 'local-fire-department',
  'crown.fill': 'military-tech',
  'arrow.clockwise': 'replay',
  'arrow.down.circle': 'downloading',
  'arrow.down.circle.fill': 'download-for-offline',
  'wifi.slash': 'wifi-off',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'person.fill': 'person',
  'seal.fill': 'verified',
  'doc.fill': 'description',
  'video.fill': 'videocam',
  'photo.fill': 'image',
  'arrow.down.doc.fill': 'picture-as-pdf',
  'checkmark.circle.fill': 'check-circle',
  circle: 'radio-button-unchecked',
  'xmark.circle.fill': 'cancel',
  'play.circle.fill': 'play-circle-filled',
  'clock.fill': 'access-time',
  'clock.arrow.circlepath': 'history',
  'folder.fill': 'folder',
  'square.grid.2x2.fill': 'grid-view',
  'square.grid.3x3.fill': 'apps',
  'questionmark.circle.fill': 'help',
  magnifyingglass: 'search',
  'play.fill': 'play-arrow',
  'questionmark.circle': 'help-outline',
  'gearshape.fill': 'settings',
  gearshape: 'settings',
  pencil: 'edit',
  xmark: 'close',
  checkmark: 'check',
  'arrow.left.arrow.right': 'swap-horiz',
  'rectangle.portrait.and.arrow.right': 'logout',
  'line.3.horizontal': 'menu',
  'exclamationmark.triangle': 'warning-amber',
  'gift.fill': 'card-giftcard',
  'calendar.badge.clock': 'event-repeat',
  calendar: 'calendar-today',
  'megaphone.fill': 'campaign',
  // Messages: system icons for auto-generated groups vs DM bubbles +
  // composer and its attachment sheet.
  'person.3.fill': 'groups',
  'bubble.left.fill': 'chat',
  paperclip: 'attach-file',
  'photo.on.rectangle': 'photo-library',
  'doc.text.fill': 'description',
  envelope: 'email',
  'bolt.fill': 'bolt',
  'moon.fill': 'dark-mode',
  'speaker.fill': 'volume-up',
  'speaker.wave.2.fill': 'volume-up',
  waveform: 'graphic-eq',
  photo: 'image',
  eye: 'visibility',
  'eye.slash': 'visibility-off',
  'phone.fill': 'phone',
  percent: 'percent',
  'livephoto.slash': 'motion-photos-off',
  'face.smiling': 'sentiment-satisfied',
  sparkles: 'auto-awesome',
  'chart.line.uptrend.xyaxis': 'trending-up',
  hourglass: 'hourglass-empty',
  'chart.line.downtrend.xyaxis': 'trending-down',
  'hand.thumbsdown': 'thumb-down',
  'checkmark.seal.fill': 'verified',
  'exclamationmark.triangle.fill': 'warning',
  plus: 'add',
  trash: 'delete',
  'info.circle': 'info',
  bold: 'format-bold',
  italic: 'format-italic',
  'list.bullet': 'format-list-bulleted',
  'list.number': 'format-list-numbered',
  'keyboard.chevron.compact.down': 'keyboard-hide',
  // Calendar: event location on the detail screen, and its optional venue link.
  'mappin.and.ellipse': 'location-on',
  link: 'link',
};

/**
 * Outline icon variants using MaterialCommunityIcons for consistent stroke weight.
 * Used for inactive tab bar icons.
 */
const COMMUNITY_MAPPING: Record<string, CommunityIconName> = {
  house: 'home-outline',
  book: 'book-outline',
  'gamecontroller.fill': 'gamepad-variant',
  gamecontroller: 'gamepad-variant-outline',
  'chart.bar': 'poll',
  trophy: 'trophy-outline',
  star: 'star-outline',
  person: 'account-outline',
  seal: 'check-decagram-outline' as CommunityIconName,
  // No stock "rainbow" glyph in either icon set installed — closest calm/sky
  // analogue available. Swap if a better match turns up.
  rainbow: 'weather-partly-cloudy' as CommunityIconName,
  'person.badge.clock': 'account-clock-outline' as CommunityIconName,
  'brain.head.profile': 'head-cog-outline' as CommunityIconName,
  // Check-in reason options — keys are real SF Symbol names
  // (verified against Apple's SF Symbols catalog) so icon-symbol.ios.tsx
  // renders them natively; this set has no volleyball or ice-cream glyph, so
  // those two substitute the closest available outline icon instead.
  'figure.volleyball': 'whistle-outline',
  'graduationcap.fill': 'school-outline',
  'person.2.fill': 'ice-cream',
  'hand.raised.fill': 'hand-heart-outline',
  'briefcase.fill': 'briefcase-outline',
  'doc.text.fill': 'clipboard-text-outline',
  // Check-in reminder preferences — no "sunrise" glyph in
  // this set, so Morning substitutes the closest available sunrise-adjacent
  // weather icon instead.
  'sunrise.fill': 'weather-sunset-up',
  'sun.max.fill': 'weather-sunny',
  // Preference checkbox — bold glyph so the checked state
  // reads clearly at the box's small 18px render size; the base MAPPING
  // 'check' glyph is too thin at that size.
  checkmark: 'check-bold',
  // Skill Library category emblems. Keys are real SF
  // Symbol names so icon-symbol.ios.tsx renders them natively; this set has no
  // target/bullseye glyph in the Material set, so Practice uses the community
  // bullseye-arrow instead.
  target: 'bullseye-arrow' as CommunityIconName,
  'moon.stars.fill': 'weather-night' as CommunityIconName,
  // Serve-your-answer commit ceremony — real SF Symbol name; the
  // Material community set carries a matching volleyball glyph.
  'volleyball.fill': 'volleyball' as CommunityIconName,
};

export type IconSymbolName = keyof typeof MAPPING | keyof typeof COMMUNITY_MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = iconSize.md,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // On Android, disable font padding to prevent vertical misalignment of icon glyphs.
  const androidFontFix = Platform.OS === 'android' ? { includeFontPadding: false } : {};

  // Check community icons first (outline variants)
  if (name in COMMUNITY_MAPPING) {
    return (
      <MaterialCommunityIcons
        color={color}
        size={size}
        name={COMMUNITY_MAPPING[name as keyof typeof COMMUNITY_MAPPING]}
        style={[androidFontFix, style]}
      />
    );
  }
  const materialName = MAPPING[name as keyof typeof MAPPING];
  if (!materialName) {
    if (__DEV__) {
    }
    return (
      <MaterialIcons
        color={color}
        size={size}
        name="help-outline"
        style={[androidFontFix, style]}
      />
    );
  }
  return (
    <MaterialIcons color={color} size={size} name={materialName} style={[androidFontFix, style]} />
  );
}
