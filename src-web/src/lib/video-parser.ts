import { VideoItem } from "@/types";
import { getInnertube } from "./innertube";
import { normalizeThumbnail } from "./thumbnails";
import { extractVideoId } from "./youtube-url";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function parseYouTubeVideo(url: string): Promise<VideoItem> {
  const videoId = extractVideoId(url);
  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);
  
  if (!info.basic_info.title) {
    const status = info.playability_status?.status;
    const reason = info.playability_status?.reason;
    throw new Error(
      `Couldn't load video details${reason ? ` (${reason})` : status ? ` (${status})` : ""}. Please try again.`
    );
  }

  const title = info.basic_info.title;
  const thumbs = info.basic_info.thumbnail ?? [];
  const thumbnail = normalizeThumbnail(thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url);
  const duration = info.basic_info.duration ? formatDuration(info.basic_info.duration) : "Live";
  
  return {
    id: videoId,
    title,
    thumbnail,
    duration
  };
}
