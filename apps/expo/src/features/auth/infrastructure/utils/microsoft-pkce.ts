/**
 * Shared utilities for the Microsoft OAuth 2.0 PKCE web flow.
 *
 * The verifier and state are persisted in sessionStorage between the authorize
 * redirect and the /auth/microsoft callback. sessionStorage is the W3C-specified
 * storage mechanism for PKCE verifiers in SPAs (RFC 7636 / OAuth 2.0 for
 * Browser-Based Apps). It is scoped to the current tab and cleared when the tab
 * closes, which is preferable to localStorage for security-sensitive values.
 */

/** sessionStorage key for the PKCE code verifier. */
export const MS_PKCE_VERIFIER_KEY = 'ms_pkce_verifier';

/** sessionStorage key for the OAuth state parameter (CSRF protection). */
export const MS_PKCE_STATE_KEY = 'ms_pkce_state';

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a PKCE code verifier and its S256 challenge. */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64urlEncode(array.buffer);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64urlEncode(digest);
  return { codeVerifier, codeChallenge };
}

/** Generate a cryptographically random OAuth state value for CSRF protection. */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}
