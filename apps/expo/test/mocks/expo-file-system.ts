/** Minimal expo-file-system mock for Vitest — avoids TypeScript source in node_modules. */

export const documentDirectory = '/mock-documents/';
export const cacheDirectory = '/mock-cache/';

export const getInfoAsync = async () => ({ exists: false, isDirectory: false, uri: '' });
export const downloadAsync = async (_: string, to: string) => ({ uri: to, status: 200 });
export const deleteAsync = async () => undefined;
export const makeDirectoryAsync = async () => undefined;
export const readDirectoryAsync = async () => [];
export const copyAsync = async () => undefined;
export const moveAsync = async () => undefined;

export function createDownloadResumable(
  _uri: string,
  _fileUri: string,
  _opts?: unknown,
  callback?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
) {
  return {
    downloadAsync: async () => {
      callback?.({ totalBytesWritten: 100, totalBytesExpectedToWrite: 100 });
      return { uri: _fileUri, status: 200 };
    },
    pauseAsync: async () => undefined,
    resumeAsync: async () => undefined,
    cancelAsync: async () => undefined,
    savable: () => ({ url: _uri, fileUri: _fileUri }),
  };
}
