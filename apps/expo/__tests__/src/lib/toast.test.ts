import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── sonner-native mock ─────────────────────────────────────────────────────
const mockSuccess = vi.fn((_msg: string, _opts?: unknown) => 'toast-success');
const mockError = vi.fn((_msg: string, _opts?: unknown) => 'toast-error');
const mockInfo = vi.fn((_msg: string, _opts?: unknown) => 'toast-info');

vi.mock('sonner-native', () => ({
  toast: {
    success: (msg: string, opts?: unknown) => mockSuccess(msg, opts),
    error: (msg: string, opts?: unknown) => mockError(msg, opts),
    info: (msg: string, opts?: unknown) => mockInfo(msg, opts),
  },
}));

import { toast } from '@lib/toast';

const TOAST_ID = 'app-toast';
const DURATION_MS = 2000;

describe('toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success', () => {
    it('calls sonner success with the stable id + duration defaults', () => {
      toast.success('Saved');
      expect(mockSuccess).toHaveBeenCalledWith('Saved', { id: TOAST_ID, duration: DURATION_MS });
    });

    it('returns the value sonner returns', () => {
      expect(toast.success('Saved')).toBe('toast-success');
    });

    it('merges caller options over the defaults (later spread wins for id)', () => {
      const onPress = vi.fn();
      toast.success('Saved', { id: 'custom', onPress });
      expect(mockSuccess).toHaveBeenCalledWith('Saved', {
        id: 'custom',
        duration: DURATION_MS,
        onPress,
      });
    });

    it('keeps the default duration when only onPress is supplied', () => {
      const onPress = vi.fn();
      toast.success('Saved', { onPress });
      expect(mockSuccess).toHaveBeenCalledWith('Saved', {
        id: TOAST_ID,
        duration: DURATION_MS,
        onPress,
      });
    });
  });

  describe('error', () => {
    it('calls sonner error with defaults', () => {
      toast.error('Boom');
      expect(mockError).toHaveBeenCalledWith('Boom', { id: TOAST_ID, duration: DURATION_MS });
    });

    it('returns the sonner value', () => {
      expect(toast.error('Boom')).toBe('toast-error');
    });

    it('honours overrides', () => {
      toast.error('Boom', { id: 7 });
      expect(mockError).toHaveBeenCalledWith('Boom', { id: 7, duration: DURATION_MS });
    });
  });

  describe('info', () => {
    it('calls sonner info with defaults', () => {
      toast.info('FYI');
      expect(mockInfo).toHaveBeenCalledWith('FYI', { id: TOAST_ID, duration: DURATION_MS });
    });

    it('returns the sonner value', () => {
      expect(toast.info('FYI')).toBe('toast-info');
    });
  });

  it('exposes exactly success, error and info', () => {
    expect(Object.keys(toast).sort()).toEqual(['error', 'info', 'success']);
  });
});
