import { useCallback, useRef, useState } from 'react';

export interface UseDownloadStateResult {
  downloadingIds: Set<string>;
  /** Per-key download progress: 0–1 fraction, null = indeterminate. */
  downloadProgress: Map<string, number | null>;
  /** Returns true if a download for this key is currently active. */
  isActiveDownload: (key: string) => boolean;
  /**
   * Registers a new download for `key`, creates an AbortController, and sets
   * state to indeterminate progress. Returns the controller.
   */
  beginDownload: (key: string) => AbortController;
  /** Updates the fractional progress for an active download. */
  updateProgress: (key: string, value: number | null) => void;
  /**
   * Clears the in-progress state for `key`.
   * Pass the original controller to apply the identity guard — if the
   * controller has been replaced by a new download, the ref is left intact.
   */
  endDownload: (key: string, controller?: AbortController) => void;
  /** Returns the AbortController currently registered for `key`. */
  getController: (key: string) => AbortController | undefined;
}

/**
 * Shared state management for cancellable file downloads.
 * Tracks in-progress download IDs, per-key progress fractions, and abort
 * controllers. Designed to be composed into feature-specific download hooks.
 */
export function useDownloadState(): UseDownloadStateResult {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number | null>>(new Map());
  const downloadingRef = useRef(downloadingIds);
  downloadingRef.current = downloadingIds;
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const isActiveDownload = useCallback((key: string) => downloadingRef.current.has(key), []);

  const beginDownload = useCallback((key: string): AbortController => {
    const controller = new AbortController();
    controllersRef.current.set(key, controller);
    setDownloadingIds((prev) => new Set(prev).add(key));
    setDownloadProgress((prev) => new Map(prev).set(key, null));
    return controller;
  }, []);

  const updateProgress = useCallback((key: string, value: number | null) => {
    setDownloadProgress((prev) => new Map(prev).set(key, value));
  }, []);

  const endDownload = useCallback((key: string, controller?: AbortController) => {
    // Identity guard: only clear the controller ref if it hasn't been replaced
    // by a new download (prevents a race where a re-download starts before the
    // previous finally block runs).
    if (controller == null || controllersRef.current.get(key) === controller) {
      controllersRef.current.delete(key);
    }
    setDownloadingIds((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setDownloadProgress((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const getController = useCallback((key: string) => controllersRef.current.get(key), []);

  return {
    downloadingIds,
    downloadProgress,
    isActiveDownload,
    beginDownload,
    updateProgress,
    endDownload,
    getController,
  };
}
