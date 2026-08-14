import Constants from 'expo-constants';

/**
 * Rewrites a configured localhost/LAN URL to the host the Metro bundler was actually reached on.
 *
 * Local dev config has to name the dev machine by IP so a phone on the LAN can reach it, and that
 * IP changes on every DHCP lease. When it does, `EXPO_PUBLIC_API_URL` and
 * `EXPO_PUBLIC_SUPABASE_URL` silently point at an address nobody owns and every request hangs with
 * no error — the app still loads, because Expo advertises its own detected IP for the bundle
 * rather than reading those vars. Metro therefore already knows the right host; this borrows it.
 *
 * DELIBERATELY INERT OUTSIDE LOCAL DEV. Both guards must pass:
 *
 *  1. `__DEV__` is true. Any release bundle (dev/uat/production EAS profile) returns the
 *     configured URL untouched, so deployed behaviour is unchanged.
 *  2. The configured host is a bare IPv4 literal or `localhost`. A real hostname
 *     (`https://yourapp.example.com`) is never rewritten even in a `__DEV__` bundle — pointing a
 *     dev build at a deployed API stays possible.
 *
 * Only the hostname is replaced; scheme, port and path are kept, so the ports the local stack
 * publishes still apply.
 */
export function resolveDevLanUrl(configuredUrl: string): string {
  if (!__DEV__) return configuredUrl;

  const configuredHost = hostnameOf(configuredUrl);
  if (configuredHost === null || !isLocalHostname(configuredHost)) return configuredUrl;

  const metroHost = metroHostname();
  // Only trust an IP from Metro. A tunnel (`--tunnel`) reports an `*.exp.direct` hostname, which
  // the LAN cannot resolve to the dev machine's API — leaving the configured value alone is the
  // safer failure there.
  if (metroHost === null || !isIpv4(metroHost) || metroHost === configuredHost)
    return configuredUrl;

  return configuredUrl.replace(configuredHost, metroHost);
}

/** The host Metro was reached on, e.g. `192.168.68.110` from a `192.168.68.110:8081` hostUri. */
function metroHostname(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri !== 'string' || hostUri.length === 0) return null;
  const host = hostUri.split('/')[0]?.split(':')[0];
  return host !== undefined && host.length > 0 ? host : null;
}

/**
 * Parsed with a regex rather than `new URL()`: this runs at module scope while the API client and
 * Supabase client are constructed, and on Hermes `URL` is only available once
 * `react-native-url-polyfill` has been imported — which is not guaranteed at that point.
 */
function hostnameOf(url: string): string | null {
  return /^[a-z][a-z0-9+.-]*:\/\/([^/:?#]+)/i.exec(url)?.[1] ?? null;
}

/**
 * Whether `host` names this machine or something on the same private network.
 *
 * Deliberately narrower than "any IPv4 literal", which is what this used to accept. That rewrote
 * the host for *any* address-form URL, so pointing a dev build at a remote or public IP on purpose
 * — a staging box, a colleague's tunnel — silently redirected it to the local stack, and the
 * symptom (requests answered by the wrong backend) looks nothing like the cause. Only loopback and
 * the RFC 1918 private ranges are ours to rewrite.
 */
function isLocalHostname(host: string): boolean {
  if (host === 'localhost') return true;
  if (!isIpv4(host)) return false;

  const [first, second] = host.split('.').map(Number);
  return (
    first === 127 || // loopback
    first === 10 || // 10.0.0.0/8
    (first === 192 && second === 168) || // 192.168.0.0/16
    (first === 172 && second >= 16 && second <= 31) // 172.16.0.0/12
  );
}

function isIpv4(host: string): boolean {
  const octets = host.split('.');
  return (
    octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}
