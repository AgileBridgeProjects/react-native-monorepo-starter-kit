import { useDownloadState } from '@lib/hooks/use-download-state';
import { act } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { renderHook } from '@/test/utils/render-hook';

describe('useDownloadState', () => {
  describe('initial state', () => {
    it('starts with no downloads and no progress', () => {
      const { result } = renderHook(() => useDownloadState());
      expect(result.current.downloadingIds.size).toBe(0);
      expect(result.current.downloadProgress.size).toBe(0);
      expect(result.current.isActiveDownload('x')).toBeFalsy();
      expect(result.current.getController('x')).toBeUndefined();
    });
  });

  describe('beginDownload', () => {
    it('registers the key, returns an AbortController, and sets indeterminate progress', () => {
      const { result } = renderHook(() => useDownloadState());

      let controller: AbortController | undefined;
      act(() => {
        controller = result.current.beginDownload('a');
      });

      expect(controller).toBeInstanceOf(AbortController);
      expect(result.current.downloadingIds.has('a')).toBeTruthy();
      expect(result.current.isActiveDownload('a')).toBeTruthy();
      expect(result.current.downloadProgress.get('a')).toBeNull();
      expect(result.current.getController('a')).toBe(controller);
    });

    it('tracks multiple concurrent downloads independently', () => {
      const { result } = renderHook(() => useDownloadState());

      act(() => {
        result.current.beginDownload('a');
        result.current.beginDownload('b');
      });

      expect(result.current.downloadingIds.has('a')).toBeTruthy();
      expect(result.current.downloadingIds.has('b')).toBeTruthy();
      expect(result.current.downloadingIds.size).toBe(2);
    });
  });

  describe('updateProgress', () => {
    it('updates the fractional progress for an active download', () => {
      const { result } = renderHook(() => useDownloadState());

      act(() => {
        result.current.beginDownload('a');
      });
      act(() => {
        result.current.updateProgress('a', 0.5);
      });

      expect(result.current.downloadProgress.get('a')).toBe(0.5);
    });

    it('can reset progress back to indeterminate (null)', () => {
      const { result } = renderHook(() => useDownloadState());

      act(() => {
        result.current.beginDownload('a');
        result.current.updateProgress('a', 0.7);
      });
      act(() => {
        result.current.updateProgress('a', null);
      });

      expect(result.current.downloadProgress.get('a')).toBeNull();
    });
  });

  describe('endDownload', () => {
    it('clears downloading id, progress, and controller for the key', () => {
      const { result } = renderHook(() => useDownloadState());

      let controller: AbortController | undefined;
      act(() => {
        controller = result.current.beginDownload('a');
        result.current.updateProgress('a', 0.3);
      });
      act(() => {
        result.current.endDownload('a', controller);
      });

      expect(result.current.downloadingIds.has('a')).toBeFalsy();
      expect(result.current.downloadProgress.has('a')).toBeFalsy();
      expect(result.current.getController('a')).toBeUndefined();
    });

    it('clears unconditionally when no controller is passed', () => {
      const { result } = renderHook(() => useDownloadState());

      act(() => {
        result.current.beginDownload('a');
      });
      act(() => {
        result.current.endDownload('a');
      });

      expect(result.current.isActiveDownload('a')).toBeFalsy();
      expect(result.current.getController('a')).toBeUndefined();
    });

    it('does not affect other concurrent downloads', () => {
      const { result } = renderHook(() => useDownloadState());

      act(() => {
        result.current.beginDownload('a');
        result.current.beginDownload('b');
      });
      act(() => {
        result.current.endDownload('a');
      });

      expect(result.current.isActiveDownload('a')).toBeFalsy();
      expect(result.current.isActiveDownload('b')).toBeTruthy();
    });

    describe('identity guard', () => {
      it('does NOT clear the controller ref when it has been replaced by a newer download', () => {
        const { result } = renderHook(() => useDownloadState());

        let first: AbortController | undefined;
        let second: AbortController | undefined;
        act(() => {
          first = result.current.beginDownload('a');
        });
        act(() => {
          // a re-download starts before the previous finally block runs
          second = result.current.beginDownload('a');
        });

        // stale finally fires with the *old* controller — must be ignored
        act(() => {
          result.current.endDownload('a', first);
        });

        // controller ref still points at the newer download
        expect(result.current.getController('a')).toBe(second);
        expect(first).not.toBe(second);
      });

      it('clears the controller ref when the matching controller is passed', () => {
        const { result } = renderHook(() => useDownloadState());

        let controller: AbortController | undefined;
        act(() => {
          controller = result.current.beginDownload('a');
        });
        act(() => {
          result.current.endDownload('a', controller);
        });

        expect(result.current.getController('a')).toBeUndefined();
      });
    });
  });

  describe('callback identity', () => {
    it('keeps callbacks stable across rerenders (memoised)', () => {
      const { result, rerender } = renderHook(() => useDownloadState());

      const before = {
        begin: result.current.beginDownload,
        end: result.current.endDownload,
        update: result.current.updateProgress,
        isActive: result.current.isActiveDownload,
        getController: result.current.getController,
      };

      rerender();

      expect(result.current.beginDownload).toBe(before.begin);
      expect(result.current.endDownload).toBe(before.end);
      expect(result.current.updateProgress).toBe(before.update);
      expect(result.current.isActiveDownload).toBe(before.isActive);
      expect(result.current.getController).toBe(before.getController);
    });
  });
});
