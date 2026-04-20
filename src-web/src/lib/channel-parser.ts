import type { ChannelInfo, VideoItem } from "@/types";
import { addOrUpdateChannel, loadChannel, loadChannels } from "./utils";
import { getInnertube } from "./innertube";

const CHANNEL_VIDEO_CAP = 500;

function extractChannelIdFromUrl(url: string): string | null {
  const match = url.match(/\/channel\/(UC[\w-]+)/);
  return match ? match[1] : null;
}

async function resolveChannelId(channelUrl: string): Promise<string> {
  const direct = extractChannelIdFromUrl(channelUrl);
  if (direct) return direct;

  const yt = await getInnertube();
  const endpoint = await yt.resolveURL(channelUrl);
  const browseId = endpoint.payload?.browseId as string | undefined;
  if (!browseId || !browseId.startsWith("UC")) {
    throw new Error(`Could not resolve channel ID from URL: ${channelUrl}`);
  }
  return browseId;
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

async function collectChannelVideos(channelId: string): Promise<VideoItem[]> {
  const yt = await getInnertube();
  const channelRoot = await yt.getChannel(channelId);
  let feed: { videos: any[]; has_continuation: boolean; getContinuation: () => Promise<any> } =
    await channelRoot.getVideos();

  const items: VideoItem[] = [];

  while (true) {
    for (const v of feed.videos) {
      const mapped = mapVideo(v);
      if (mapped) items.push(mapped);
      if (items.length >= CHANNEL_VIDEO_CAP) return items;
    }

    if (!feed.has_continuation) break;

    feed = await feed.getContinuation();
  }

  return items;
}

async function fetchAvatarAsDataUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const dataUrl = await window.electron.fetchImageAsDataUrl(url);
    return dataUrl ?? undefined;
  } catch {
    return undefined;
  }
}

export async function parseYouTubeChannel(channelUrl: string): Promise<ChannelInfo> {
  const cleanedUrl = channelUrl.replace(/\/$/, "").replace(/\/featured$/, "").replace(/\/videos$/, "");
  const channelId = await resolveChannelId(cleanedUrl);

  const yt = await getInnertube();
  const channelRoot = await yt.getChannel(channelId);

  const metadata = channelRoot.metadata;
  const avatar = metadata.avatar;
  const avatarUrl = avatar?.[avatar.length - 1]?.url ?? avatar?.[0]?.url;
  const thumbnail = await fetchAvatarAsDataUrl(avatarUrl);

  const items = await collectChannelVideos(channelId);

  return {
    unreadCount: 0,
    id: metadata.external_id ?? channelId,
    title: metadata.title ?? "",
    thumbnail,
    items,
    lastUpdated: Date.now(),
  };
}

export async function checkForChannelUpdates(channelId: string): Promise<Boolean> {
  const channel = await loadChannel(channelId);
  const yt = await getInnertube();
  const channelRoot = await yt.getChannel(channelId);
  const feed = await channelRoot.getVideos();

  for (const v of feed.videos) {
    const mapped = mapVideo(v);
    if (!mapped) continue;
    if (!channel?.items.some((video) => video.id === mapped.id)) {
      return true;
    }
  }
  return false;
}

async function fetchChannelFirstPage(
  channelId: string,
  existingThumbnail?: string
): Promise<{ items: VideoItem[]; thumbnail: string | undefined; title: string }> {
  const yt = await getInnertube();
  const channelRoot = await yt.getChannel(channelId);
  const feed = await channelRoot.getVideos();

  const metadata = channelRoot.metadata;
  const avatar = metadata.avatar;
  const avatarUrl = avatar?.[avatar.length - 1]?.url ?? avatar?.[0]?.url;

  // Only fetch new avatar if we don't have a cached one (data URL)
  let thumbnail = existingThumbnail;
  if (!existingThumbnail?.startsWith("data:") && avatarUrl) {
    thumbnail = await fetchAvatarAsDataUrl(avatarUrl);
  }

  const items: VideoItem[] = [];
  for (const v of feed.videos) {
    const mapped = mapVideo(v);
    if (mapped) items.push(mapped);
  }

  return { items, thumbnail, title: metadata.title ?? "" };
}

export async function checkAllChannelsForUpdates(
  progressCallback?: (current: number, total: number) => void
): Promise<Boolean> {
  const channels = await loadChannels();
  let needsUpdate = false;
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    progressCallback?.(i + 1, channels.length);

    const { items: firstPage, thumbnail, title } = await fetchChannelFirstPage(channel.id, channel.thumbnail);

    const storedIds = new Set(channel.items.map((v) => v.id));
    const newVideos = firstPage.filter((v) => !storedIds.has(v.id));

    if (newVideos.length > 0) {
      needsUpdate = true;
    }

    const mergedItems = [...newVideos, ...channel.items].slice(0, CHANNEL_VIDEO_CAP);

    const updated: ChannelInfo = {
      ...channel,
      title: title || channel.title,
      thumbnail: thumbnail ?? channel.thumbnail,
      items: mergedItems,
      unreadCount: (channel.unreadCount || 0) + newVideos.length,
      lastUpdated: Date.now(),
    };
    await addOrUpdateChannel(updated);
  }

  return needsUpdate;
}
