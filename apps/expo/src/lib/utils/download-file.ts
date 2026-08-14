import * as LegacyFileSystem from 'expo-file-system/legacy';

interface DownloadFileOptions {
  onProgress?: (written: number, total: number) => void;
  signal?: AbortSignal;
}

export interface DownloadFileResult {
  localUri: string | null;
  cancelled: boolean;
}

/**
 * Downloads a remote URL to a local destination URI.
 * Supports progress callbacks and AbortSignal cancellation.
 * On cancellation, partially-downloaded files are cleaned up.
 */
export async function downloadFile(
  url: string,
  destUri: string,
  options?: DownloadFileOptions,
): Promise<DownloadFileResult> {
  const { onProgress, signal } = options ?? {};

  try {
    const resumable = LegacyFileSystem.createDownloadResumable(
      url,
      destUri,
      {},
      onProgress
        ? (data) => onProgress(data.totalBytesWritten, data.totalBytesExpectedToWrite)
        : undefined,
    );

    const onAbort = () => {
      void resumable.cancelAsync();
    };
    signal?.addEventListener('abort', onAbort);

    try {
      const result = await resumable.downloadAsync();
      signal?.removeEventListener('abort', onAbort);
      return { localUri: result?.uri ?? null, cancelled: false };
    } catch {
      signal?.removeEventListener('abort', onAbort);
      if (signal?.aborted) {
        try {
          await LegacyFileSystem.deleteAsync(destUri, { idempotent: true });
        } catch {
          // best effort
        }
        return { localUri: null, cancelled: true };
      }
      return { localUri: null, cancelled: false };
    }
  } catch {
    return { localUri: null, cancelled: false };
  }
}
