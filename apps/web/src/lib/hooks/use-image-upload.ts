import { uiConfig } from '@lib/ui-config';
import { useCallback, useRef, useState } from 'react';
import { notify } from '@/components/ui';

interface UseImageUploadOptions {
  /** Async function that performs the actual upload and returns the resulting URL. */
  uploadFn: (file: File) => Promise<string>;
  /** Called with the uploaded URL on success. */
  onSuccess: (url: string) => void;
  /** Error message shown in the toast on failure. */
  errorMessage: string;
  /** Called when upload state changes (started/finished). */
  onUploadStateChange?: (isUploading: boolean) => void;
}

interface UseImageUploadReturn {
  isUploading: boolean;
  handleUpload: (file: File) => Promise<void>;
  /** Abort any in-flight upload (e.g. on unmount or drawer close). */
  abort: () => void;
}

/** @knipignore build-ahead: not yet consumed — wire up or remove. */
export function useImageUpload({
  uploadFn,
  onSuccess,
  errorMessage,
  onUploadStateChange,
}: UseImageUploadOptions): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsUploading(false);
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsUploading(true);
      onUploadStateChange?.(true);
      try {
        const url = await uploadFn(file);
        if (controller.signal.aborted) return;
        onSuccess(url);
      } catch {
        if (controller.signal.aborted) return;
        notify(errorMessage, 'error', uiConfig.toast.errorDurationMs);
      } finally {
        if (!controller.signal.aborted) {
          setIsUploading(false);
          onUploadStateChange?.(false);
        }
      }
    },
    [uploadFn, onSuccess, errorMessage, onUploadStateChange],
  );

  return { isUploading, handleUpload, abort };
}
