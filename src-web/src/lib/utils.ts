import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChannelInfo, PlaylistInfo, BookmarkData, EnrichedBookmark, VideoItem, FolderInfo, SidebarItem, WatchHistoryEntry } from "@/types";
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
    data[index].items.forEach((v) => { v.unseen = false; });
    data[index].unreadCount = 0;
  }

  const store = await getStore();
  await store.set("channels", data);
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function addOrUpdateChannel(channel: ChannelInfo) {
  const data = await loadChannels();
  const store = await getStore();
  const isNew = !data.some(c => c.id === channel.id);
  const index = data.findIndex((p) => p.id === channel.id);
  if (index !== -1) {
    data[index] = channel;
  } else {
    data.push(channel);
  }
  await store.set("channels", data);

  if (isNew) {
    const order = await loadSidebarOrder();
    const firstFolderIdx = order.findIndex(e => e.type === 'folder');
    if (firstFolderIdx !== -1) {
      order.splice(firstFolderIdx, 0, { type: 'channel', id: channel.id });
    } else {
      order.push({ type: 'channel', id: channel.id });
    }
    await store.set("sidebarOrder", order);
  }

  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function removeChannel(channelId: string) {
  const data = await loadChannels();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === channelId);
  if (index !== -1) {
    data.splice(index, 1);
    await store.set("channels", data);

    const order = await loadSidebarOrder();
    removeItemFromOrder(order, channelId, 'channel');
    await store.set("sidebarOrder", order);

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
    data[index].items.forEach((v) => { v.unseen = false; });
    data[index].unreadCount = 0;
  }
  await store.set("playlists", data);
  window.dispatchEvent(new CustomEvent('store-updated'));
}

// Mark a single video as seen across every playlist/channel it appears in,
// recomputing each source's unread count. Used when a video is clicked/played.
export async function markVideoAsSeen(videoId: string) {
  const store = await getStore();
  let changed = false;

  const playlists = await loadPlaylists();
  for (const p of playlists) {
    let touched = false;
    for (const v of p.items) {
      if (v.id === videoId && v.unseen) { v.unseen = false; touched = true; }
    }
    if (touched) {
      p.unreadCount = p.items.filter((v) => v.unseen).length;
      changed = true;
    }
  }
  if (changed) await store.set("playlists", playlists);

  let channelsChanged = false;
  const channels = await loadChannels();
  for (const c of channels) {
    let touched = false;
    for (const v of c.items) {
      if (v.id === videoId && v.unseen) { v.unseen = false; touched = true; }
    }
    if (touched) {
      c.unreadCount = c.items.filter((v) => v.unseen).length;
      channelsChanged = true;
    }
  }
  if (channelsChanged) await store.set("channels", channels);

  if (changed || channelsChanged) {
    window.dispatchEvent(new CustomEvent('store-updated'));
  }
}

// Mark only the videos shown in the "Latest" view as seen (the same capped/sorted
// set as loadLatestVideos), leaving older videos outside that list untouched.
export async function markAllLatestAsRead() {
  const store = await getStore();
  const latest = await loadLatestVideos();
  const latestIds = new Set(latest.map((v) => v.id));

  const playlists = await loadPlaylists();
  for (const p of playlists) {
    p.items.forEach((v) => { if (latestIds.has(v.id)) v.unseen = false; });
    p.unreadCount = p.items.filter((v) => v.unseen).length;
  }
  await store.set("playlists", playlists);

  const channels = await loadChannels();
  for (const c of channels) {
    c.items.forEach((v) => { if (latestIds.has(v.id)) v.unseen = false; });
    c.unreadCount = c.items.filter((v) => v.unseen).length;
  }
  await store.set("channels", channels);

  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function addOrUpdatePlaylist(playlist: PlaylistInfo) {
  const data = await loadPlaylists();
  const store = await getStore();
  const isNew = !data.some(p => p.id === playlist.id);
  const index = data.findIndex((p) => p.id === playlist.id);
  if (index !== -1) {
    data[index] = playlist;
  } else {
    data.push(playlist);
  }
  await store.set("playlists", data);

  if (isNew) {
    const order = await loadSidebarOrder();
    const firstFolderIdx = order.findIndex(e => e.type === 'folder');
    if (firstFolderIdx !== -1) {
      order.splice(firstFolderIdx, 0, { type: 'playlist', id: playlist.id });
    } else {
      order.push({ type: 'playlist', id: playlist.id });
    }
    await store.set("sidebarOrder", order);
  }

  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function removePlaylist(playlistId: string) {
  const data = await loadPlaylists();
  const store = await getStore();
  const index = data.findIndex((p) => p.id === playlistId);
  if (index !== -1) {
    data.splice(index, 1);
    await store.set("playlists", data);

    const order = await loadSidebarOrder();
    removeItemFromOrder(order, playlistId, 'playlist');
    await store.set("sidebarOrder", order);

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

// --- Folder & Sidebar Order ---

export async function loadFolders(): Promise<FolderInfo[]> {
  const s = await getStore();
  return (await s.get<FolderInfo[]>("folders")) || [];
}

async function saveFolders(folders: FolderInfo[]) {
  const s = await getStore();
  await s.set("folders", folders);
}

export async function loadSidebarOrder(): Promise<SidebarItem[]> {
  const s = await getStore();
  const order = await s.get<SidebarItem[]>("sidebarOrder");
  if (order) return order;

  const playlists = await loadPlaylists();
  const channels = await loadChannels();
  const migrated: SidebarItem[] = [
    ...playlists.map(p => ({ type: 'playlist' as const, id: p.id })),
    ...channels.map(c => ({ type: 'channel' as const, id: c.id })),
  ];
  await s.set("sidebarOrder", migrated);
  return migrated;
}

export async function saveSidebarOrder(order: SidebarItem[]) {
  const s = await getStore();
  await s.set("sidebarOrder", order);
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function createFolder(name: string): Promise<FolderInfo> {
  const folder: FolderInfo = { id: crypto.randomUUID(), name, isCollapsed: false };
  const folders = await loadFolders();
  folders.push(folder);
  await saveFolders(folders);

  const order = await loadSidebarOrder();
  order.push({ type: 'folder', id: folder.id, children: [] });
  await saveSidebarOrder(order);

  return folder;
}

export async function renameFolder(folderId: string, newName: string) {
  const folders = await loadFolders();
  const f = folders.find(f => f.id === folderId);
  if (f) {
    f.name = newName;
    await saveFolders(folders);
    window.dispatchEvent(new CustomEvent('store-updated'));
  }
}

export async function removeFolder(folderId: string) {
  const folders = await loadFolders();
  const order = await loadSidebarOrder();
  const store = await getStore();

  const idx = order.findIndex(e => e.type === 'folder' && e.id === folderId);
  if (idx !== -1) {
    const entry = order[idx];
    if (entry.type === 'folder') {
      const playlistIds = new Set(entry.children.filter(c => c.type === 'playlist').map(c => c.id));
      const channelIds = new Set(entry.children.filter(c => c.type === 'channel').map(c => c.id));

      if (playlistIds.size > 0) {
        const playlists = await loadPlaylists();
        await store.set("playlists", playlists.filter(p => !playlistIds.has(p.id)));
      }
      if (channelIds.size > 0) {
        const channels = await loadChannels();
        await store.set("channels", channels.filter(c => !channelIds.has(c.id)));
      }

      order.splice(idx, 1);
    }
  }

  const newFolders = folders.filter(f => f.id !== folderId);
  await saveFolders(newFolders);
  await saveSidebarOrder(order);
  await store.save();
}

export async function setFolderCollapsed(folderId: string, collapsed: boolean) {
  const folders = await loadFolders();
  const f = folders.find(f => f.id === folderId);
  if (f) {
    f.isCollapsed = collapsed;
    await saveFolders(folders);
  }
}

function removeItemFromOrder(order: SidebarItem[], itemId: string, itemType: 'playlist' | 'channel') {
  const topIdx = order.findIndex(e => e.type === itemType && e.id === itemId);
  if (topIdx !== -1) {
    order.splice(topIdx, 1);
    return;
  }
  for (const entry of order) {
    if (entry.type === 'folder') {
      const childIdx = entry.children.findIndex(c => c.type === itemType && c.id === itemId);
      if (childIdx !== -1) {
        entry.children.splice(childIdx, 1);
        return;
      }
    }
  }
}

export async function moveItemToFolder(itemId: string, itemType: 'playlist' | 'channel', folderId: string) {
  const order = await loadSidebarOrder();
  removeItemFromOrder(order, itemId, itemType);

  const folder = order.find(e => e.type === 'folder' && e.id === folderId);
  if (folder && folder.type === 'folder') {
    folder.children.push({ type: itemType, id: itemId });
  }
  await saveSidebarOrder(order);
}

export async function moveItemToTopLevel(itemId: string, itemType: 'playlist' | 'channel') {
  const order = await loadSidebarOrder();
  removeItemFromOrder(order, itemId, itemType);
  const firstFolderIdx = order.findIndex(e => e.type === 'folder');
  if (firstFolderIdx !== -1) {
    order.splice(firstFolderIdx, 0, { type: itemType, id: itemId });
  } else {
    order.push({ type: itemType, id: itemId });
  }
  await saveSidebarOrder(order);
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

export async function loadWatchHistory(): Promise<WatchHistoryEntry[]> {
  const store = await getStore();
  return (await store.get<WatchHistoryEntry[]>("watchHistory")) || [];
}

export async function saveWatchHistory(history: WatchHistoryEntry[]) {
  const store = await getStore();
  await store.set("watchHistory", history);
  await store.save();
  window.dispatchEvent(new CustomEvent('store-updated'));
}

export async function addToWatchHistory(video: VideoItem) {
  const history = await loadWatchHistory();
  const filtered = history.filter(e => e.videoId !== video.id);
  filtered.unshift({
    videoId: video.id,
    title: video.title,
    thumbnail: video.thumbnail,
    duration: video.duration,
    watchedAt: Date.now(),
  });
  await saveWatchHistory(filtered);
}

export async function clearWatchHistory() {
  const store = await getStore();
  await store.set("watchHistory", []);
  await store.save();
  window.dispatchEvent(new CustomEvent('store-updated'));
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

export interface PlaybackPosition {
  position: number;
  duration: number;
  updatedAt: number;
}

export async function loadPlaybackPosition(videoId: string): Promise<PlaybackPosition | null> {
  const store = await getStore();
  const positions = (await store.get<Record<string, PlaybackPosition>>("playbackPositions")) || {};
  return positions[videoId] || null;
}

export async function savePlaybackPosition(videoId: string, position: number, duration: number) {
  if (duration <= 0) return;
  const store = await getStore();
  const positions = (await store.get<Record<string, PlaybackPosition>>("playbackPositions")) || {};
  const nearEnd = (duration - position) < 10;
  if (position < 5 || nearEnd) {
    if (positions[videoId]) {
      delete positions[videoId];
      await store.set("playbackPositions", positions);
    }
    return;
  }
  positions[videoId] = { position, duration, updatedAt: Date.now() };
  await store.set("playbackPositions", positions);
}

export async function clearPlaybackPosition(videoId: string) {
  const store = await getStore();
  const positions = (await store.get<Record<string, PlaybackPosition>>("playbackPositions")) || {};
  if (positions[videoId]) {
    delete positions[videoId];
    await store.set("playbackPositions", positions);
  }
}

export async function exportData(): Promise<boolean> {
  const playlists = await loadPlaylists();
  const channels = await loadChannels();
  const folders = await loadFolders();
  const sidebarOrder = await loadSidebarOrder();
  const data = { playlists, channels, folders, sidebarOrder };
  const json = JSON.stringify(data, null, 2);
  return window.electron.saveFile(json, "localtube-export.json");
}

export async function importData(): Promise<boolean> {
  const content = await window.electron.openFile();
  if (!content) return false;

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return false;
  }

  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.playlists) || !Array.isArray(obj.channels)) return false;

  const existingPlaylists = await loadPlaylists();
  const existingChannels = await loadChannels();
  const existingFolders = await loadFolders();
  const existingOrder = await loadSidebarOrder();

  const playlistIds = new Set(existingPlaylists.map(p => p.id));
  const channelIds = new Set(existingChannels.map(c => c.id));

  const newPlaylists = (obj.playlists as PlaylistInfo[]).filter(p => !playlistIds.has(p.id));
  const newChannels = (obj.channels as ChannelInfo[]).filter(c => !channelIds.has(c.id));

  const s = store;
  await s.set("playlists", [...existingPlaylists, ...newPlaylists]);
  await s.set("channels", [...existingChannels, ...newChannels]);

  if (Array.isArray(obj.folders)) {
    const folderIds = new Set(existingFolders.map(f => f.id));
    const newFolders = (obj.folders as FolderInfo[]).filter(f => !folderIds.has(f.id));
    await s.set("folders", [...existingFolders, ...newFolders]);
  }

  if (Array.isArray(obj.sidebarOrder)) {
    const existingIds = new Set<string>();
    for (const item of existingOrder) {
      existingIds.add(item.id);
      if (item.type === "folder") {
        for (const child of item.children) existingIds.add(child.id);
      }
    }
    const newItems = (obj.sidebarOrder as SidebarItem[]).filter(item => !existingIds.has(item.id));
    const firstFolderIdx = existingOrder.findIndex(e => e.type === "folder");
    if (firstFolderIdx !== -1) {
      existingOrder.splice(firstFolderIdx, 0, ...newItems);
    } else {
      existingOrder.push(...newItems);
    }
    await s.set("sidebarOrder", existingOrder);
  }

  window.dispatchEvent(new CustomEvent("store-updated"));
  return true;
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

export function isValidUrl(url: string): boolean {
  try {
    let urlToParse = url.trim();
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
      urlToParse = 'https://' + urlToParse;
    }
    new URL(urlToParse);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a URL is a valid YouTube playlist URL
 */
export function isPlaylistUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  return url.includes("list=") && url.includes("youtube.com");
}

/**
 * Checks if a URL is a valid YouTube channel URL
 */
export function isChannelUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
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


export async function loadLatestVideos(): Promise<VideoItem[]> {
  const playlists = await loadPlaylists();
  const channels = await loadChannels();

  const seen = new Set<string>();
  const allVideos: VideoItem[] = [];

  for (const source of [...channels, ...playlists]) {
    for (const video of source.items) {
      if (seen.has(video.id)) continue;
      seen.add(video.id);
      allVideos.push(video);
    }
  }

  allVideos.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  return allVideos.slice(0, 100);
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
