/**
 * On Expo web in local dev, image URLs can point at a different host alias than the
 * page currently loaded in the browser (for example `localhost` vs `192.168.x.x`).
 * Rewrite IP-hosted URLs to the active page hostname so image loading and canvas
 * sampling use the same reachable origin in both localhost and LAN-hosted sessions.
 */
export function normalizeWebImageUri(
  url: string | null | undefined,
  isWeb: boolean,
  currentHostname?: string,
): string | undefined {
  if (typeof url !== 'string') return undefined;
  if (!isWeb) return url;

  const hostname =
    currentHostname ??
    (typeof window !== 'undefined' && typeof window.location?.hostname === 'string'
      ? window.location.hostname
      : undefined);

  if (!hostname) return url;

  return url.replace(/\/\/[\d.]+:(\d+)/, `//${hostname}:$1`);
}
