import { getLocalDateString } from '@lib/utils/get-local-date-string';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getLocalDateString', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats the current local date as YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T08:30:00'));

    expect(getLocalDateString()).toBe('2026-01-05');
  });

  it('formats an explicit date argument as YYYY-MM-DD', () => {
    expect(getLocalDateString(new Date('2026-11-09T22:15:00'))).toBe('2026-11-09');
  });
});
