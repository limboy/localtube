import { ChannelInfo, VideoItem } from "@/types";
import { fetchViaMain } from "./bridge";
import { addOrUpdateChannel, loadChannel, loadChannels, parseYouTubePage } from "./utils";

interface InnertubeConfig {
  INNERTUBE_API_KEY: string;
  INNERTUBE_CLIENT_VERSION: string;
  INNERTUBE_CONTEXT: any;
}

export class YouTubeChannelParser {
  private readonly config: InnertubeConfig;
  private readonly userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3`;

  constructor(config: InnertubeConfig) {
    this.config = config;
  }

  private async fetchChannelPage(channelId: string, continuation?: string) {
    const payload = {
      context: this.config.INNERTUBE_CONTEXT,
      ...(continuation ? { continuation } : { browseId: `${channelId}` })
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
        data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;

      if (!contents) {
        return videos;
      }

      for (const item of contents) {
        if (item.richItemRenderer) {
          const video = item.richItemRenderer.content.videoRenderer;
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
      const continuationItems =
        data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
      return (
        data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems[
          continuationItems.length - 1
        ].continuationItemRenderer.continuationEndpoint.continuationCommand.token || null
      );
    } catch {
      return null;
    }
  }

  public async parseChannel(channelId: string, continuation: string | null): Promise<VideoItem[]> {
    try {
      let allVideos: VideoItem[] = [];
      let retryCount = 0;

      do {
        // Add exponential backoff for retries
        const delay = continuation ? Math.min(1000 * Math.pow(2, retryCount), 10000) : 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const data = await this.fetchChannelPage(channelId, continuation || undefined);

        const videos = this.extractVideosFromResponse(data);
        allVideos = allVideos.concat(videos);

        if (allVideos.length >= 170) {
          allVideos = allVideos.slice(0, 170);
          break;
        }

        continuation = this.extractContinuationToken(data);
        retryCount++;
      } while (continuation);

      return allVideos;
    } catch (error) {
      console.error("Error parsing channel:", error);
      throw new Error(`Failed to parse channel: ${(error as Error).message}`);
    }
  }
}

function parseContinuationFromInitialData(data: any): string | null {
  let continuation: string | null = null;
  const channelVideos =
    data.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.content.richGridRenderer
      .contents;

  if (channelVideos[channelVideos.length - 1].continuationItemRenderer) {
    continuation =
      channelVideos[channelVideos.length - 1].continuationItemRenderer.continuationEndpoint
        .continuationCommand.token;
  }

  return continuation;
}

function parseVideosFromInitialData(data: any): VideoItem[] {
  const channelVideos =
    data.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.content.richGridRenderer
      .contents;

  const items = channelVideos
    .filter((item: any) => item.richItemRenderer && !JSON.stringify(item).includes("BADGE_STYLE_TYPE_MEMBERS_ONLY"))
    .map((item: any) => {
      const video = item.richItemRenderer.content.videoRenderer;
      return {
        id: video.videoId,
        title: video.title.runs[0].text,
        thumbnail: video.thumbnail.thumbnails[0].url,
        duration: video.lengthText?.simpleText || "Live"
      };
    });

  return items;
}

export async function parseYouTubeChannel(channelUrl: string): Promise<ChannelInfo> {
  channelUrl = channelUrl.replace(/\/$/, "");
  channelUrl = channelUrl.replace(/\/featured$/, "");
  channelUrl = channelUrl.includes("/videos") ? channelUrl : `${channelUrl}/videos`;
  const page = await parseYouTubePage(channelUrl);
  let result: ChannelInfo = {
    unreadCount: 0,
    id: "",
    title: "",
    items: [],
    lastUpdated: Date.now()
  };
  let continuation: string | null = null;

  if (page.ytInitialData) {
    const channelMetadata = page.ytInitialData.metadata.channelMetadataRenderer;
    continuation = parseContinuationFromInitialData(page.ytInitialData);
    const items = parseVideosFromInitialData(page.ytInitialData);

    result = {
      unreadCount: 0,
      id: channelMetadata.externalId,
      title: channelMetadata.title,
      thumbnail: channelMetadata.avatar?.thumbnails?.[0]?.url,
      items,
      lastUpdated: Date.now()
    };
  }

  if (continuation && page.innerTube) {
    const parser = new YouTubeChannelParser(page.innerTube);
    result.items = result.items.concat(await parser.parseChannel(channelUrl, continuation));
  }

  return result;
}

export async function checkForChannelUpdates(channelId: string): Promise<Boolean> {
  const channel = await loadChannel(channelId);
  const channelUrl = `https://www.youtube.com/channel/${channelId}/videos`;
  const page = await parseYouTubePage(channelUrl);
  const items = parseVideosFromInitialData(page.ytInitialData);

  let hasNewVideos = false;
  for (const item of items) {
    if (!channel?.items.some((video) => video.id === item.id)) {
      hasNewVideos = true;
      break;
    }
  }

  return hasNewVideos;
}

export async function checkAllChannelsForUpdates(progressCallback?: (current: number, total: number) => void): Promise<Boolean> {
  const channels = await loadChannels();
  let needsUpdate = false;
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    progressCallback?.(i + 1, channels.length);

    const newResult = await parseYouTubeChannel(
      `https://www.youtube.com/channel/${channel.id}/videos`
    );

    const newVideos = newResult.items.filter(
      (video) => !channel.items.some((v) => v.id === video.id)
    );

    if (newVideos.length > 0) {
      needsUpdate = true;
    }

    // Always update to capture metadata like thumbnails/avatars
    newResult.unreadCount = (channel.unreadCount || 0) + newVideos.length;
    newResult.lastUpdated = Date.now();
    await addOrUpdateChannel(newResult);
  }

  return needsUpdate;
}
