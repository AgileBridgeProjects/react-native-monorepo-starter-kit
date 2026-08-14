/**
 * Copies text to the clipboard.
 * Falls back to a hidden textarea + `execCommand` for environments where the
 * Clipboard API is unavailable (e.g. non-HTTPS or older browsers).
 *
 * @returns `true` when the text was successfully copied, `false` otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Triggers a browser file download for the given URL (e.g. a SAS/object URL) via a
 * transient anchor element.
 *
 * @param url      - The URL to download from.
 * @param filename - The suggested file name for the download.
 */
export function downloadFromUrl(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Triggers a browser file download for the given Blob.
 *
 * @param blob     - The blob to download.
 * @param filename - The suggested file name for the download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadFromUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
