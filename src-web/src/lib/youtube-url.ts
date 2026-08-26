// Paths under youtube.com that are pages rather than channels. Anything else
// with a single path segment is treated as a legacy vanity channel URL.
const RESERVED_PATHS = new Set([
  "watch", "playlist", "shorts", "live", "embed", "v", "results",
  "feed", "hashtag", "post", "source", "clip", "attribution_link", "oembed",
]);

// Video IDs appear as a path segment for every form except /watch?v=.
const ID_PATHS = new Set(["embed", "v"]);

// Shorts and live streams are deliberately out of scope. They are recognised
// only so the add dialog can say so, instead of rejecting them as malformed.
const UNSUPPORTED_PATHS = new Set(["shorts", "live"]);

export function isShortsOrLiveUrl(url: string): boolean {
  const u = parseYouTubeUrl(url);
  if (!u || !isYouTubeHost(u)) return false;
  const [first, id] = segments(u);
  return Boolean(id) && UNSUPPORTED_PATHS.has(first?.toLowerCase() ?? "");
}

export function parseYouTubeUrl(url: string): URL | null {
  try {
    const trimmed = url.trim();
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme);
  } catch {
    return null;
  }
}

export function isValidUrl(url: string): boolean {
  return parseYouTubeUrl(url) !== null;
}

function isYouTubeHost(u: URL) {
  return /(^|\.)youtube\.com$/.test(u.hostname) || /(^|\.)youtu\.be$/.test(u.hostname);
}

function segments(u: URL) {
  return u.pathname.split("/").filter(Boolean);
}

export function extractVideoId(url: string): string {
  const u = parseYouTubeUrl(url);
  if (!u || !isYouTubeHost(u)) throw new Error("Invalid YouTube video URL");

  if (/(^|\.)youtu\.be$/.test(u.hostname)) {
    const [id] = segments(u);
    if (id) return id;
  } else {
    const parts = segments(u);
    if (parts.length >= 2 && ID_PATHS.has(parts[0].toLowerCase())) return parts[1];
    const id = u.searchParams.get("v");
    if (id) return id;
  }

  throw new Error("Invalid YouTube video URL");
}

export function isVideoUrl(url: string): boolean {
  try {
    extractVideoId(url);
    return true;
  } catch {
    return false;
  }
}

export function extractPlaylistId(url: string): string {
  const id = parseYouTubeUrl(url)?.searchParams.get("list");
  if (!id) throw new Error("Invalid YouTube playlist URL");
  return id;
}

export function isPlaylistUrl(url: string): boolean {
  const u = parseYouTubeUrl(url);
  return Boolean(u && isYouTubeHost(u) && u.searchParams.get("list"));
}

export function isChannelUrl(url: string): boolean {
  const u = parseYouTubeUrl(url);
  if (!u || !isYouTubeHost(u)) return false;

  const parts = segments(u);
  const [first] = parts;
  if (!first) return false;
  if (first === "channel" || first === "c" || first === "user") return parts.length >= 2;
  if (first.startsWith("@")) return true;

  return parts.length === 1 && !RESERVED_PATHS.has(first.toLowerCase());
}
