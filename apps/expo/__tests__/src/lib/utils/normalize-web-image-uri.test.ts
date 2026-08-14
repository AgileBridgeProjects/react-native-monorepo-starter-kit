import { normalizeWebImageUri } from '@lib/utils/normalize-web-image-uri';
import { describe, expect, it } from 'vitest';

describe('normalizeWebImageUri', () => {
  it('rewrites host-machine IP URLs to the active web hostname', () => {
    expect(
      normalizeWebImageUri(
        'http://192.168.1.12:10000/devstoreaccount1/card.png',
        true,
        'localhost',
      ),
    ).toBe('http://localhost:10000/devstoreaccount1/card.png');
  });

  it('preserves LAN-hosted web sessions by rewriting to the current LAN hostname', () => {
    expect(
      normalizeWebImageUri(
        'http://10.0.0.25:10000/devstoreaccount1/card.png',
        true,
        '192.168.1.50',
      ),
    ).toBe('http://192.168.1.50:10000/devstoreaccount1/card.png');
  });

  it('leaves URLs unchanged outside web', () => {
    expect(normalizeWebImageUri('http://192.168.1.12:10000/devstoreaccount1/card.png', false)).toBe(
      'http://192.168.1.12:10000/devstoreaccount1/card.png',
    );
  });

  it('leaves non-matching URLs unchanged on web', () => {
    expect(normalizeWebImageUri('https://cdn.example.com/card.png', true)).toBe(
      'https://cdn.example.com/card.png',
    );
  });

  it('leaves the URL unchanged when no current hostname is available', () => {
    expect(
      normalizeWebImageUri('http://192.168.1.12:10000/devstoreaccount1/card.png', true, ''),
    ).toBe('http://192.168.1.12:10000/devstoreaccount1/card.png');
  });
});
