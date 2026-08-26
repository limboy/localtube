import { descriptionStore, playbackStore } from "./store";
import type { PlaybackPosition } from "./types";

// Both caches grow once per video watched and were never pruned. They now live
// in their own files, so a cap keeps each one small enough that a write stays
// in the sub-millisecond range.
const DESCRIPTION_LIMIT = 500;
const POSITION_LIMIT = 500;
const POSITION_MAX_AGE = 90 * 24 * 60 * 60 * 1000;

interface DescriptionEntry {
  text: string;
  updatedAt: number;
}

let descriptions: Record<string, DescriptionEntry> | null = null;
let positions: Record<string, PlaybackPosition> | null = null;

function loadDescriptions(): Record<string, DescriptionEntry> {
  if (descriptions) return descriptions;

  const raw = (descriptionStore.get("videoDescriptions") as
    | Record<string, DescriptionEntry | string>
    | undefined) ?? {};

  descriptions = {};
  for (const [id, value] of Object.entries(raw)) {
    // Entries written before the cache was timestamped are bare strings. They
    // sort oldest so they are the first to be evicted.
    descriptions[id] = typeof value === "string" ? { text: value, updatedAt: 0 } : value;
  }
  return descriptions;
}

function evictOldest<T>(entries: Record<string, T>, limit: number, stamp: (value: T) => number) {
  const ids = Object.keys(entries);
  if (ids.length <= limit) return;
  ids
    .sort((a, b) => stamp(entries[a]) - stamp(entries[b]))
    .slice(0, ids.length - limit)
    .forEach((id) => delete entries[id]);
}

export function getDescription(videoId: string): string | null {
  return loadDescriptions()[videoId]?.text ?? null;
}

export function putDescription(videoId: string, text: string) {
  if (!text) return;
  const cache = loadDescriptions();
  cache[videoId] = { text, updatedAt: Date.now() };
  evictOldest(cache, DESCRIPTION_LIMIT, (entry) => entry.updatedAt);
  descriptionStore.set("videoDescriptions", cache);
}

function loadPositions(): Record<string, PlaybackPosition> {
  if (positions) return positions;
  positions = (playbackStore.get("playbackPositions") as Record<string, PlaybackPosition> | undefined) ?? {};

  const cutoff = Date.now() - POSITION_MAX_AGE;
  for (const [id, entry] of Object.entries(positions)) {
    if ((entry?.updatedAt ?? 0) < cutoff) delete positions[id];
  }
  return positions;
}

export function getPlaybackPosition(videoId: string): PlaybackPosition | null {
  return loadPositions()[videoId] ?? null;
}

export function putPlaybackPosition(videoId: string, position: number, duration: number) {
  if (duration <= 0) return;
  const cache = loadPositions();

  // Resuming only helps in the middle of a video; near either end, drop the
  // entry instead of keeping a row that would never be used.
  if (position < 5 || duration - position < 10) {
    if (cache[videoId]) {
      delete cache[videoId];
      playbackStore.set("playbackPositions", cache);
    }
    return;
  }

  cache[videoId] = { position, duration, updatedAt: Date.now() };
  evictOldest(cache, POSITION_LIMIT, (entry) => entry.updatedAt);
  playbackStore.set("playbackPositions", cache);
}

export function clearPlaybackPosition(videoId: string) {
  const cache = loadPositions();
  if (!cache[videoId]) return;
  delete cache[videoId];
  playbackStore.set("playbackPositions", cache);
}
