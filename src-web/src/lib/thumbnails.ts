// YouTube hands back thumbnail URLs carrying a long signed query string. The
// canonical form is stable, always available, and about a third the length —
// which matters because these are persisted once per stored video.
// Kept in sync with normalizeThumbnail in electron/library.ts, which migrates
// URLs already on disk.
const YTIMG_URL = /^https?:\/\/i\d*\.ytimg\.com\/vi(?:_webp)?\/([\w-]+)\//;

export function normalizeThumbnail(url: string | undefined): string {
  if (!url) return "";
  const match = url.match(YTIMG_URL);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : url;
}
