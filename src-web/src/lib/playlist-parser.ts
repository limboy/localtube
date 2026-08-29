import type { PlaylistInfo, RefreshFailure, VideoItem } from "@/types";
import { addOrUpdatePlaylist, loadPlaylists } from "./utils";
import { getInnertube } from "./innertube";
import { parseLockupPublishedAt, parseRelativeTime } from "./time-utils";
import { normalizeThumbnail } from "./thumbnails";
import { extractPlaylistId } from "./youtube-url";

const PLAYLIST_VIDEO_CAP = 500;

function mapVideo(v: any): VideoItem | null {
  if (v?.type === 'LockupView') {
    if (v.content_type !== 'VIDEO') return null;
    const id = v.content_id;
    if (!id) return null;

    const title = typeof v.metadata?.title === "string" ? v.metadata.title : v.metadata?.title?.toString?.() ?? "";
    if (!title) return null;

    const sources = v.content_image?.image || [];
    const thumbnail = normalizeThumbnail(sources[0]?.url);

    const bottomOverlay = v.content_image?.overlays?.find(
      (o: any) => o.type === 'ThumbnailBottomOverlayView'
    );
    const duration = bottomOverlay?.badges?.[0]?.text || "Live";

    return { id, title, thumbnail, duration, publishedAt: parseLockupPublishedAt(v) };
  }

  const id: string | undefined = v?.video_id ?? v?.id;
  if (!id) return null;

  const title = typeof v.title === "string" ? v.title : v.title?.toString?.() ?? "";
  if (!title) return null;

  if (v.badges?.some?.((b: any) => b.style === "BADGE_STYLE_TYPE_MEMBERS_ONLY")) {
    return null;
  }

  const thumbs = v.thumbnails ?? [];
  const thumbnail: string = normalizeThumbnail(
    v.best_thumbnail?.url ?? thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url
  );

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

  return {
    id: playlistId,
    title,
    thumbnail,
    items,
    lastUpdated: Date.now(),
  };
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
      const newVideos = firstPage.filter((v) => !storedIds.has(v.id));

      if (newVideos.length > 0) {
        needsUpdate = true;
      }

      const mergedItems = [...newVideos, ...playlist.items].slice(0, PLAYLIST_VIDEO_CAP);

      const updatedPlaylist = {
        ...playlist,
        items: mergedItems,
        thumbnail: thumbnail ?? playlist.thumbnail,
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
