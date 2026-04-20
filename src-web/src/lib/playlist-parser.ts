import type { PlaylistInfo, VideoItem } from "@/types";
import { addOrUpdatePlaylist, loadPlaylist, loadPlaylists } from "./utils";
import { getInnertube } from "./innertube";

const PLAYLIST_VIDEO_CAP = 500;

function extractPlaylistId(url: string): string {
  const playlistId = new URL(url).searchParams.get("list");
  if (!playlistId) throw new Error("Invalid YouTube playlist URL");
  return playlistId;
}

function mapVideo(v: any): VideoItem | null {
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

  return { id, title, thumbnail, duration };
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
  let retryCount = 0;

  while (true) {
    for (const v of playlist.items) {
      const mapped = mapVideo(v);
      if (mapped) items.push(mapped);
      if (items.length >= PLAYLIST_VIDEO_CAP) break;
    }

    if (items.length >= PLAYLIST_VIDEO_CAP || !playlist.has_continuation) break;

    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    retryCount++;

    playlist = await playlist.getContinuation();
  }

  if (!thumbnail && items.length > 0) {
    thumbnail = items[0].thumbnail;
  }

  return {
    unreadCount: 0,
    id: playlistId,
    title,
    thumbnail,
    items,
    lastUpdated: Date.now(),
  };
}

export async function checkForPlaylistUpdates(playlistId: string): Promise<Boolean> {
  const stored = await loadPlaylist(playlistId);
  const yt = await getInnertube();
  const playlist = await yt.getPlaylist(playlistId);

  for (const v of playlist.items) {
    const mapped = mapVideo(v);
    if (!mapped) continue;
    if (!stored?.items.some((video) => video.id === mapped.id)) {
      return true;
    }
  }
  return false;
}

export async function checkAllPlaylistsForUpdates(
  progressCallback?: (current: number, total: number) => void
): Promise<Boolean> {
  const playlists = await loadPlaylists();
  let needsUpdate = false;
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    progressCallback?.(i + 1, playlists.length);

    const newResult = await parseYouTubePlaylist(
      `https://www.youtube.com/playlist?list=${playlist.id}`
    );

    const newVideos = newResult.items.filter(
      (video) => !playlist.items.some((v) => v.id === video.id)
    );

    if (newVideos.length > 0) {
      needsUpdate = true;
    }

    const updatedPlaylist = {
      ...playlist,
      items: newResult.items,
      thumbnail: newResult.thumbnail,
      unreadCount: (playlist.unreadCount || 0) + newVideos.length,
      lastUpdated: Date.now(),
    };
    await addOrUpdatePlaylist(updatedPlaylist);
  }
  return needsUpdate;
}
