import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChannelInfo, PlaylistInfo, BookmarkData, EnrichedBookmark, DividerInfo, SidebarItem } from "@/types";
import { setupKonamiCode } from "./konami";
import { fetchViaMain } from "./bridge";

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
}

export async function removeChannel(channelId: string) {
  const data = await loadChannels();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === channelId);
  if (index !== -1) {
    data.splice(index, 1);
    await store.set("channels", data);
    await store.save();
  }
}

export async function reorderChannels(channelIds: string[]) {
  const data = await loadChannels();
  const store = await getStore();

  const reorderedData = channelIds.map(id => data.find(c => c.id === id)).filter(Boolean) as ChannelInfo[];

  await store.set("channels", reorderedData);
  await store.save();
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
}

export async function removePlaylist(playlistId: string) {
  const data = await loadPlaylists();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === playlistId);
  if (index !== -1) {
    data.splice(index, 1);
    await store.set("playlists", data);
    await store.save();
  }
}

export async function reorderPlaylists(playlistIds: string[]) {
  const data = await loadPlaylists();
  const store = await getStore();

  const reorderedData = playlistIds.map(id => data.find(p => p.id === id)).filter(Boolean) as PlaylistInfo[];

  await store.set("playlists", reorderedData);
  await store.save();
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

export async function getTheme() {
  const store = await getStore();
  return (await store.get<string>("theme")) || "light";
}

export function getThemeSync() {
  return window.electron.store.getSync<string>("theme") || "light";
}

export async function setTheme(theme: string) {
  const store = await getStore();
  await store.set("theme", theme);
}

export async function parseYouTubePage(url: string) {
  // Fetch the HTML content of the playlist page.
  const response = await fetchViaMain(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/237.84.2.178 Safari/537.36"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist page: ${response.statusText}`);
  }
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const scripts = doc.getElementsByTagName("script");
  let ytInitialData: any;
  let innerTube: {
    INNERTUBE_API_KEY: string;
    INNERTUBE_CLIENT_VERSION: string;
    INNERTUBE_API_VERSION: string;
    INNERTUBE_CLIENT_NAME: string;
    INNERTUBE_CONTEXT: Record<string, any>;
  } | null = null;
  for (const script of scripts) {
    if (script.textContent!.includes("ytInitialData =")) {
      // Execute the script in a safe context
      ytInitialData = new Function(`
        ${script.textContent}
        return ytInitialData;
      `)();
    }

    if (script.textContent!.includes("INNERTUBE_API_KEY")) {
      // console.log(script.textContent);
      // Execute the script in a safe context
      innerTube = new Function(`
        window.ytcfg = {
            _config: {},

            set: function() {
                // Handle different argument patterns
                if (arguments.length === 1 && typeof arguments[0] === 'object') {
                    // When passing an object
                    Object.assign(this._config, arguments[0]);
                } else if (arguments.length === 2) {
                    // When passing key, value
                    const [key, value] = arguments;
                    this._config[key] = value;
                } else {
                    throw new Error('Invalid arguments. Use set(object) or set(key, value)');
                }
                return this;
            },

            get: function(key) {
                if (key === undefined) {
                    return this._config;
                }
                return this._config[key];
            }
        };

        ${script.textContent}

        const INNERTUBE_API_KEY = ytcfg.get("INNERTUBE_API_KEY");
        const INNERTUBE_API_VERSION = ytcfg.get("INNERTUBE_API_VERSION");
        const INNERTUBE_CLIENT_NAME = ytcfg.get("INNERTUBE_CLIENT_NAME");
        const INNERTUBE_CLIENT_VERSION = ytcfg.get("INNERTUBE_CLIENT_VERSION");
        const INNERTUBE_CONTEXT = ytcfg.get("INNERTUBE_CONTEXT");
        return {
          INNERTUBE_API_KEY,
          INNERTUBE_API_VERSION,
          INNERTUBE_CLIENT_NAME,
          INNERTUBE_CLIENT_VERSION,
          INNERTUBE_CONTEXT
        }
      `)();
    }
  }

  return { ytInitialData, innerTube };
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

export async function enrichBookmarks(): Promise<EnrichedBookmark[]> {
  const bookmarks = await loadBookmarks();
  const playlists = await loadPlaylists();
  const channels = await loadChannels();

  const enriched: EnrichedBookmark[] = [];

  for (const [id, bookmark] of bookmarks) {
    const playlist = playlists.find(playlist => playlist.items.some(item => item.id === id));
    const channel = channels.find(channel => channel.items.some(item => item.id === id));

    if (playlist) {
      enriched.push({
        id,
        title: playlist.title,
        type: 'playlist',
        bookmarkedAt: bookmark.createdAt,
        data: playlist
      });
    } else if (channel) {
      enriched.push({
        id,
        title: channel.title,
        type: 'channel',
        bookmarkedAt: bookmark.createdAt,
        data: channel
      });
    }
  }

  // Sort by bookmark date, newest first
  return enriched.sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
}

export async function loadPlaylistsWithDividers(): Promise<SidebarItem[]> {
  const store = await getStore();
  const items = (await store.get<SidebarItem[]>("playlistsWithDividers")) || [];
  return items;
}

export async function savePlaylistsWithDividers(items: SidebarItem[]) {
  const store = await getStore();
  await store.set("playlistsWithDividers", items);
  await store.save();
}

export async function loadChannelsWithDividers(): Promise<SidebarItem[]> {
  const store = await getStore();
  const items = (await store.get<SidebarItem[]>("channelsWithDividers")) || [];
  return items;
}

export async function saveChannelsWithDividers(items: SidebarItem[]) {
  const store = await getStore();
  await store.set("channelsWithDividers", items);
  await store.save();
}

export async function addDividerAfterItem(itemId: string, type: 'playlist' | 'channel') {
  const divider: DividerInfo = {
    id: `divider-${Date.now()}`,
    type: 'divider',
    createdAt: Date.now()
  };

  if (type === 'playlist') {
    await initializePlaylistsWithDividers();
    const items = await loadPlaylistsWithDividers();
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      items.splice(itemIndex + 1, 0, divider);
      await savePlaylistsWithDividers(items);
    }
  } else {
    await initializeChannelsWithDividers();
    const items = await loadChannelsWithDividers();
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      items.splice(itemIndex + 1, 0, divider);
      await saveChannelsWithDividers(items);
    }
  }
}

export async function removeDivider(dividerId: string, type: 'playlist' | 'channel') {
  if (type === 'playlist') {
    const items = await loadPlaylistsWithDividers();
    const filteredItems = items.filter(item => item.id !== dividerId);
    await savePlaylistsWithDividers(filteredItems);
  } else {
    const items = await loadChannelsWithDividers();
    const filteredItems = items.filter(item => item.id !== dividerId);
    await saveChannelsWithDividers(filteredItems);
  }
}

export async function initializePlaylistsWithDividers() {
  const playlistsWithDividers = await loadPlaylistsWithDividers();
  if (playlistsWithDividers.length === 0) {
    const playlists = await loadPlaylists();
    const initialItems = playlists.map(p => ({ ...p, type: 'playlist' as const }));
    await savePlaylistsWithDividers(initialItems);
  }
}

export async function initializeChannelsWithDividers() {
  const channelsWithDividers = await loadChannelsWithDividers();
  if (channelsWithDividers.length === 0) {
    const channels = await loadChannels();
    const initialItems = channels.map(c => ({ ...c, type: 'channel' as const }));
    await saveChannelsWithDividers(initialItems);
  }
}

export function isDivider(item: SidebarItem): item is DividerInfo {
  return 'type' in item && item.type === 'divider';
}

export function isPlaylistItem(item: SidebarItem): item is PlaylistInfo {
  return !isDivider(item);
}

export function isChannelItem(item: SidebarItem): item is ChannelInfo {
  return !isDivider(item);
}

export async function syncPlaylistsWithDividers() {
  const playlists = await loadPlaylists();
  const playlistsWithDividers = await loadPlaylistsWithDividers();

  // If no divider data exists, initialize with current playlists
  if (playlistsWithDividers.length === 0) {
    const initialItems = playlists.map(p => ({ ...p, type: 'playlist' as const }));
    await savePlaylistsWithDividers(initialItems);
    return initialItems;
  }

  const existingPlaylistIds = playlistsWithDividers.filter(item => !isDivider(item)).map(item => item.id);

  const newPlaylists = playlists.filter(playlist => !existingPlaylistIds.includes(playlist.id));
  const updatedPlaylists = playlists.filter(playlist => existingPlaylistIds.includes(playlist.id));

  let syncedItems: SidebarItem[] = [];

  for (const item of playlistsWithDividers) {
    if (isDivider(item)) {
      syncedItems.push(item);
    } else {
      const updatedPlaylist = updatedPlaylists.find(p => p.id === item.id);
      if (updatedPlaylist) {
        syncedItems.push({ ...updatedPlaylist, type: 'playlist' });
      }
    }
  }

  // Add new playlists at the end
  syncedItems.push(...newPlaylists.map(p => ({ ...p, type: 'playlist' as const })));

  await savePlaylistsWithDividers(syncedItems);
  return syncedItems;
}

export async function syncChannelsWithDividers() {
  const channels = await loadChannels();
  const channelsWithDividers = await loadChannelsWithDividers();

  // If no divider data exists, initialize with current channels
  if (channelsWithDividers.length === 0) {
    const initialItems = channels.map(c => ({ ...c, type: 'channel' as const }));
    await saveChannelsWithDividers(initialItems);
    return initialItems;
  }

  const existingChannelIds = channelsWithDividers.filter(item => !isDivider(item)).map(item => item.id);

  const newChannels = channels.filter(channel => !existingChannelIds.includes(channel.id));
  const updatedChannels = channels.filter(channel => existingChannelIds.includes(channel.id));

  let syncedItems: SidebarItem[] = [];

  for (const item of channelsWithDividers) {
    if (isDivider(item)) {
      syncedItems.push(item);
    } else {
      const updatedChannel = updatedChannels.find(c => c.id === item.id);
      if (updatedChannel) {
        syncedItems.push({ ...updatedChannel, type: 'channel' });
      }
    }
  }

  // Add new channels at the end
  syncedItems.push(...newChannels.map(c => ({ ...c, type: 'channel' as const })));

  await saveChannelsWithDividers(syncedItems);
  return syncedItems;
}
