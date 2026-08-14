/**
 * @starterkit/icons — native implementation (iOS, Android)
 *
 * Uses @react-native-vector-icons (MaterialIcons) which renders via native font vectors.
 * Metro resolves this file automatically on iOS/Android instead of index.ts.
 *
 * Adding a new icon:
 *   1. Find the MaterialIcons name at https://icons.expo.fyi
 *   2. Add a wrapper component below matching the same export name as index.ts.
 */

import MaterialIcons from '@react-native-vector-icons/material-icons/static';
import { iconSize } from '@starterkit/shared';
import type { IconProps } from './types';

export type { IconProps } from './types';

// ─── Navigation ──────────────────────────────────────────────────────────────

export function AllInclusiveIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="all-inclusive" size={size} color={color} />;
}

export function MenuIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="menu" size={size} color={color} />;
}

// Web-only sidebar toggle (admin portal). Mapped to the nearest MaterialIcons
// glyphs so the export names stay platform-consistent; not used on mobile.
export function SidebarExpandIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="chevron-right" size={size} color={color} />;
}

export function SidebarCollapseIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="chevron-left" size={size} color={color} />;
}

export function CloseIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="close" size={size} color={color} />;
}

export function OpenInFullIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="open-in-full" size={size} color={color} />;
}

export function CloseFullscreenIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="close-fullscreen" size={size} color={color} />;
}

// ─── App tab bar ─────────────────────────────────────────────────────────────

export function HomeIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="home" size={size} color={color} />;
}

export function ChatIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="chat" size={size} color={color} />;
}

export function VolleyballIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="sports-volleyball" size={size} color={color} />;
}

export function AvatarIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="account-circle" size={size} color={color} />;
}

export function LearningIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="menu-book" size={size} color={color} />;
}

export function GamesIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="sports-esports" size={size} color={color} />;
}

export function LeaderboardIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="leaderboard" size={size} color={color} />;
}

export function TrophyIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="emoji-events" size={size} color={color} />;
}

export function StarIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="star" size={size} color={color} />;
}

export function BadgeIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="military-tech" size={size} color={color} />;
}

// ─── Sidebar nav ─────────────────────────────────────────────────────────────

export function DashboardIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="dashboard" size={size} color={color} />;
}

export function ClubsIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="business" size={size} color={color} />;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export function AddIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="add" size={size} color={color} />;
}

export function EditIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="edit" size={size} color={color} />;
}

export function DeleteIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="delete" size={size} color={color} />;
}

export function DragIndicatorIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="drag-indicator" size={size} color={color} />;
}

export function LogoutIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="logout" size={size} color={color} />;
}

export function SearchIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="search" size={size} color={color} />;
}

export function DocumentIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="description" size={size} color={color} />;
}

/** The Reflect surface's mark — journal entries, surveys and check-ins are written records.
 *  Matches the tab bar's SF `book.closed` / Material `book`. */
export function NotebookIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="book" size={size} color={color} />;
}

export function VideoIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="videocam" size={size} color={color} />;
}

export function ImageIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="image" size={size} color={color} />;
}

export function PdfIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="picture-as-pdf" size={size} color={color} />;
}

export function ShareWithTeamsIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="groups" size={size} color={color} />;
}

export function BullhornIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="campaign" size={size} color={color} />;
}

export function BucketIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="inventory-2" size={size} color={color} />;
}

// ─── Status ──────────────────────────────────────────────────────────────────

export function CheckmarkIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="check" size={size} color={color} />;
}

export function SuccessIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="check-circle" size={size} color={color} />;
}

export function WarningIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="warning" size={size} color={color} />;
}

export function ErrorIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="error" size={size} color={color} />;
}

export function InfoIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="info" size={size} color={color} />;
}

export function ViewIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="visibility" size={size} color={color} />;
}

export function HideIcon({ size = iconSize.md, color }: IconProps) {
  return <MaterialIcons name="visibility-off" size={size} color={color} />;
}

// ─── Brand / Social ───────────────────────────────────────────────────────────
// MaterialIcons does not include brand logos. These stubs exist so that any
// shared component that imports from @starterkit/icons compiles on native without
// needing a separate code-path. Expo auth screens use platform-specific hooks
// (expo-auth-session / signInWithPopup) — they do not render these icons directly.

import { StyleSheet, Text } from 'react-native';

export function GoogleIcon({ size = iconSize.md, color }: IconProps) {
  return <Text style={[styles.brandLabel, { fontSize: size, color }]}>G</Text>;
}

export function MicrosoftIcon({ size = iconSize.md, color }: IconProps) {
  return <Text style={[styles.brandLabel, { fontSize: size, color }]}>M</Text>;
}

const styles = StyleSheet.create({
  brandLabel: { fontWeight: 'bold' },
});
