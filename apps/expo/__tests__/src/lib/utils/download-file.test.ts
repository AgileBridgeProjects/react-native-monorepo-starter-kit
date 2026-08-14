import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Per-test-controllable mock of expo-file-system/legacy (overrides the global setup mock).
const downloadAsync = vi.fn();
const cancelAsync = vi.fn();
const deleteAsync = vi.fn();
let lastProgressCallback:
  | ((data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void)
  | undefined;

vi.mock('expo-file-system/legacy', () => ({
  createDownloadResumable: vi.fn(
    (
      _url: string,
      _fileUri: string,
      _opts?: unknown,
      callback?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
    ) => {
      lastProgressCallback = callback;
      return { downloadAsync, cancelAsync };
    },
  ),
  deleteAsync: (...args: unknown[]) => deleteAsync(...args),
}));

import { downloadFile } from '@lib/utils/download-file';

describe('downloadFile', () => {
  beforeEach(() => {
    downloadAsync.mockReset();
    cancelAsync.mockReset();
    deleteAsync.mockReset();
    deleteAsync.mockResolvedValue(undefined);
    lastProgressCallback = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves with the downloaded localUri on success', async () => {
    downloadAsync.mockResolvedValue({ uri: 'file:///dest.png' });
    const result = await downloadFile('https://example.com/a.png', 'file:///dest.png');
    expect(result).toEqual({ localUri: 'file:///dest.png', cancelled: false });
  });

  it('returns null localUri when the download result has no uri', async () => {
    downloadAsync.mockResolvedValue(undefined);
    const result = await downloadFile('https://example.com/a.png', 'file:///dest.png');
    expect(result).toEqual({ localUri: null, cancelled: false });
  });

  it('forwards progress (written, total) to the onProgress callback', async () => {
    downloadAsync.mockResolvedValue({ uri: 'file:///dest.png' });
    const onProgress = vi.fn();
    await downloadFile('https://example.com/a.png', 'file:///dest.png', { onProgress });
    // The wrapper translates the resumable callback into (written, total).
    lastProgressCallback?.({ totalBytesWritten: 40, totalBytesExpectedToWrite: 100 });
    expect(onProgress).toHaveBeenCalledWith(40, 100);
  });

  it('does not register a progress wrapper when no onProgress is supplied', async () => {
    downloadAsync.mockResolvedValue({ uri: 'file:///dest.png' });
    await downloadFile('https://example.com/a.png', 'file:///dest.png');
    expect(lastProgressCallback).toBeUndefined();
  });

  it('cancels the resumable when the signal aborts', async () => {
    const controller = new AbortController();
    downloadAsync.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error('aborted'));
    });
    const result = await downloadFile('https://example.com/a.png', 'file:///dest.png', {
      signal: controller.signal,
    });
    expect(cancelAsync).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ localUri: null, cancelled: true });
  });

  it('cleans up the partial file (idempotent delete) on cancellation', async () => {
    const controller = new AbortController();
    downloadAsync.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error('aborted'));
    });
    await downloadFile('https://example.com/a.png', 'file:///dest.png', {
      signal: controller.signal,
    });
    expect(deleteAsync).toHaveBeenCalledWith('file:///dest.png', { idempotent: true });
  });

  it('swallows cleanup failures during cancellation (best effort)', async () => {
    const controller = new AbortController();
    downloadAsync.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error('aborted'));
    });
    deleteAsync.mockRejectedValue(new Error('delete failed'));
    const result = await downloadFile('https://example.com/a.png', 'file:///dest.png', {
      signal: controller.signal,
    });
    expect(result).toEqual({ localUri: null, cancelled: true });
  });

  it('returns a non-cancelled failure when download errors without an abort', async () => {
    downloadAsync.mockRejectedValue(new Error('network'));
    const result = await downloadFile('https://example.com/a.png', 'file:///dest.png');
    expect(result).toEqual({ localUri: null, cancelled: false });
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  it('does not delete when the error is unrelated to the (non-aborted) signal', async () => {
    const controller = new AbortController();
    downloadAsync.mockRejectedValue(new Error('network'));
    const result = await downloadFile('https://example.com/a.png', 'file:///dest.png', {
      signal: controller.signal,
    });
    expect(result).toEqual({ localUri: null, cancelled: false });
    expect(deleteAsync).not.toHaveBeenCalled();
  });
});
