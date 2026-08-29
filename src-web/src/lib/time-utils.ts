const UNITS: Record<string, number> = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

export function parseRelativeTime(text: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return undefined;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms = UNITS[unit];
  if (!ms) return undefined;
  return Date.now() - amount * ms;
}

/**
 * Pulls the upload date out of a LockupView node's metadata rows.
 *
 * The date has no fixed position — row 0 is usually the channel name and row 1
 * holds "N views" plus the date — so every part is tried and the first one that
 * parses as a date wins. Reading a fixed index instead used to silently drop
 * the date for whole playlists.
 */
export function parseLockupPublishedAt(lockup: any): number | undefined {
  const rows = lockup?.metadata?.metadata?.metadata_rows ?? [];
  const unparsed: string[] = [];

  for (const row of rows) {
    for (const part of row.metadata_parts ?? []) {
      const text = part.text?.toString?.() ?? "";
      const ts = parseRelativeTime(text);
      if (ts) return ts;
      if (text) unparsed.push(text);
    }
  }

  // Dropping the date is invisible in the UI — the row just renders without
  // one — which is how a whole library of playlists lost its dates unnoticed.
  // Say so once per session, with the text that failed, so the next reshuffle
  // or locale change announces itself instead of quietly degrading.
  if (unparsed.length > 0) warnUnparsedDate(unparsed);

  return undefined;
}

let hasWarnedUnparsedDate = false;

function warnUnparsedDate(texts: string[]) {
  if (hasWarnedUnparsedDate) return;
  hasWarnedUnparsedDate = true;
  console.warn("No upload date could be parsed from video metadata:", texts);
}

export function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  if (diff < 1000) return "just now";

  if (diff >= UNITS.year) {
    const years = Math.floor(diff / UNITS.year);
    return `${years} year${years === 1 ? "" : "s"} ago`;
  }
  if (diff >= UNITS.month) {
    const months = Math.floor(diff / UNITS.month);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  if (diff >= UNITS.week) {
    const weeks = Math.floor(diff / UNITS.week);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diff >= UNITS.day) {
    const days = Math.floor(diff / UNITS.day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (diff >= UNITS.hour) {
    const hours = Math.floor(diff / UNITS.hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff >= UNITS.minute) {
    const minutes = Math.floor(diff / UNITS.minute);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const seconds = Math.floor(diff / UNITS.second);
  return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
}
