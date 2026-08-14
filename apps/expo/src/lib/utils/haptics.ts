import * as Haptics from 'expo-haptics';

// ─── Impact feedback ──────────────────────────────────────────────────────────

/** Light physical impact — drag start, minor tap confirmations */
export const hapticLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/** Medium physical impact — partial completion, item placed */
export const hapticMedium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

/** Heavy physical impact — strong confirmation */
export const hapticHeavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// ─── Selection feedback ───────────────────────────────────────────────────────

/** Selection tick — hovering over a drop zone, navigating picker items */
export const hapticSelection = () => Haptics.selectionAsync();

// ─── Notification feedback ────────────────────────────────────────────────────

/** Success notification — all answers correct, game complete */
export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

/** Warning notification — partial match, soft alert */
export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

/** Error notification — incorrect answer, destructive action */
export const hapticError = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
