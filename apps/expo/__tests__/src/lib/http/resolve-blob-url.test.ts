import { resolveBlobUrl } from '@lib/http/resolve-blob-url';
import { describe, expect, it } from 'vitest';

describe('resolveBlobUrl', () => {
  describe('nullish / empty input passthrough', () => {
    it('returns null unchanged', () => {
      expect(resolveBlobUrl(null)).toBeNull();
    });

    it('returns undefined unchanged', () => {
      expect(resolveBlobUrl(undefined)).toBeUndefined();
    });

    it('returns the empty string unchanged (falsy short-circuit)', () => {
      expect(resolveBlobUrl('')).toBe('');
    });
  });

  describe('non-http (unresolved blob path) → null', () => {
    it('returns null for a raw relative blob path', () => {
      expect(resolveBlobUrl('container/avatars/abc.png')).toBeNull();
    });

    it('returns null for a leading-slash path', () => {
      expect(resolveBlobUrl('/avatars/abc.png')).toBeNull();
    });

    it('returns null for an ftp scheme (not http-prefixed)', () => {
      expect(resolveBlobUrl('ftp://example.com/file.png')).toBeNull();
    });
  });

  describe('localhost / loopback dev URLs → null', () => {
    it('returns null for a localhost URL', () => {
      expect(resolveBlobUrl('http://localhost:10000/devstoreaccount1/avatars/a.png')).toBeNull();
    });

    it('returns null for a 127.0.0.1 URL', () => {
      expect(resolveBlobUrl('http://127.0.0.1:10000/devstoreaccount1/avatars/a.png')).toBeNull();
    });

    it('returns null for an https localhost URL', () => {
      expect(resolveBlobUrl('https://localhost/avatars/a.png')).toBeNull();
    });
  });

  describe('production URLs pass through unchanged', () => {
    it('returns an https Azure Storage URL unchanged', () => {
      const url = 'https://acct.blob.core.windows.net/avatars/a.png';
      expect(resolveBlobUrl(url)).toBe(url);
    });

    it('preserves a SAS query string verbatim', () => {
      const url =
        'https://acct.blob.core.windows.net/avatars/a.png?sv=2021-08-06&sig=abc%2Bdef&se=2030-01-01';
      expect(resolveBlobUrl(url)).toBe(url);
    });

    it('returns a plain http (non-localhost) URL unchanged', () => {
      const url = 'http://cdn.example.com/avatars/a.png';
      expect(resolveBlobUrl(url)).toBe(url);
    });

    it('passes through a URL that merely contains "localhost" in a path segment? — substring match excludes it', () => {
      // The implementation uses a substring check, so any URL containing the
      // literal "localhost" anywhere is treated as a dev URL → null.
      expect(resolveBlobUrl('https://cdn.example.com/localhost-banner.png')).toBeNull();
    });
  });
});
