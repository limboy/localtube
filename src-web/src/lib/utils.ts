import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChannelInfo, PlaylistInfo, BookmarkData, EnrichedBookmark, VideoItem } from "@/types";
import { setupKonamiCode } from "./konami";
import { getInnertube } from "./innertube";

const store = {
  get<T>(key: string) {
    return window.electron.store.get<T>(key);
  },
  async set(key: string, value: unknown) {
    await window.electron.store.set(key, value);
  },
  async save() {
    await window.electron.store.save();
  },
};
async function getStore() {
  return store;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function loadChannels() {
  const store = await getStore();
  return (await store.get<ChannelInfo[]>("channels")) || [];
}

export async function loadChannel(channelId: string) {
  const data = await loadChannels();
  return data.find((p) => p.id === channelId);
}

export async function markChannelAsRead(channelId: string) {
  const data = await loadChannels();
  const index = data.findIndex((p) => p.id === channelId);
  if (index !== -1) {
    data[index].unreadCount = 0;
  }

  const store = await getStore();
  await store.set("channels", data);
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function addOrUpdateChannel(channel: ChannelInfo) {
  const data = await loadChannels();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === channel.id);
  if (index !== -1) {
    data[index] = channel;
  } else {
    data.push(channel);
  }
  await store.set("channels", data);
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function removeChannel(channelId: string) {
  const data = await loadChannels();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === channelId);
  if (index !== -1) {
    data.splice(index, 1);
    await store.set("channels", data);
    await store.save();
    window.dispatchEvent(new CustomEvent('store-updated'));
  }
}

export async function reorderChannels(channelIds: string[]) {
  const data = await loadChannels();
  const store = await getStore();

  const reorderedData = channelIds.map(id => data.find(c => c.id === id)).filter(Boolean) as ChannelInfo[];

  await store.set("channels", reorderedData);
  await store.save();
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function loadPlaylist(playlistId: string) {
  const data = await loadPlaylists();
  return data.find((p) => p.id === playlistId);
}

export async function loadPlaylists() {
  const store = await getStore();
  return (await store.get<PlaylistInfo[]>("playlists")) || [];
}

export async function markPlaylistAsRead(playlistId: string) {
  const data = await loadPlaylists();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === playlistId);
  if (index !== -1) {
    data[index].unreadCount = 0;
  }
  await store.set("playlists", data);
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function addOrUpdatePlaylist(playlist: PlaylistInfo) {
  const data = await loadPlaylists();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === playlist.id);
  if (index !== -1) {
    data[index] = playlist;
  } else {
    data.push(playlist);
  }
  await store.set("playlists", data);
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function removePlaylist(playlistId: string) {
  const data = await loadPlaylists();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === playlistId);
  if (index !== -1) {
    data.splice(index, 1);
    await store.set("playlists", data);
    await store.save();
    window.dispatchEvent(new CustomEvent('store-updated'));
  }
}

export async function reorderPlaylists(playlistIds: string[]) {
  const data = await loadPlaylists();
  const store = await getStore();

  const reorderedData = playlistIds.map(id => data.find(p => p.id === id)).filter(Boolean) as PlaylistInfo[];

  await store.set("playlists", reorderedData);
  await store.save();
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function loadBookmarks(): Promise<Map<string, BookmarkData>> {
  const store = await getStore();
  const bookmarks = await store.get<Array<[string, BookmarkData]>>("bookmarks") || [];
  return new Map(bookmarks);
}

export async function saveBookmarks(bookmarks: Map<string, BookmarkData>) {
  const store = await getStore();
  await store.set("bookmarks", Array.from(bookmarks.entries()));
  await store.save();
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function removeBookmark(videoId: string) {
  const bookmarks = await loadBookmarks();
  if (bookmarks.has(videoId)) {
    bookmarks.delete(videoId);
    await saveBookmarks(bookmarks);
  }
}

export async function loadSkippedVideos(): Promise<Set<string>> {
  const store = await getStore();
  const skipped = await store.get<string[]>("skippedVideos") || [];
  return new Set(skipped);
}

export async function saveSkippedVideos(skippedVideos: Set<string>) {
  const store = await getStore();
  await store.set("skippedVideos", Array.from(skippedVideos));
  await store.save();
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export function disableInspectShortcut() {
  document.addEventListener(
    "keydown",
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === "KeyI") {
        if (!shortcutEnabled) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      }
    },
    true
  );

  // Setup Konami code to enable Cmd+Shift+I
  let shortcutEnabled = false;
  setupKonamiCode(() => {
    shortcutEnabled = true;
    console.log("Developer tools shortcut enabled!");
  });
}


/**
 * Checks if a URL is a valid YouTube playlist URL
 */
export function isPlaylistUrl(url: string): boolean {
  return url.includes("list=") && url.includes("youtube.com");
}

/**
 * Checks if a URL is a valid YouTube channel URL
 */
export function isChannelUrl(url: string): boolean {
  return (
    url.includes("/channel/") ||
    url.includes("/c/") ||
    url.includes("/user/") ||
    url.includes("/@") ||
    url.includes("youtube.com")
  );
}

export async function enrichBookmarks(
  providedPlaylists?: PlaylistInfo[],
  providedChannels?: ChannelInfo[]
): Promise<EnrichedBookmark[]> {
  const bookmarks = await loadBookmarks();
  if (bookmarks.size === 0) return [];

  const playlists = providedPlaylists || await loadPlaylists();
  const channels = providedChannels || await loadChannels();

  const videoLookup = new Map<string, {
    video: VideoItem,
    owner: PlaylistInfo | ChannelInfo,
    type: 'playlist' | 'channel'
  }>();

  for (const playlist of playlists) {
    for (const item of playlist.items) {
      if (!videoLookup.has(item.id)) {
        videoLookup.set(item.id, { video: item, owner: playlist, type: 'playlist' });
      }
    }
  }

  for (const channel of channels) {
    for (const item of channel.items) {
      if (!videoLookup.has(item.id)) {
        videoLookup.set(item.id, { video: item, owner: channel, type: 'channel' });
      }
    }
  }

  const enriched: EnrichedBookmark[] = [];

  for (const [id, bookmark] of bookmarks) {
    const info = videoLookup.get(id);
    if (info) {
      enriched.push({
        id,
        title: info.video.title,
        thumbnail: info.video.thumbnail,
        duration: info.video.duration,
        type: info.type,
        bookmarkedAt: bookmark.createdAt,
        data: info.owner
      });
    } else if (bookmark.videoDetails) {
      enriched.push({
        id,
        title: bookmark.videoDetails.title,
        thumbnail: bookmark.videoDetails.thumbnail,
        duration: bookmark.videoDetails.duration,
        type: 'video',
        bookmarkedAt: bookmark.createdAt,
      });
    }
  }

  // Sort by bookmark date, newest first
  return enriched.sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
}


export async function getVideoDescription(videoId: string): Promise<string> {
  const store = await getStore();
  const cache = (await store.get<Record<string, string>>("videoDescriptions")) || {};
  if (cache[videoId]) return cache[videoId];

  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(videoId);
    const description = info.basic_info.short_description ?? "";

    if (description) {
      cache[videoId] = description;
      await store.set("videoDescriptions", cache);
      await store.save();
    }

    return description;
  } catch {
    return "";
  }
}
