import { crashReporter } from '@lib/crash-reporting';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthErrorEntry {
  /** ISO timestamp */
  ts: string;
  /** OAuth provider (google | microsoft | phone | email) */
  provider: string;
  /** Error code or class name */
  code: string;
  /** Human-readable message */
  message: string;
  /** Platform (ios | android | web) */
  platform: string;
  /** Optional extra context */
  meta?: Record<string, unknown>;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const MAX_ENTRIES = 100;
const STORAGE_KEY = 'starterkit_auth_errors';

// ─── In-memory buffer ────────────────────────────────────────────────────────

let buffer: AuthErrorEntry[] = [];
let hydrated = false;

function hydrateBuffer(): void {
  if (hydrated) return;
  hydrated = true;

  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) buffer = JSON.parse(raw) as AuthErrorEntry[];
    }
    // On native, expo-file-system is optional; degrade gracefully.
    // Errors are still captured in-memory for the current session.
  } catch {
    buffer = [];
  }
}

function persistBuffer(): void {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
    }
  } catch {
    // localStorage full or unavailable — silently degrade
  }
}

// ─── PII sanitisation ────────────────────────────────────────────────────────

/** Replace email addresses in a string with `[redacted]` before persistence. */
function redactPii(message: string): string {
  return message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[redacted]');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Log an auth-related error to the circular buffer.
 */
export function logAuthError(
  provider: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  hydrateBuffer();

  const rawMessage = error instanceof Error ? error.message : String(error);
  const entry: AuthErrorEntry = {
    ts: new Date().toISOString(),
    provider,
    code: extractCode(error),
    message: redactPii(rawMessage),
    platform: Platform.OS,
    meta,
  };

  buffer.push(entry);

  // Keep circular — drop oldest entries beyond the limit.
  if (buffer.length > MAX_ENTRIES) {
    buffer = buffer.slice(buffer.length - MAX_ENTRIES);
  }

  persistBuffer();

  crashReporter.recordError(error instanceof Error ? error : new Error(entry.message), {
    feature: 'auth',
    provider,
    code: entry.code,
  });

  // Also log to console in __DEV__ for immediate visibility.
  if (__DEV__) {
    // biome-ignore lint/suspicious/noConsole: intentional dev-only auth diagnostics
    console.warn('[AuthErrorLogger]', JSON.stringify(entry, null, 2));
  }
}

/**
 * Get all logged auth errors (newest last).
 */
export function getAuthErrors(): readonly AuthErrorEntry[] {
  hydrateBuffer();
  return buffer;
}

/**
 * Clear the auth error log.
 */
export function clearAuthErrors(): void {
  buffer = [];
  hydrated = true;
  persistBuffer();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCode(error: unknown): string {
  if (!error) return 'unknown';
  if (error instanceof Error) {
    // Firebase errors expose a `code` property
    if ('code' in error && typeof (error as { code: unknown }).code === 'string') {
      return (error as { code: string }).code;
    }
    return error.name;
  }
  return 'unknown';
}
