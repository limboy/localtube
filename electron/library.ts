import { appGet, appSet, appReplace, appStore } from "./store";
import { isAvatarUrl, migrateDataUrlAvatar, pruneAvatars } from "./avatars";
import type { SidebarData, SourceKind, SourceMeta, StoredSource } from "./types";

const KEY_BY_KIND: Record<SourceKind, string> = {
  playlist: "playlists",
  channel: "channels",
};

function read(kind: SourceKind): StoredSource[] {
  const sources = appGet<StoredSource[]>(KEY_BY_KIND[kind]);
  return Array.isArray(sources) ? sources : [];
}

function toMeta(source: StoredSource): SourceMeta {
  return {
    id: source.id,
    title: source.title,
    thumbnail: source.thumbnail,
    unreadCount: source.unreadCount,
    lastUpdated: source.lastUpdated,
  };
}

export function getSource(kind: SourceKind, id: string): StoredSource | null {
  return read(kind).find((source) => source.id === id) ?? null;
}

/**
 * Everything the sidebar renders, without the video arrays. Reading the full
 * library here meant shipping megabytes over IPC on every store update, purely
 * to show a title and an unread badge.
 */
export function getSidebarData(): SidebarData {
  const playlists = read("playlist");
  const channels = read("channel");

  const seen = new Set<string>();
  let unseenCount = 0;
  for (const source of [...channels, ...playlists]) {
    for (const video of source.items ?? []) {
      if (seen.has(video.id)) continue;
      seen.add(video.id);
      if (video.unseen) unseenCount++;
    }
  }

  return {
    playlists: playlists.map(toMeta),
    channels: channels.map(toMeta),
    unseenCount,
  };
}

/**
 * Clears the unseen flag for one video across every source that contains it.
 * Runs in main so a click does not round-trip the whole library twice.
 */
export function markVideoSeen(videoId: string): boolean {
  let changed = false;

  for (const kind of ["playlist", "channel"] as const) {
    const sources = read(kind);
    let touched = false;

    for (const source of sources) {
      let hit = false;
      for (const video of source.items ?? []) {
        if (video.id === videoId && video.unseen) {
          video.unseen = false;
          hit = true;
        }
      }
      if (hit) {
        source.unreadCount = (source.items ?? []).filter((video) => video.unseen).length;
        touched = true;
      }
    }

    if (touched) {
      appSet(KEY_BY_KIND[kind], sources);
      changed = true;
    }
  }

  return changed;
}

// Thumbnail URLs come back from YouTube carrying a long signed query string.
// The canonical form is stable, always available, and about a third the length.
const YTIMG_URL = /^https?:\/\/i\d*\.ytimg\.com\/vi(?:_webp)?\/([\w-]+)\//;

export function normalizeThumbnail(url: string | undefined): string {
  if (!url) return "";
  const match = url.match(YTIMG_URL);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : url;
}

/**
 * One-time cleanup of the stored library: inline avatars move to disk and
 * thumbnail URLs shrink to their canonical form. Both rewrite the same two
 * arrays, so they share a single pass and a single write.
 */
export function migrateLibrary() {
  const data = { ...appStore.store } as Record<string, unknown>;
  let changed = false;

  for (const kind of ["playlist", "channel"] as const) {
    const key = KEY_BY_KIND[kind];
    const sources = data[key];
    if (!Array.isArray(sources)) continue;

    for (const source of sources as StoredSource[]) {
      if (kind === "channel" && source.thumbnail?.startsWith("data:")) {
        const moved = migrateDataUrlAvatar(source.id, source.thumbnail);
        if (moved) {
          source.thumbnail = moved;
          changed = true;
        }
      }

      if (!isAvatarUrl(source.thumbnail)) {
        const normalized = normalizeThumbnail(source.thumbnail);
        if (normalized && normalized !== source.thumbnail) {
          source.thumbnail = normalized;
          changed = true;
        }
      }

      for (const video of source.items ?? []) {
        const normalized = normalizeThumbnail(video.thumbnail);
        if (normalized !== video.thumbnail) {
          video.thumbnail = normalized;
          changed = true;
        }
      }
    }
  }

  if (changed) appReplace(data);

  pruneAvatars(read("channel").map((channel) => channel.thumbnail));
}
