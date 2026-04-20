import { PlaylistInfo, VideoItem } from "@/types";
import { fetchViaMain } from "./bridge";
import { addOrUpdatePlaylist, loadPlaylist, loadPlaylists, parseYouTubePage } from "./utils";

interface InnertubeConfig {
  INNERTUBE_API_KEY: string;
  INNERTUBE_CLIENT_VERSION: string;
  INNERTUBE_CONTEXT: any;
}

class YouTubePlaylistParser {
  private readonly config: InnertubeConfig;
  private readonly userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3`;

  constructor(config: InnertubeConfig) {
    this.config = config;
  }

  private getPlaylistIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Verify it's a YouTube URL
      if (!urlObj.hostname.includes("youtube.com")) {
        throw new Error("Not a YouTube URL");
      }
      const params = new URLSearchParams(urlObj.search);
      const playlistId = params.get("list");
      if (!playlistId) throw new Error("Invalid playlist URL");
      return playlistId;
    } catch (error) {
      throw new Error(`Invalid URL format: ${(error as Error).message}`);
    }
  }

  private async fetchPlaylistPage(playlistId: string, continuation?: string) {
    const payload = {
      context: this.config.INNERTUBE_CONTEXT,
      ...(continuation ? { continuation } : { browseId: `VL${playlistId}` })
    };

    const response = await fetchViaMain(
      `https://www.youtube.com/youtubei/v1/browse?prettyPrint=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.config.INNERTUBE_CONTEXT.client.userAgent || this.userAgent,
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20250213.05.00",
          Origin: "https://www.youtube.com"
        },
        body: JSON.stringify(payload),
        timeout: 10000
      }
    );

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format");
    }

    return data;
  }

  private extractVideosFromResponse(data: any): VideoItem[] {
    const videos: VideoItem[] = [];

    try {
      let contents =
        data.contents?.twoColumnBrowseResultsRenderer?.tabs[0]?.tabRenderer?.content
          ?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents[0]
          ?.playlistVideoListRenderer?.contents;

      if (!contents) {
        contents =
          data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
      }

      if (!contents) {
        return videos;
      }

      for (const item of contents) {
        if (item.playlistVideoRenderer) {
          const video = item.playlistVideoRenderer;
          if (JSON.stringify(video).includes("BADGE_STYLE_TYPE_MEMBERS_ONLY")) {
            console.log("Skipping members-only video:", video.title.runs[0].text);
            continue; // Skip members-only videos
          }

          // Get highest resolution thumbnail
          const thumbnails = video.thumbnail.thumbnails;
          const bestThumbnail = thumbnails[thumbnails.length - 1].url;

          videos.push({
            id: video.videoId,
            title: video.title.runs[0].text,
            thumbnail: bestThumbnail,
            duration: video.lengthText?.simpleText || "Live"
          });
        }
      }
    } catch (error) {
      console.error("Error extracting videos:", error);
    }

    return videos;
  }

  private extractContinuationToken(data: any): string | null {
    try {
      return (
        data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
          .contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents[100]
          .continuationItemRenderer.continuationEndpoint.continuationCommand.token || null
      );
    } catch {
      return null;
    }
  }

  public async parsePlaylist(playlistUrl: string): Promise<PlaylistInfo> {
    try {
      const playlistId = this.getPlaylistIdFromUrl(playlistUrl);
      let allVideos: VideoItem[] = [];
      let continuation: string | null = null;
      let playlistTitle = "";
      let playlistThumbnail = "";
      let retryCount = 0;

      do {
        // Add exponential backoff for retries
        const delay = continuation ? Math.min(1000 * Math.pow(2, retryCount), 10000) : 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const data = await this.fetchPlaylistPage(playlistId, continuation || undefined);

        // Extract playlist title and thumbnail from first request
        if (!continuation) {
          const headerRenderer = data.header?.playlistHeaderRenderer;
          if (headerRenderer?.title?.runs?.[0]?.text) {
            playlistTitle = headerRenderer.title.runs[0].text;
          } else if (headerRenderer?.title?.simpleText) {
            playlistTitle = headerRenderer.title.simpleText;
          }

          if (headerRenderer?.playlistHeaderBannerRenderer?.heroPlaylistThumbnailRenderer?.thumbnail?.thumbnails) {
            const thumbnails = headerRenderer.playlistHeaderBannerRenderer.heroPlaylistThumbnailRenderer.thumbnail.thumbnails;
            playlistThumbnail = thumbnails[thumbnails.length - 1].url;
          }
        }

        if (!playlistTitle && data.metadata?.playlistMetadataRenderer?.title) {
          playlistTitle = data.metadata.playlistMetadataRenderer.title;
        }

        if (!playlistThumbnail && data.metadata?.playlistMetadataRenderer?.thumbnail?.thumbnails) {
          const thumbnails = data.metadata.playlistMetadataRenderer.thumbnail.thumbnails;
          playlistThumbnail = thumbnails[thumbnails.length - 1].url;
        }

        // Try sidebar renderer
        if (!playlistThumbnail) {
          const sidebarItem = data.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer;
          if (sidebarItem?.thumbnail?.thumbnails) {
            const thumbnails = sidebarItem.thumbnail.thumbnails;
            playlistThumbnail = thumbnails[thumbnails.length - 1].url;
          }
        }

        const videos = this.extractVideosFromResponse(data);
        allVideos = allVideos.concat(videos);

        if (allVideos.length >= 500) {
          break;
        }

        continuation = this.extractContinuationToken(data);
        retryCount++;
      } while (continuation);

      // Final fallback: use first video's thumbnail
      if (!playlistThumbnail && allVideos.length > 0) {
        playlistThumbnail = allVideos[0].thumbnail;
      }

      return {
        unreadCount: 0,
        id: playlistId,
        title: playlistTitle,
        thumbnail: playlistThumbnail,
        items: allVideos,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error("Error parsing playlist:", error);
      throw new Error(`Failed to parse playlist: ${(error as Error).message}`);
    }
  }
}

function parseVideosFromInitialData(data: any): VideoItem[] {
  const playlist =
    data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
      .contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer;
  const items = playlist.contents
    .filter((item: any) => !JSON.stringify(item).includes("BADGE_STYLE_TYPE_MEMBERS_ONLY"))
    .map((item: any) => {
      const video = item.playlistVideoRenderer;
      if (!video) return null;

      return {
        title: video.title.runs[0].text,
        id: video.videoId,
        thumbnail: video.thumbnail.thumbnails[0].url,
        duration: video.lengthText?.simpleText || "Live"
      } as VideoItem;
    })
    .filter((item: any) => item !== null) as VideoItem[];
  return items;
}

export async function parseYouTubePlaylist(playlistUrl: string): Promise<PlaylistInfo> {
  const playlistId = new URL(playlistUrl).searchParams.get("list");
  if (!playlistId) {
    throw new Error("Invalid YouTube playlist URL");
  }
  playlistUrl = `https://youtube.com/playlist?list=${playlistId}`;
  const page = await parseYouTubePage(playlistUrl);

  if (page.innerTube) {
    const parser = new YouTubePlaylistParser(page.innerTube);
    return parser.parsePlaylist(playlistUrl);
  } else if (page.ytInitialData) {
    const items = parseVideosFromInitialData(page.ytInitialData);

    const metadata = page.ytInitialData.metadata?.playlistMetadataRenderer;
    const playlistThumbnail = metadata?.thumbnail?.thumbnails?.[0]?.url || items[0]?.thumbnail;

    return {
      title: metadata?.title || "Unknown Playlist",
      id: playlistId,
      unreadCount: 0,
      thumbnail: playlistThumbnail,
      items,
      lastUpdated: Date.now()
    };
  }
  throw Error("Failed to parse playlist");
}

export async function checkForPlaylistUpdates(playlistId: string): Promise<Boolean> {
  const playlist = await loadPlaylist(playlistId);
  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  const page = await parseYouTubePage(playlistUrl);
  const items = parseVideosFromInitialData(page.ytInitialData);

  let hasNewVideos = false;
  for (const item of items) {
    if (!playlist?.items.some((video) => video.id === item.id)) {
      hasNewVideos = true;
      break;
    }
  }

  return hasNewVideos;
}

export async function checkAllPlaylistsForUpdates(progressCallback?: (current: number, total: number) => void): Promise<Boolean> {
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

    // Always update to capture metadata like thumbnails, even if no new videos
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
