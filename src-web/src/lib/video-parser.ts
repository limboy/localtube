import { VideoItem } from "@/types";
import { getInnertube } from "./innertube";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function extractVideoId(url: string): string {
  try {
    let urlToParse = url.trim();
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
      urlToParse = 'https://' + urlToParse;
    }
    const u = new URL(urlToParse);
    if (u.hostname === 'youtu.be' || u.hostname === 'www.youtu.be') {
      return u.pathname.slice(1);
    }
    const id = u.searchParams.get("v");
    if (id) return id;
    throw new Error("Invalid YouTube video URL");
  } catch (e) {
    throw new Error("Invalid YouTube video URL");
  }
}

export function isVideoUrl(url: string): boolean {
  try {
    let urlToParse = url.trim();
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
      urlToParse = 'https://' + urlToParse;
    }
    const u = new URL(urlToParse);
    if (u.hostname === 'youtu.be' || u.hostname === 'www.youtu.be') {
      return true;
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.has("v");
    }
    return false;
  } catch {
    return false;
  }
}

export async function parseYouTubeVideo(url: string): Promise<VideoItem> {
  const videoId = extractVideoId(url);
  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);
  
  const title = info.basic_info.title ?? "Unknown Video";
  const thumbs = info.basic_info.thumbnail ?? [];
  const thumbnail = thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url ?? "";
  const duration = info.basic_info.duration ? formatDuration(info.basic_info.duration) : "Live";
  
  return {
    id: videoId,
    title,
    thumbnail,
    duration
  };
}
