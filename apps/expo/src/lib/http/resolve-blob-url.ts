/**
 * Sanitises a backend-provided avatar URL for display.
 *
 * Returns null (→ Avatar falls back to localAvatarUri or initials) for:
 * - Raw blob paths with no http prefix — backend didn't resolve the SAS URL
 * - localhost / 127.0.0.1 — Azurite dev URLs unreachable from physical devices
 *
 * Production HTTPS Azure Storage URLs pass through unchanged.
 */
export function resolveBlobUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!url.startsWith('http')) return null;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return null;
  return url;
}
