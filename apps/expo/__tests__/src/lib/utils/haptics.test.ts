import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Local complete expo-haptics mock: the global setup mock only stubs impactAsync +
// ImpactFeedbackStyle, but this util also routes selection + notification feedback.
const impactAsync = vi.fn();
const selectionAsync = vi.fn();
const notificationAsync = vi.fn();

vi.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => impactAsync(...args),
  selectionAsync: (...args: unknown[]) => selectionAsync(...args),
  notificationAsync: (...args: unknown[]) => notificationAsync(...args),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import {
  hapticError,
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '@lib/utils/haptics';

describe('haptics', () => {
  beforeEach(() => {
    impactAsync.mockReset();
    selectionAsync.mockReset();
    notificationAsync.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('impact feedback', () => {
    it('hapticLight fires a Light impact', () => {
      hapticLight();
      expect(impactAsync).toHaveBeenCalledTimes(1);
      expect(impactAsync).toHaveBeenCalledWith('light');
    });

    it('hapticMedium fires a Medium impact', () => {
      hapticMedium();
      expect(impactAsync).toHaveBeenCalledTimes(1);
      expect(impactAsync).toHaveBeenCalledWith('medium');
    });

    it('hapticHeavy fires a Heavy impact', () => {
      hapticHeavy();
      expect(impactAsync).toHaveBeenCalledTimes(1);
      expect(impactAsync).toHaveBeenCalledWith('heavy');
    });

    it('impact helpers do not trigger selection or notification feedback', () => {
      hapticLight();
      hapticMedium();
      hapticHeavy();
      expect(selectionAsync).not.toHaveBeenCalled();
      expect(notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('selection feedback', () => {
    it('hapticSelection fires a selection tick', () => {
      hapticSelection();
      expect(selectionAsync).toHaveBeenCalledTimes(1);
      expect(impactAsync).not.toHaveBeenCalled();
      expect(notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('notification feedback', () => {
    it('hapticSuccess fires a Success notification', () => {
      hapticSuccess();
      expect(notificationAsync).toHaveBeenCalledTimes(1);
      expect(notificationAsync).toHaveBeenCalledWith('success');
    });

    it('hapticWarning fires a Warning notification', () => {
      hapticWarning();
      expect(notificationAsync).toHaveBeenCalledTimes(1);
      expect(notificationAsync).toHaveBeenCalledWith('warning');
    });

    it('hapticError fires an Error notification', () => {
      hapticError();
      expect(notificationAsync).toHaveBeenCalledTimes(1);
      expect(notificationAsync).toHaveBeenCalledWith('error');
    });

    it('notification helpers do not trigger impact feedback', () => {
      hapticSuccess();
      hapticWarning();
      hapticError();
      expect(impactAsync).not.toHaveBeenCalled();
    });
  });
});
