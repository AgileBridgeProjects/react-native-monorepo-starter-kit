import { mmkvStorage } from '@lib/storage/mmkv-storage';
import { beforeEach, describe, expect, it } from 'vitest';

describe('mmkvStorage', () => {
  beforeEach(() => {
    // Clear any persisted state between tests
    mmkvStorage.removeItem('test-key');
    mmkvStorage.removeItem('another-key');
  });

  it('stores and retrieves a string value', () => {
    mmkvStorage.setItem('test-key', 'hello');
    expect(mmkvStorage.getItem('test-key')).toBe('hello');
  });

  it('returns null for a missing key', () => {
    expect(mmkvStorage.getItem('nonexistent')).toBeNull();
  });

  it('removes a value', () => {
    mmkvStorage.setItem('test-key', 'value');
    mmkvStorage.removeItem('test-key');
    expect(mmkvStorage.getItem('test-key')).toBeNull();
  });

  it('overwrites an existing value', () => {
    mmkvStorage.setItem('test-key', 'first');
    mmkvStorage.setItem('test-key', 'second');
    expect(mmkvStorage.getItem('test-key')).toBe('second');
  });

  it('handles JSON-serialized objects (Zustand persist pattern)', () => {
    const state = JSON.stringify({ colorScheme: 'dark', isOnboarded: true });
    mmkvStorage.setItem('app-store', state);
    const retrieved = mmkvStorage.getItem('app-store');
    expect(JSON.parse(retrieved as string)).toEqual({ colorScheme: 'dark', isOnboarded: true });
  });
});
