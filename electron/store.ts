import Store from "electron-store";

export const appStore = new Store({ name: "app-data" });
export const descriptionStore = new Store({ name: "video-descriptions" });
export const playbackStore = new Store({ name: "playback" });
export const windowStore = new Store({ name: "window" });

// electron-store re-reads and re-parses the whole JSON file on every `get`, and
// rewrites all of it synchronously on every `set`. This process is the only
// writer, so a process-local cache keeps reads free and lets a write skip the
// read half of the round trip.
let appCache: Record<string, unknown> | null = null;

function loadApp(): Record<string, unknown> {
  if (!appCache) appCache = appStore.store as Record<string, unknown>;
  return appCache;
}

export function appGet<T>(key: string): T | undefined {
  return loadApp()[key] as T | undefined;
}

export function appSet(key: string, value: unknown) {
  const cache = loadApp();
  cache[key] = value;
  appStore.store = cache;
}

export function appReplace(next: Record<string, unknown>) {
  appCache = next;
  appStore.store = next;
}

// High-churn caches that used to share app-data.json with the library. A
// playback tick every 5 seconds rewrote megabytes of playlists and channels
// just to record one integer; each now owns a small file of its own.
const MOVED_KEYS: Array<[string, Store]> = [
  ["videoDescriptions", descriptionStore],
  ["playbackPositions", playbackStore],
  ["windowState", windowStore],
];

// Written by a sidebar implementation that no longer exists.
const DEAD_KEYS = ["playlistsWithDividers", "channelsWithDividers"];

export function migrateAppStore() {
  const data = { ...loadApp() };
  let changed = false;

  for (const [key, target] of MOVED_KEYS) {
    if (!(key in data)) continue;
    if (!target.has(key)) target.set(key, data[key]);
    delete data[key];
    changed = true;
  }

  for (const key of DEAD_KEYS) {
    if (!(key in data)) continue;
    delete data[key];
    changed = true;
  }

  if (changed) appReplace(data);
}
