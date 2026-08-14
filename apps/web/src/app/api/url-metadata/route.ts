import { NextResponse } from 'next/server';

// ─── SSRF guard: block private/loopback address space ────────────────────────
const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|0\.0\.0\.0)/i;

const MAX_BODY_BYTES = 50_000;
const FETCH_TIMEOUT_MS = 5_000;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('url');

  if (!raw) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate structure
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only https URLs are permitted' }, { status: 400 });
  }

  // SSRF guard
  if (PRIVATE_HOST.test(parsed.hostname)) {
    return NextResponse.json({ error: 'Private URLs are not permitted' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(parsed.href, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StarterKit-Preview/1.0)',
          Accept: 'text/html',
        },
        redirect: 'follow',
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return NextResponse.json({ reachable: false, title: null, description: null });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ reachable: false, title: null, description: null });
    }

    // Stream only the first MAX_BODY_BYTES to avoid large-page memory spikes
    const reader = response.body?.getReader();
    if (!reader) return NextResponse.json({ reachable: false, title: null, description: null });

    let html = '';
    let bytesRead = 0;
    const decoder = new TextDecoder();

    try {
      while (bytesRead < MAX_BODY_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.byteLength;
      }
    } finally {
      reader.cancel();
    }

    const title =
      extractMetaProperty(html, 'og:title') ??
      extractMetaProperty(html, 'twitter:title') ??
      extractTitle(html);

    const description =
      extractMetaProperty(html, 'og:description') ??
      extractMetaProperty(html, 'twitter:description') ??
      extractMetaName(html, 'description');

    return NextResponse.json({
      reachable: true,
      title: title ? sanitise(title) : null,
      description: description ? sanitise(description) : null,
    });
  } catch {
    return NextResponse.json({ reachable: false, title: null, description: null });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches <meta property="og:title" content="…"> in any attribute order */
function extractMetaProperty(html: string, property: string): string | null {
  const escaped = escapeRegExp(property);
  return (
    html.match(
      new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"'<>]+)["']`, 'i'),
    )?.[1] ??
    html.match(
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']${escaped}["']`, 'i'),
    )?.[1] ??
    null
  );
}

/** Matches <meta name="description" content="…"> in any attribute order */
function extractMetaName(html: string, name: string): string | null {
  const escaped = escapeRegExp(name);
  return (
    html.match(
      new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"'<>]+)["']`, 'i'),
    )?.[1] ??
    html.match(
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+name=["']${escaped}["']`, 'i'),
    )?.[1] ??
    null
  );
}

/** Matches <title>…</title> */
function extractTitle(html: string): string | null {
  return html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1] ?? null;
}

/** Strip control chars and cap length */
function sanitise(text: string): string {
  return text
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}
