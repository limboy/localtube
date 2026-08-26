import { appGet, appSet, appReplace, appStore } from "./store";
import { isAvatarUrl, migrateDataUrlAvatar, pruneAvatars } from "./avatars";
import type {
  SidebarChildEntry,
  SidebarData,
  SidebarItem,
  SourceKind,
  SourceMeta,
  StoredFolder,
  StoredSource,
} from "./types";

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


/**
 * Makes `sidebarOrder` agree with what actually exists. Nothing kept the two in
 * sync, so a source could end up listed but deleted (an invisible row) or saved
 * but unlisted (unreachable from the sidebar). Repairs both, plus folder
 * entries whose folder record is gone, whose children are promoted rather than
 * dropped.
 */
export function reconcileSidebarOrder(): boolean {
  const order = appGet<SidebarItem[]>("sidebarOrder");
  if (!Array.isArray(order)) return false;

  const exists: Record<SourceKind, Set<string>> = {
    playlist: new Set(read("playlist").map((source) => source.id)),
    channel: new Set(read("channel").map((source) => source.id)),
  };
  const folders = appGet<StoredFolder[]>("folders") ?? [];
  const folderIds = new Set(folders.map((folder) => folder.id));

  const placed = new Set<string>();
  const key = (entry: { type: string; id: string }) => `${entry.type}:${entry.id}`;

  const keepChild = (child: SidebarChildEntry) => {
    if (!exists[child.type]?.has(child.id) || placed.has(key(child))) return false;
    placed.add(key(child));
    return true;
  };

  const next: SidebarItem[] = [];
  const promoted: SidebarChildEntry[] = [];

  for (const entry of order) {
    if (entry.type === "folder") {
      const children = (entry.children ?? []).filter(keepChild);
      if (!folderIds.has(entry.id) || placed.has(key(entry))) {
        promoted.push(...children);
        continue;
      }
      placed.add(key(entry));
      next.push({ ...entry, children });
      continue;
    }
    if (keepChild(entry)) next.push(entry);
  }

  // New entries go above the folders, matching where adding a source puts it.
  const firstFolder = next.findIndex((entry) => entry.type === "folder");
  const appendTop = (entries: SidebarItem[]) => {
    if (entries.length === 0) return;
    if (firstFolder === -1) next.push(...entries);
    else next.splice(firstFolder, 0, ...entries);
  };

  const missing: SidebarItem[] = [...promoted];
  for (const kind of ["playlist", "channel"] as const) {
    for (const id of exists[kind]) {
      if (placed.has(`${kind}:${id}`)) continue;
      placed.add(`${kind}:${id}`);
      missing.push({ type: kind, id });
    }
  }
  appendTop(missing);

  for (const folder of folders) {
    if (placed.has(`folder:${folder.id}`)) continue;
    placed.add(`folder:${folder.id}`);
    next.push({ type: "folder", id: folder.id, children: [] });
  }

  if (JSON.stringify(next) === JSON.stringify(order)) return false;
  appSet("sidebarOrder", next);
  return true;
}
