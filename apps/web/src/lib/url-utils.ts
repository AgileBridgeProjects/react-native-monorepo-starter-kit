/**
 * Returns true when the URL can be rendered directly by the browser.
 *
 * After ABC-123, upload endpoints return stable blob-storage paths
 * (e.g. "question-images/abc.jpg") instead of SAS URLs. Those paths
 * are not browser-renderable and must not be passed to <img> / <Image>.
 */
export const isBrowserRenderableUrl = (url: string | null | undefined): url is string =>
  !!url &&
  (url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:'));
