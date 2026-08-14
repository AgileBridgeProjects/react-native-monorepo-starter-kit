/**
 * Shared toast utility — single source of truth for all transient in-app notifications.
 *
 * Wraps `sonner-native` so that icon, duration, and visual config are centralised here.
 * Call sites import only `toast` — they never reference `sonner-native` directly.
 *
 * To change the look / feel / duration of any toast type, edit this file only.
 */
import { toast as sonnerToast } from 'sonner-native';

// ─── Config ───────────────────────────────────────────────────────────────────

/** How long each toast stays visible before auto-dismissing (ms). */
const DURATION_MS = 2000;

/** Stable slot ID — ensures a new toast replaces the current one instead of stacking. */
const TOAST_ID = 'app-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToastOptions {
  /** Stable ID. If a toast with this ID already exists it is updated in place. */
  id?: string | number;
  /** Called when the user taps anywhere on the toast. */
  onPress?: () => void;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Show a success toast (green).
 *
 * @param message - The text to display.
 * @param options - Optional {@link ToastOptions}.
 */
function success(message: string, options?: ToastOptions): string | number {
  return sonnerToast.success(message, { id: TOAST_ID, duration: DURATION_MS, ...options });
}

/**
 * Show an error toast (red).
 *
 * @param message - The text to display.
 * @param options - Optional {@link ToastOptions}.
 */
function error(message: string, options?: ToastOptions): string | number {
  return sonnerToast.error(message, { id: TOAST_ID, duration: DURATION_MS, ...options });
}

/**
 * Show a neutral info toast.
 *
 * @param message - The text to display.
 * @param options - Optional {@link ToastOptions}.
 */
function info(message: string, options?: ToastOptions): string | number {
  return sonnerToast.info(message, { id: TOAST_ID, duration: DURATION_MS, ...options });
}

export const toast = { success, error, info } as const;
