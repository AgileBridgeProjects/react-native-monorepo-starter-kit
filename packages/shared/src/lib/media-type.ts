// ─── Media Type ───────────────────────────────────────────────────────────────

/** Sub-topic content types: the resource media types relevant to topics, plus 'Text'. */
export type MediaType = 'Video' | 'Image' | 'Text' | 'Pdf';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Whether the media type represents an uploadable file (Image, PDF, or Video). */
export function isFileBasedMedia(mediaType: MediaType): boolean {
  return mediaType === 'Image' || mediaType === 'Pdf' || mediaType === 'Video';
}

// ─── Inference ────────────────────────────────────────────────────────────────

/** Best-effort inference of the media type from a sub-topic's stored content string. */
export function inferMediaType(content: string | undefined | null): MediaType {
  if (!content) return 'Text';
  const lower = content.toLowerCase();
  if (lower.includes('youtube.com/') || lower.includes('youtu.be/')) return 'Video';
  if (/\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(content)) return 'Image';
  if (/\.pdf(\?|$)/i.test(content)) return 'Pdf';
  if (/\.mp4(\?|$)/i.test(content)) return 'Video';
  // If it looks like a URL but didn't match above, treat as Video (generic link)
  if (/^https?:\/\//i.test(content)) return 'Video';
  return 'Text';
}

/** Regex matching common raster image file extensions. */
export const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;

/**
 * Content types the API accepts for a media upload — mirrors backend
 * `MediaUploadOptions.AllowedContentTypes`.
 *
 * Lives here rather than in a feature folder because both apps validate against the same
 * server rule, and its sibling size limits already live here. Checking client-side turns a
 * post-upload 400 into an immediate message.
 *
 * NOTE: `image/heic` / `image/heif` are absent on purpose. iOS can display them but web and
 * the admin portal cannot, so an accepted HEIC would store bytes half the product can't
 * render. Clients are expected to request a transcoded representation instead.
 */
export const ACCEPTED_ATTACHMENT_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
] as const;

/** Case-insensitive membership test, matching the server's OrdinalIgnoreCase comparison. */
export function isAcceptedAttachmentContentType(contentType: string): boolean {
  return (ACCEPTED_ATTACHMENT_CONTENT_TYPES as readonly string[]).includes(
    contentType.toLowerCase(),
  );
}

/**
 * Maximum allowed media attachment size in bytes for images and PDFs.
 * Mirrors backend `MediaUploadOptions.MaxFileSizeBytes` (10 MiB).
 *
 * Was 10 MiB in the backend but declared 50 MiB here — a 5x overstatement under a comment
 * claiming the two matched. Nothing consumed it yet, so no upload was actually mis-accepted,
 * but any client-side pre-check would have waved through a 40 MiB file the API rejects.
 */
export const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum allowed media attachment size in megabytes — derived from MAX_MEDIA_SIZE_BYTES. */
export const MAX_MEDIA_SIZE_MB = MAX_MEDIA_SIZE_BYTES / (1024 * 1024);

/** Maximum allowed video upload size in bytes (matches backend MediaUploadOptions.MaxVideoFileSizeBytes: 500 MiB). */
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

/** Maximum allowed video upload size in megabytes — derived from MAX_VIDEO_SIZE_BYTES. */
export const MAX_VIDEO_SIZE_MB = MAX_VIDEO_SIZE_BYTES / (1024 * 1024);

/** Maximum allowed avatar image size in bytes (matches backend UsersController: 5 MiB). */
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum allowed onboarding photo (full-body/face) size in bytes (matches backend UsersController: 10 MiB). */
export const MAX_ONBOARDING_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

/** The same cap in MiB, for interpolation into upload hints and size errors. */
export const MAX_ONBOARDING_PHOTO_SIZE_MB = MAX_ONBOARDING_PHOTO_SIZE_BYTES / (1024 * 1024);

/** Returns true when a URL points to a raster image (ignores query strings). */
export function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url.split('?')[0]);
}

/**
 * A stored file name as a human should read it, or `undefined` when there is no name.
 *
 * File names arrive percent-encoded from the API because the stored name is derived from the
 * blob path — "Scanned%20Document.pdf" was rendered verbatim to a user before this existed.
 * Decoding an already-plain name (an optimistic local copy, say) is a no-op, so this is safe
 * to apply to either.
 *
 * DISPLAY ONLY. Never feed the result to a fetch or a route param: a blob SAS token's `+`,
 * `/` and `=` do not survive a decode, and the signature stops matching.
 */
export function displayFileName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  try {
    return decodeURIComponent(name);
  } catch {
    // A literal "%" that is not a valid escape sequence ("results 100%.pdf") makes
    // decodeURIComponent throw — show the raw name rather than nothing.
    return name;
  }
}

/**
 * Lower-cased extension of a file name or URI, ignoring any query string or fragment, or
 * `undefined` when there isn't a usable one.
 *
 * Shared rather than per-feature because both sides of an attachment need it and must agree:
 * the upload resolver picks the content type from it (`resolveAttachment`), and the chat
 * bubble shows it as the document's kind. Two private copies would be free to disagree about
 * what counts as an extension.
 *
 * The alphanumeric test rejects the trailing segment of something like `10.5.2` or a bare
 * dotfile, which would otherwise be read as a type.
 */
export function fileExtension(pathOrName: string): string | undefined {
  const path = pathOrName.split(/[?#]/)[0];
  const lastDot = path.lastIndexOf('.');
  if (lastDot < 0 || lastDot === path.length - 1) return undefined;
  const extension = path.slice(lastDot + 1).toLowerCase();
  return /^[a-z0-9]+$/.test(extension) ? extension : undefined;
}
