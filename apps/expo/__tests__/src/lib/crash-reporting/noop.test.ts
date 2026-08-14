import { noopReporter } from '@lib/crash-reporting/noop';
import { describe, expect, it } from 'vitest';

describe('noopReporter', () => {
  it('implements the full CrashReporter surface', () => {
    expect(Object.keys(noopReporter).sort()).toEqual([
      'log',
      'recordError',
      'setAttribute',
      'setUserId',
    ]);
  });

  it('recordError is a no-op returning undefined (with and without context)', () => {
    expect(noopReporter.recordError(new Error('x'))).toBeUndefined();
    expect(noopReporter.recordError(new Error('y'), { feature: 'auth' })).toBeUndefined();
  });

  it('log is a no-op returning undefined', () => {
    expect(noopReporter.log('nav: /home')).toBeUndefined();
  });

  it('setUserId is a no-op for id and null', () => {
    expect(noopReporter.setUserId('user-1')).toBeUndefined();
    expect(noopReporter.setUserId(null)).toBeUndefined();
  });

  it('setAttribute is a no-op returning undefined', () => {
    expect(noopReporter.setAttribute('env', 'prod')).toBeUndefined();
  });

  it('never throws across rapid repeated calls', () => {
    expect(() => {
      for (let i = 0; i < 50; i++) {
        noopReporter.log(`call-${i}`);
        noopReporter.recordError(new Error(String(i)));
      }
    }).not.toThrow();
  });
});
