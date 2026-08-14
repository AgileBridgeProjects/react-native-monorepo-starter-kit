import { describe, expect, it } from 'vitest';

// Crash reporting is a no-op (Firebase Crashlytics removed). These tests pin that contract.

describe('noopReporter', () => {
  it('silently swallows recordError', async () => {
    const { noopReporter } = await import('@lib/crash-reporting/noop');
    expect(() => noopReporter.recordError(new Error('boom'))).not.toThrow();
  });

  it('silently swallows log', async () => {
    const { noopReporter } = await import('@lib/crash-reporting/noop');
    expect(() => noopReporter.log('nav: /home')).not.toThrow();
  });

  it('silently swallows setUserId', async () => {
    const { noopReporter } = await import('@lib/crash-reporting/noop');
    expect(() => noopReporter.setUserId('user-123')).not.toThrow();
    expect(() => noopReporter.setUserId(null)).not.toThrow();
  });

  it('silently swallows setAttribute', async () => {
    const { noopReporter } = await import('@lib/crash-reporting/noop');
    expect(() => noopReporter.setAttribute('feature', 'auth')).not.toThrow();
  });
});

describe('crashReporter singleton', () => {
  it('is the noop reporter (Firebase Crashlytics removed)', async () => {
    const { crashReporter } = await import('@lib/crash-reporting');
    const { noopReporter } = await import('@lib/crash-reporting/noop');
    expect(crashReporter).toBe(noopReporter);
  });
});
