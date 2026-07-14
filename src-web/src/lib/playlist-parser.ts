import type { PlaylistInfo, RefreshFailure, VideoItem } from "@/types";
import { addOrUpdatePlaylist, loadPlaylist, loadPlaylists } from "./utils";
import { getInnertube } from "./innertube";
import { parseRelativeTime } from "./time-utils";

const PLAYLIST_VIDEO_CAP = 500;

function extractPlaylistId(url: string): string {
  const playlistId = new URL(url).searchParams.get("list");
  if (!playlistId) throw new Error("Invalid YouTube playlist URL");
  return playlistId;
}

function mapVideo(v: any): VideoItem | null {
  if (v?.type === 'LockupView') {
    if (v.content_type !== 'VIDEO') return null;
    const id = v.content_id;
    if (!id) return null;

    const title = typeof v.metadata?.title === "string" ? v.metadata.title : v.metadata?.title?.toString?.() ?? "";
    if (!title) return null;

    const sources = v.content_image?.image || [];
    const thumbnail = sources[0]?.url || "";

    const bottomOverlay = v.content_image?.overlays?.find(
      (o: any) => o.type === 'ThumbnailBottomOverlayView'
    );
    const duration = bottomOverlay?.badges?.[0]?.text || "Live";

    const rows = v.metadata?.metadata?.metadata_rows || [];
    let publishedText = "";
    if (rows.length > 0) {
      const parts = rows[0].metadata_parts || [];
      if (parts.length > 1) {
        publishedText = parts[parts.length - 1]?.text?.text || parts[parts.length - 1]?.text?.toString() || "";
      } else if (parts.length === 1) {
        publishedText = parts[0]?.text?.text || parts[0]?.text?.toString() || "";
      }
    }
    const publishedAt = parseRelativeTime(publishedText);

    return { id, title, thumbnail, duration, publishedAt };
  }

  const id: string | undefined = v?.video_id ?? v?.id;
  if (!id) return null;

  const title = typeof v.title === "string" ? v.title : v.title?.toString?.() ?? "";
  if (!title) return null;

  if (v.badges?.some?.((b: any) => b.style === "BADGE_STYLE_TYPE_MEMBERS_ONLY")) {
    return null;
  }

  const thumbs = v.thumbnails ?? [];
  const thumbnail: string =
    v.best_thumbnail?.url ?? thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url ?? "";

  const isLive = v.is_live === true;
  const duration: string = isLive
    ? "Live"
    : v.duration?.text ?? v.length_text?.toString?.() ?? "Live";

  const videoInfoText = v.video_info?.text ?? v.video_info?.toString?.() ?? "";
  let publishedText = v.published?.text ?? v.published?.toString?.() ?? "";
  if (!publishedText && videoInfoText) {
    const parts = videoInfoText.split(/ \u2022 | \u00b7 | \u2027 | \u2022 | • /);
    if (parts.length > 1) {
      publishedText = parts[parts.length - 1]?.trim() || "";
    }
  }
  const publishedAt = parseRelativeTime(publishedText);

  return { id, title, thumbnail, duration, publishedAt };
}

function getPlaylistVideos(playlist: any): any[] {
  if (playlist.items && playlist.items.length > 0) {
    return playlist.items;
  }
  const memo = playlist.memo;
  if (memo) {
    const lockups = memo.get('LockupView');
    if (lockups && lockups.length > 0) {
      return lockups;
    }
  }
  return [];
}

export async function parseYouTubePlaylist(playlistUrl: string): Promise<PlaylistInfo> {
  const playlistId = extractPlaylistId(playlistUrl);
  const yt = await getInnertube();
  let playlist = await yt.getPlaylist(playlistId);

  const title = playlist.info.title ?? "Unknown Playlist";
  const headerThumbs = playlist.info.thumbnails ?? [];
  let thumbnail =
    headerThumbs[headerThumbs.length - 1]?.url ?? headerThumbs[0]?.url;

  const items: VideoItem[] = [];

  while (true) {
    const playlistVideos = getPlaylistVideos(playlist);
    for (const v of playlistVideos) {
      const mapped = mapVideo(v);
      if (mapped) items.push(mapped);
      if (items.length >= PLAYLIST_VIDEO_CAP) break;
    }

    if (items.length >= PLAYLIST_VIDEO_CAP || !playlist.has_continuation) break;

    playlist = await playlist.getContinuation();
  }

  if (!thumbnail && items.length > 0) {
    thumbnail = items[0].thumbnail;
  }

  const unseenItems = items.map((v) => ({ ...v, unseen: true }));

  return {
    unreadCount: unseenItems.length,
    id: playlistId,
    title,
    thumbnail,
    items: unseenItems,
    lastUpdated: Date.now(),
  };
}

export async function checkForPlaylistUpdates(playlistId: string): Promise<Boolean> {
  const stored = await loadPlaylist(playlistId);
  const yt = await getInnertube();
  const playlist = await yt.getPlaylist(playlistId);

  const playlistVideos = getPlaylistVideos(playlist);
  for (const v of playlistVideos) {
    const mapped = mapVideo(v);
    if (!mapped) continue;
    if (!stored?.items.some((video) => video.id === mapped.id)) {
      return true;
    }
  }
  return false;
}

async function fetchPlaylistFirstPage(
  playlistId: string
): Promise<{ items: VideoItem[]; thumbnail: string | undefined }> {
  const yt = await getInnertube();
  const playlist = await yt.getPlaylist(playlistId);

  const headerThumbs = playlist.info.thumbnails ?? [];
  let thumbnail: string | undefined =
    headerThumbs[headerThumbs.length - 1]?.url ?? headerThumbs[0]?.url;

  const items: VideoItem[] = [];
  const playlistVideos = getPlaylistVideos(playlist);
  for (const v of playlistVideos) {
    const mapped = mapVideo(v);
    if (mapped) items.push(mapped);
  }

  if (!thumbnail && items.length > 0) {
    thumbnail = items[0].thumbnail;
  }

  return { items, thumbnail };
}

export async function checkAllPlaylistsForUpdates(
  progressCallback?: (current: number, total: number) => void,
  failureCallback?: (failure: RefreshFailure) => void
): Promise<Boolean> {
  const playlists = await loadPlaylists();
  let needsUpdate = false;
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    progressCallback?.(i + 1, playlists.length);

    try {
      const { items: firstPage, thumbnail } = await fetchPlaylistFirstPage(playlist.id);

      const storedIds = new Set(playlist.items.map((v) => v.id));
      const newVideos = firstPage
        .filter((v) => !storedIds.has(v.id))
        .map((v) => ({ ...v, unseen: true }));

      if (newVideos.length > 0) {
        needsUpdate = true;
      }

      const mergedItems = [...newVideos, ...playlist.items].slice(0, PLAYLIST_VIDEO_CAP);

      const updatedPlaylist = {
        ...playlist,
        items: mergedItems,
        thumbnail: thumbnail ?? playlist.thumbnail,
        unreadCount: mergedItems.filter((v) => v.unseen).length,
        lastUpdated: Date.now(),
      };
      await addOrUpdatePlaylist(updatedPlaylist);
    } catch (error) {
      const failure: RefreshFailure = {
        type: 'playlist',
        id: playlist.id,
        title: playlist.title,
        error,
      };
      console.error(`Failed to refresh playlist "${playlist.title}" (${playlist.id})`, error);
      failureCallback?.(failure);
    }
  }
  return needsUpdate;
}

export async function fullRefreshAllPlaylists(
  progressCallback?: (current: number, total: number) => void,
  failureCallback?: (failure: RefreshFailure) => void
): Promise<void> {
  const playlists = await loadPlaylists();
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    progressCallback?.(i + 1, playlists.length);

    try {
      const url = `https://www.youtube.com/playlist?list=${playlist.id}`;
      const fresh = await parseYouTubePlaylist(url);

      await addOrUpdatePlaylist({
        ...fresh,
        items: fresh.items.map((v) => ({ ...v, unseen: false })),
        unreadCount: 0,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      const failure: RefreshFailure = {
        type: 'playlist',
        id: playlist.id,
        title: playlist.title,
        error,
      };
      console.error(`Failed to fully refresh playlist "${playlist.title}" (${playlist.id})`, error);
      failureCallback?.(failure);
    }
  }
}
