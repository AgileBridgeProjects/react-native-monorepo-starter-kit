import { describe, expect, it } from 'vitest';

import { displayFileName, fileExtension, isImageUrl } from '../../src/lib/media-type';

describe('displayFileName', () => {
  it('decodes a percent-encoded name from the API', () => {
    // The stored name comes off the blob path, so it arrives encoded. This was rendered
    // verbatim to users ("Scanned%20Document.pdf") before the helper existed.
    expect(displayFileName('Scanned%20Document.pdf')).toBe('Scanned Document.pdf');
  });

  it('leaves an already-plain name alone', () => {
    // The optimistic local copy of a send is already plain — decoding it must be a no-op,
    // so the same helper is safe on both the local and the server-returned name.
    expect(displayFileName('schedule.pdf')).toBe('schedule.pdf');
  });

  it('falls back to the raw name when a literal % is not an escape sequence', () => {
    // decodeURIComponent throws on this; showing the raw name beats showing nothing.
    expect(displayFileName('results 100%.pdf')).toBe('results 100%.pdf');
  });

  it('returns undefined for a missing name', () => {
    expect(displayFileName(null)).toBeUndefined();
    expect(displayFileName(undefined)).toBeUndefined();
    expect(displayFileName('')).toBeUndefined();
  });
});

describe('fileExtension', () => {
  it('reads the extension from a plain file name', () => {
    expect(fileExtension('schedule.pdf')).toBe('pdf');
  });

  it('lower-cases the extension so callers can key off it', () => {
    // Both consumers look the value up in a map (content type / display kind), so casing
    // has to be normalised here rather than at each call site.
    expect(fileExtension('IMG_8687.JPG')).toBe('jpg');
  });

  it('ignores a query string — blob URLs carry a SAS token', () => {
    expect(fileExtension('https://blob.example/a/b/report.pdf?sv=2026-02-06&sig=abc')).toBe('pdf');
  });

  it('ignores a fragment', () => {
    expect(fileExtension('file:///tmp/clip.mp4#t=10')).toBe('mp4');
  });

  it('returns undefined when there is no extension', () => {
    // Android content:// picks have no extension at all — the caller falls back to the
    // picker's reported mimeType instead of guessing.
    expect(fileExtension('content://media/external/file/1234')).toBeUndefined();
  });

  it('returns undefined for a trailing dot', () => {
    expect(fileExtension('weird.')).toBeUndefined();
  });

  it('rejects a non-alphanumeric trailing segment rather than reading it as a type', () => {
    expect(fileExtension('archive.tar.gz-')).toBeUndefined();
  });

  it('takes only the last extension of a double-barrelled name', () => {
    expect(fileExtension('backup.tar.gz')).toBe('gz');
  });
});

describe('isImageUrl', () => {
  it('matches a raster image through its SAS query', () => {
    expect(isImageUrl('https://blob.example/x/IMG_1.jpg?sv=2026-02-06&sig=abc')).toBeTruthy();
  });

  it('does not match a PDF', () => {
    expect(isImageUrl('https://blob.example/x/report.pdf?sv=2026-02-06')).toBeFalsy();
  });
});
