import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDevLanUrl } from '@/src/lib/dev-lan-host';

const { hostUriRef } = vi.hoisted(() => ({
  hostUriRef: { value: undefined as string | undefined },
}));

vi.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { hostUri: hostUriRef.value };
    },
  },
}));

/** `__DEV__` is injected by the RN bundler, not typed on globalThis — same cast test/setup.ts uses. */
const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };

const originalDev = devGlobal.__DEV__;

beforeEach(() => {
  devGlobal.__DEV__ = true;
  hostUriRef.value = '192.168.68.110:8081';
});

afterEach(() => {
  devGlobal.__DEV__ = originalDev;
});

describe('in a local dev bundle', () => {
  it('swaps a stale LAN IP for the host Metro was reached on', () => {
    expect(resolveDevLanUrl('http://192.168.68.102:5201')).toBe('http://192.168.68.110:5201');
  });

  it('keeps the configured port and path', () => {
    expect(resolveDevLanUrl('http://192.168.68.102:8000/auth/v1')).toBe(
      'http://192.168.68.110:8000/auth/v1',
    );
  });

  it('rewrites a localhost URL so a device can reach the dev machine', () => {
    expect(resolveDevLanUrl('http://localhost:5001')).toBe('http://192.168.68.110:5001');
  });

  it('leaves an already-correct URL untouched', () => {
    expect(resolveDevLanUrl('http://192.168.68.110:5201')).toBe('http://192.168.68.110:5201');
  });

  it('preserves https', () => {
    expect(resolveDevLanUrl('https://192.168.68.102:5201')).toBe('https://192.168.68.110:5201');
  });
});

describe('never touches a non-local host', () => {
  it.each([
    'https://yourapp.example.com',
    'https://yourapp.example.com/v1',
    'http://host.docker.internal:5001',
  ])('leaves %s alone even in a dev bundle', (url) => {
    // Pointing a dev build at a deployed API has to keep working.
    expect(resolveDevLanUrl(url)).toBe(url);
  });

  it.each([
    ['a public IPv4 literal', 'http://203.0.113.10:5001'],
    ['a CGNAT address', 'http://100.64.0.5:5001'],
    ['a public IP on the loopback-adjacent 126 block', 'http://126.0.0.1:5001'],
  ])('leaves %s alone — only loopback and RFC 1918 are ours to rewrite', (_label, url) => {
    // Any IPv4 literal used to qualify as "local", so deliberately targeting a remote box by
    // address was silently redirected to the local stack.
    expect(resolveDevLanUrl(url)).toBe(url);
  });

  it.each([
    ['10.0.0.0/8', 'http://10.1.2.3:5001'],
    ['172.16.0.0/12', 'http://172.20.0.4:5001'],
    ['127.0.0.0/8 loopback', 'http://127.0.0.1:5001'],
  ])('still rewrites %s, which is genuinely local', (_label, url) => {
    expect(resolveDevLanUrl(url)).toBe('http://192.168.68.110:5001');
  });

  it('leaves 172.32 alone — just outside the private range', () => {
    expect(resolveDevLanUrl('http://172.32.0.4:5001')).toBe('http://172.32.0.4:5001');
  });
});

describe('is inert outside a dev bundle', () => {
  beforeEach(() => {
    devGlobal.__DEV__ = false;
  });

  it.each([
    'http://192.168.68.102:5201',
    'http://localhost:5001',
    'https://yourapp.example.com',
  ])('returns %s unchanged in a release bundle', (url) => {
    expect(resolveDevLanUrl(url)).toBe(url);
  });
});

describe('when Metro’s host is unusable', () => {
  it.each([
    ['a tunnel hostname', 'abc123.exp.direct'],
    ['an empty hostUri', ''],
  ])('leaves the configured URL alone for %s', (_label, hostUri) => {
    hostUriRef.value = hostUri;

    expect(resolveDevLanUrl('http://192.168.68.102:5201')).toBe('http://192.168.68.102:5201');
  });

  it('leaves the configured URL alone when hostUri is absent', () => {
    hostUriRef.value = undefined;

    expect(resolveDevLanUrl('http://192.168.68.102:5201')).toBe('http://192.168.68.102:5201');
  });
});

describe('malformed input', () => {
  it.each(['', 'not-a-url', '192.168.68.102:5201'])('returns %s unchanged', (url) => {
    expect(resolveDevLanUrl(url)).toBe(url);
  });

  it('does not treat an over-range octet as an IP', () => {
    expect(resolveDevLanUrl('http://999.1.1.1:5201')).toBe('http://999.1.1.1:5201');
  });
});
