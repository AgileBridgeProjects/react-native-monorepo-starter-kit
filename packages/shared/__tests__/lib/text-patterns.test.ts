import { describe, expect, it } from 'vitest';
import { globalUrlPattern, isUrl, URL_PATTERN } from '../../src/lib/text-patterns';

describe('text-patterns', () => {
  describe('globalUrlPattern', () => {
    it('keeps the URLs as segments when splitting text', () => {
      // Regression guard: String.split only retains separators when the pattern has a
      // capture group. Without one, the URLs vanish from the split output entirely and
      // linkified message text silently loses them.
      const parts = 'Watch https://example.com/highlights now'.split(globalUrlPattern());

      expect(parts).toContain('https://example.com/highlights');
      expect(parts.filter((p) => p.length > 0)).toEqual([
        'Watch ',
        'https://example.com/highlights',
        ' now',
      ]);
    });

    it('finds every URL in the text, not just the first', () => {
      const parts = 'a https://one.test b http://two.test c'
        .split(globalUrlPattern())
        .filter((p) => isUrl(p));

      expect(parts).toEqual(['https://one.test', 'http://two.test']);
    });

    it('returns a new instance each call so lastIndex is never shared', () => {
      const first = globalUrlPattern();
      const second = globalUrlPattern();

      expect(first).not.toBe(second);
      expect(first.lastIndex).toBe(0);
      expect(second.lastIndex).toBe(0);
    });
  });

  describe('isUrl', () => {
    it('matches a bare URL and rejects text merely containing one', () => {
      expect(isUrl('https://example.com/a?b=c')).toBe(true);
      expect(isUrl('http://example.com')).toBe(true);
      expect(isUrl('see https://example.com')).toBe(false);
      expect(isUrl('example.com')).toBe(false);
      expect(isUrl('')).toBe(false);
    });

    it('gives the same answer on repeated calls', () => {
      // URL_PATTERN is intentionally non-global: a shared /g regex carries lastIndex
      // between .test() calls and would answer false on every other call.
      expect(URL_PATTERN.global).toBe(false);
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('https://example.com')).toBe(true);
    });
  });
});
