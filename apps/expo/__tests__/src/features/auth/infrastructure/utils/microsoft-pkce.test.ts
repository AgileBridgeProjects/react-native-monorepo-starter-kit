import {
  generatePKCE,
  generateState,
  MS_PKCE_STATE_KEY,
  MS_PKCE_VERIFIER_KEY,
} from '@features/auth/infrastructure/utils/microsoft-pkce';
import { describe, expect, it } from 'vitest';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

async function sha256Base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const bytes = new Uint8Array(digest);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('microsoft-pkce — storage keys', () => {
  it('exposes the stable sessionStorage keys', () => {
    expect(MS_PKCE_VERIFIER_KEY).toBe('ms_pkce_verifier');
    expect(MS_PKCE_STATE_KEY).toBe('ms_pkce_state');
  });
});

describe('generatePKCE', () => {
  it('returns a verifier and challenge that are both base64url (no +, /, or = padding)', async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    expect(codeVerifier).toMatch(BASE64URL);
    expect(codeChallenge).toMatch(BASE64URL);
    expect(codeVerifier).not.toContain('=');
    expect(codeChallenge).not.toContain('=');
    expect(codeVerifier).not.toContain('+');
    expect(codeVerifier).not.toContain('/');
  });

  it('derives the challenge as the S256 (base64url SHA-256) of the verifier', async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    expect(codeChallenge).toBe(await sha256Base64url(codeVerifier));
  });

  it('produces a 32-byte verifier (43 base64url chars) and 32-byte SHA-256 challenge (43 chars)', async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    // 32 bytes → ceil(32 * 4 / 3) = 43 base64url chars once padding is stripped.
    expect(codeVerifier).toHaveLength(43);
    expect(codeChallenge).toHaveLength(43);
  });

  it('generates a cryptographically unique verifier on each call', async () => {
    const [a, b] = await Promise.all([generatePKCE(), generatePKCE()]);
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });
});

describe('generateState', () => {
  it('returns a base64url string with no padding', () => {
    const state = generateState();
    expect(state).toMatch(BASE64URL);
    expect(state).not.toContain('=');
  });

  it('produces a 16-byte state (22 base64url chars)', () => {
    // 16 bytes → ceil(16 * 4 / 3) = 22 base64url chars once padding is stripped.
    expect(generateState()).toHaveLength(22);
  });

  it('is unique across calls (CSRF protection)', () => {
    expect(generateState()).not.toBe(generateState());
  });
});
