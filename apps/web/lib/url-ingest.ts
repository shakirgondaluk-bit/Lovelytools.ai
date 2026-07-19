'use client';

// lovelytools.ai — URL ingest for the social-media tools.
//
// The user's browser fetches a DIRECT media URL and hands the engine a File,
// exactly as if it had been dropped. This is app-layer work, deliberately not an
// engine capability: engines never touch the network (engines-core invariant),
// and there is no server proxy — a fetch proxy would put user media on our
// servers, which is the one thing this platform exists to never do.
//
// The honest consequences, surfaced in the UI rather than papered over:
//   · Platform page URLs (YouTube, TikTok, Instagram, …) cannot work. Extracting
//     their streams needs server-side scraping that violates their terms and,
//     for DRM content, the law. We detect them and say so.
//   · The host must allow cross-origin reads (CORS). When it doesn't, we explain
//     the download-then-drop fallback, which is functionally identical.

export interface UrlIngestProgress {
  /** 0–100 when the server sent a Content-Length; null when it didn't. */
  pct: number | null;
  receivedBytes: number;
  totalBytes: number | null;
}

export type UrlIngestErrorKind =
  | 'invalid'
  | 'platform'
  | 'cors'
  | 'http'
  | 'not-media'
  | 'too-large'
  | 'cancelled';

export class UrlIngestError extends Error {
  constructor(
    public kind: UrlIngestErrorKind,
    /** Friendly and actionable — shown to the user verbatim. */
    message: string,
  ) {
    super(message);
    this.name = 'UrlIngestError';
  }
}

/**
 * Hosts whose video URLs are pages, not files — and whose terms prohibit
 * third-party downloading. Matching is by registrable-domain suffix.
 */
const PLATFORM_HOSTS: ReadonlyArray<[suffix: string, label: string]> = [
  ['youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
  ['tiktok.com', 'TikTok'],
  ['instagram.com', 'Instagram'],
  ['facebook.com', 'Facebook'],
  ['fb.watch', 'Facebook'],
  ['twitter.com', 'X (Twitter)'],
  ['x.com', 'X (Twitter)'],
  ['twitch.tv', 'Twitch'],
  ['vimeo.com', 'Vimeo'],
  ['dailymotion.com', 'Dailymotion'],
  ['snapchat.com', 'Snapchat'],
  ['reddit.com', 'Reddit'],
];

const platformLabel = (hostname: string): string | null => {
  const host = hostname.toLowerCase();
  for (const [suffix, label] of PLATFORM_HOSTS) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return label;
  }
  return null;
};

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

/**
 * Validates the pasted string before any network activity. Returns a normalized
 * URL or throws a UrlIngestError whose message explains what to do instead.
 */
export function validateMediaUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new UrlIngestError('invalid', 'Paste a video or audio URL to get started.');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new UrlIngestError('invalid', "That doesn't look like a URL. It should start with https://");
  }

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalHost(url.hostname))) {
    throw new UrlIngestError('invalid', 'Only https:// links work here — browsers block insecure media reads.');
  }

  const platform = platformLabel(url.hostname);
  if (platform) {
    throw new UrlIngestError(
      'platform',
      `${platform} links are pages, not media files, and ${platform}'s terms don't allow tools to rip streams from them — so this tool honestly can't. It works with direct links to media files (ending in .mp4, .webm, .mp3, …). If the video is your own, download it from ${platform}'s own export feature and drop the file here instead.`,
    );
  }

  return url;
}

/** Filename from the URL path, with a sensible fallback. */
const filenameFrom = (url: URL, contentType: string | null): string => {
  const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
  if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last;
  const ext = contentType?.startsWith('audio/')
    ? (contentType.slice(6).split(';')[0] ?? 'mp3').replace('mpeg', 'mp3')
    : 'mp4';
  return `${last || 'media'}.${ext}`;
};

const MEDIA_TYPE = /^(video|audio)\//;
/** Servers that can't be bothered with types — sniffed by extension instead. */
const GENERIC_TYPE = /^(application\/octet-stream|binary\/octet-stream)?$/;
const MEDIA_EXT = /\.(mp4|m4v|m4a|webm|mov|mkv|avi|mp3|wav|flac|aac|ogg|oga|opus|wma|3gp)$/i;

export interface FetchedMedia {
  file: File;
  contentType: string | null;
  fromBytes: number;
}

/**
 * Streams the media into memory with real byte progress, then wraps it in a
 * File for the engine layer. Aborting the signal aborts the network request.
 */
export async function fetchMediaUrl(
  url: URL,
  options: {
    maxBytes: number;
    signal: AbortSignal;
    onProgress: (p: UrlIngestProgress) => void;
  },
): Promise<FetchedMedia> {
  const { maxBytes, signal, onProgress } = options;

  let response: Response;
  try {
    response = await fetch(url.href, { signal, mode: 'cors', credentials: 'omit' });
  } catch (cause) {
    if (signal.aborted) throw new UrlIngestError('cancelled', 'Cancelled.');
    console.warn('[lovelytools] media fetch failed', cause);
    throw new UrlIngestError(
      'cors',
      "The server hosting that file doesn't let other sites read it (CORS), so your browser can't fetch it from here. Download the file yourself, then drop it into this page — the result is identical, and it still never touches our servers.",
    );
  }

  if (!response.ok) {
    throw new UrlIngestError(
      'http',
      response.status === 404
        ? "That URL returns 404 — the file isn't there. Check the link."
        : response.status === 403
          ? 'That server refuses the request (403). The file may need a login — download it yourself and drop it here.'
          : `That server answered ${response.status}. Check the link and try again.`,
    );
  }

  const contentType = response.headers.get('content-type');
  const looksLikeMedia =
    (contentType && MEDIA_TYPE.test(contentType)) ||
    ((contentType === null || GENERIC_TYPE.test(contentType)) && MEDIA_EXT.test(url.pathname));
  if (!looksLikeMedia) {
    throw new UrlIngestError(
      'not-media',
      contentType?.includes('text/html')
        ? "That link is a web page, not a media file. Right-click the video and copy its direct file address, or download it and drop the file here."
        : `That link serves "${contentType ?? 'unknown'}", not audio or video. This tool needs a direct link to a media file (.mp4, .webm, .mp3, …).`,
    );
  }

  const totalHeader = response.headers.get('content-length');
  const totalBytes = totalHeader ? Number(totalHeader) : null;
  if (totalBytes && totalBytes > maxBytes) {
    throw new UrlIngestError(
      'too-large',
      `That file is ${Math.round(totalBytes / 1_048_576)} MB — the limit is ${Math.round(maxBytes / 1_048_576)} MB. Pro raises it to 2 GB.`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new UrlIngestError('http', "That server sent no data. Check the link and try again.");

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read().catch(() => {
      if (signal.aborted) throw new UrlIngestError('cancelled', 'Cancelled.');
      throw new UrlIngestError('http', 'The connection dropped mid-download. Try again.');
    });
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      if (received > maxBytes) {
        reader.cancel().catch(() => undefined);
        throw new UrlIngestError(
          'too-large',
          `That download passed ${Math.round(maxBytes / 1_048_576)} MB — the free limit. Pro raises it to 2 GB.`,
        );
      }
      onProgress({
        pct: totalBytes ? Math.min(99, Math.round((received / totalBytes) * 100)) : null,
        receivedBytes: received,
        totalBytes,
      });
    }
  }

  if (received === 0) throw new UrlIngestError('http', 'That URL downloaded zero bytes. Check the link.');

  const name = filenameFrom(url, contentType);
  const file = new File(chunks as BlobPart[], name, {
    type: contentType && MEDIA_TYPE.test(contentType) ? contentType.split(';')[0] : '',
  });
  return { file, contentType, fromBytes: received };
}
