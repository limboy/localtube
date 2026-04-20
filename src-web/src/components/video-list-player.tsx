import { useToast } from "@/hooks/use-toast";
import { parseYouTubeChannel } from "@/lib/channel-parser";
import {
  loadPlaylist,
  addOrUpdatePlaylist,
  cn,
  loadChannel,
  addOrUpdateChannel,
  loadBookmarks,
  saveBookmarks,
  loadPlaylists,
  loadChannels,
  loadSkippedVideos,
  saveSkippedVideos
} from "@/lib/utils";
import { VideoListInfo, VideoItem, BookmarkData } from "@/types";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { PinOff, Pin, Loader, RefreshCw, Shuffle, Repeat1, Repeat, BookmarkIcon, Eye, EyeOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Nav from "./nav";
import YTPlayer from "./yt-player";
import { parseYouTubePlaylist } from "@/lib/playlist-parser";
import { useNavigate } from "@tanstack/react-router";

export default function VideoListPlayer({
  playlistId,
  channelId,
  showBookmarkedOnly = false
}: {
  playlistId?: string;
  channelId?: string;
  showBookmarkedOnly?: boolean;
}) {
  const { toast } = useToast();
  const [videolist, setVideoList] = useState<VideoListInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [loopMode, setLoopMode] = useState<"none" | "all" | "one">("none");
  const [shuffledItems, setShuffledItems] = useState<VideoListInfo["items"]>([]);
  const [forceReplay, setForceReplay] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Map<string, BookmarkData>>(new Map());
  const [skippedVideos, setSkippedVideos] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const playNextVideoRef = useRef<() => void>(() => { });

  const processVideoList = (videos: VideoItem[], bookmarks: Map<string, BookmarkData>, showBookmarkedOnly: boolean) => {
    const processedVideos = videos.map(video => ({
      ...video,
      isBookmarked: bookmarks.has(video.id),
      isSkipped: skippedVideos.has(video.id),
      bookmarkedAt: bookmarks.get(video.id)?.createdAt,
      originalIndex: videolist?.items.findIndex(v => v.id === video.id) || 0
    }))
      .filter(video => !showBookmarkedOnly || video.isBookmarked)
      .sort((a, b) => {
        if (a.isBookmarked && !b.isBookmarked) return -1;
        if (!a.isBookmarked && b.isBookmarked) return 1;
        if (!a.isBookmarked && !b.isBookmarked) {
          return a.originalIndex - b.originalIndex;
        }
        return 0;
      });

    return processedVideos;
  };

  useEffect(() => {
    async function fetchData() {
      // Reset all states when playlist changes
      setVideoList(null);
      setCurrentVideoId(null);
      setIsShuffled(false);
      setLoopMode("none");
      setShuffledItems([]);
      setIsLoading(true);

      try {
        let data = null;
        const bookmarks = await loadBookmarks();
        setBookmarkedVideos(bookmarks);

        if (showBookmarkedOnly && !playlistId && !channelId) {
          // If no playlist or channel is provided, show bookmarks only
          // convert bookmarks to a video list
          const playlists = await loadPlaylists();
          const channels = await loadChannels();
          const allPlaylistItems = playlists.flatMap(p => p.items);
          const allChannelItems = channels.flatMap(c => c.items);
          const videoList: VideoListInfo = {
            id: "bookmarks",
            title: "Bookmarked Videos",
            lastUpdated: Date.now(),
            unreadCount: 0,
            items: Array.from(bookmarks.keys()).map((videoId) => {
              // find video in playlists and channels
              const video = allPlaylistItems.find((item) => item.id === videoId) || allChannelItems.find((item) => item.id === videoId);
              if (video) {
                return {
                  ...video,
                  isBookmarked: true,
                  bookmarkedAt: bookmarks.get(videoId)?.createdAt
                };
              }
              return null;
            }).filter((item) => item !== null) as VideoItem[]
          };
          setVideoList(videoList);
          const processedVideos = processVideoList(videoList.items, bookmarks, showBookmarkedOnly);
          const firstNonSkipped = processedVideos.find(video => !skippedVideos.has(video.id));
          setCurrentVideoId(firstNonSkipped?.id || null);
          return;
        }

        if (playlistId) {
          data = await loadPlaylist(playlistId);
        } else if (channelId) {
          data = await loadChannel(channelId);
        }

        if (data) {
          // Remove duplicate video IDs
          const seen = new Set();
          const uniqueItems = data.items.filter((item: VideoItem) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          const dedupedPlaylist = { ...data, items: uniqueItems };
          setVideoList(dedupedPlaylist);

          // Process video list and find first non-skipped video
          const processedVideos = processVideoList(uniqueItems, bookmarks, showBookmarkedOnly);
          const firstNonSkipped = processedVideos.find(video => !skippedVideos.has(video.id));
          setCurrentVideoId(firstNonSkipped?.id || null);
        } else if (playlistId || channelId) {
          setError("Playlist or channel not found");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load content");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [playlistId, channelId, showBookmarkedOnly]);

  // Add a safety check to ensure currentVideoId belongs to current playlist
  useEffect(() => {
    if (videolist && currentVideoId) {
      const items = isShuffled ? shuffledItems : processVideoList(videolist.items, bookmarkedVideos, showBookmarkedOnly);
      const videoExists = items.some((item) => item.id === currentVideoId);
      if (!videoExists) {
        setCurrentVideoId(items[0]?.id || null);
      }
    }
  }, [videolist, currentVideoId, isShuffled, shuffledItems, bookmarkedVideos]);

  // Load bookmarks and skipped videos on component mount
  useEffect(() => {
    Promise.all([
      loadBookmarks().then(bookmarks => {
        setBookmarkedVideos(bookmarks);
      }),
      loadSkippedVideos().then(skipped => {
        setSkippedVideos(skipped);
      })
    ]);
  }, []);

  const shufflePlaylist = () => {
    if (!videolist) return;
    const cloned = [...videolist.items];
    if (currentVideoId) {
      const currentIndex = cloned.findIndex((v) => v.id === currentVideoId);
      if (currentIndex > -1) {
        const [currentItem] = cloned.splice(currentIndex, 1);
        // Shuffle the rest
        for (let i = cloned.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
        }
        cloned.unshift(currentItem);
      } else {
        for (let i = cloned.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
        }
      }
    } else {
      for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
      }
    }
    setShuffledItems(cloned);
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      setIsShuffled(true);
      shufflePlaylist();
    } else {
      setIsShuffled(false);
      setShuffledItems([]);
    }
  };

  const toggleLoopMode = () => {
    const modes: ("none" | "all" | "one")[] = ["none", "all", "one"];
    const currentIndex = modes.indexOf(loopMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    setLoopMode(newMode);
    if (newMode !== "one") {
      setForceReplay(false);
    }
  };

  async function handleRefresh() {
    if (!videolist) return; // Remove videos check since it's no longer needed
    setIsRefreshing(true);
    try {
      let data;
      if (playlistId) {
        data = await parseYouTubePlaylist(`https://youtube.com/playlist?list=${playlistId}`);
        if (data) {
          await addOrUpdatePlaylist(data);
        }
      } else if (channelId) {
        data = await parseYouTubeChannel(`https://youtube.com/channel/${channelId}/videos`);
        if (data) {
          await addOrUpdateChannel(data);
        }
      }

      if (data) {
        setVideoList(data);
        // Keep current video if it still exists in the new playlist
        if (currentVideoId && data.items.find((item) => item.id === currentVideoId)) {
          // Current video still exists, keep it
        } else {
          // Current video was removed, switch to first video
          // Find first non-skipped video
          const firstNonSkipped = data.items.find(item => !skippedVideos.has(item.id));
          setCurrentVideoId(firstNonSkipped?.id || null);
        }
        toast({
          title: playlistId ? "Playlist refreshed from YouTube!" : "Channel refreshed from YouTube!"
        });
      }
    } catch (e) {
      toast({
        title: playlistId ? "Failed to refresh playlist" : "Failed to refresh channel",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handlePinWindow() {
    await window.electron.setAlwaysOnTop(!isPinned);
    setIsPinned((prev) => !prev);
  }

  useEffect(() => {
    playNextVideoRef.current = () => {
      if (!videolist) return;
      if (loopMode === "one" && currentVideoId) {
        setForceReplay((prev) => !prev);
        return;
      }

      if (isShuffled && shuffledItems.length) {
        const idx = currentVideoId ? shuffledItems.findIndex((v) => v.id === currentVideoId) : -1;
        let nextIdx = idx + 1;
        // Find next non-skipped video
        while (nextIdx < shuffledItems.length && skippedVideos.has(shuffledItems[nextIdx].id)) {
          nextIdx++;
        }
        // If we reached the end and loop mode is all, start from beginning
        if (nextIdx >= shuffledItems.length && loopMode === "all") {
          nextIdx = shuffledItems.findIndex(v => !skippedVideos.has(v.id));
        }
        if (nextIdx >= 0 && nextIdx < shuffledItems.length) {
          setCurrentVideoId(shuffledItems[nextIdx].id);
        }
      } else {
        const items = videolist.items;
        const currentIndex = items.findIndex((item) => item.id === currentVideoId);
        let nextIndex = currentIndex + 1;
        // Find next non-skipped video
        while (nextIndex < items.length && skippedVideos.has(items[nextIndex].id)) {
          nextIndex++;
        }
        // If we reached the end and loop mode is all, start from beginning
        if (nextIndex >= items.length && loopMode === "all") {
          nextIndex = items.findIndex(v => !skippedVideos.has(v.id));
        }
        if (nextIndex >= 0 && nextIndex < items.length) {
          setCurrentVideoId(items[nextIndex].id);
        }
      }
    };
  }, [isShuffled, loopMode, currentVideoId, videolist, shuffledItems]);

  useEffect(() => {
    if (currentVideoId) {
      const el = document.getElementById(`video-item-${currentVideoId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentVideoId]);

  const toggleBookmark = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newBookmarks = new Map(bookmarkedVideos);
    if (newBookmarks.has(videoId)) {
      newBookmarks.delete(videoId);
    } else {
      newBookmarks.set(videoId, { createdAt: Date.now() });
    }
    setBookmarkedVideos(newBookmarks);
    await saveBookmarks(newBookmarks);
    if (showBookmarkedOnly) {
      navigate({ to: "/bookmarks" })
    }
  };

  const handleSkipVideo = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSkipped = new Set(skippedVideos).add(videoId);
    setSkippedVideos(newSkipped);
    await saveSkippedVideos(newSkipped);
    // If currently playing video is skipped, play next
    if (videoId === currentVideoId) {
      playNextVideoRef.current();
    }
  };

  const handleUnskipVideo = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSkipped = new Set(skippedVideos);
    newSkipped.delete(videoId);
    setSkippedVideos(newSkipped);
    await saveSkippedVideos(newSkipped);
  };

  if (isLoading) return <div className="p-4"></div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  const processedVideos = processVideoList(
    isShuffled ? shuffledItems : videolist?.items || [],
    bookmarkedVideos,
    showBookmarkedOnly
  )

  if (!processedVideos.length) {
    return (
      <div className="flex flex-col h-screen items-center bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>Select a channel or playlist to start play</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen items-center bg-background">
      <Nav>
        <div>
          <h1 className="font-semibold line-clamp-1 select-none cursor-default">
            {videolist!.title}
          </h1>
        </div>

        <div className="flex flex-row gap-1">
          <TooltipProvider disableHoverableContent={true}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handlePinWindow} className="btn-icon">
                  {isPinned ? (
                    <PinOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Pin size={16} strokeWidth={1.5} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPinned ? "Unpin Window" : "Pin Window"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleRefresh} className="btn-icon">
                  {isRefreshing ? (
                    <Loader className="animate-spin" size={16} strokeWidth={1.5} />
                  ) : (
                    <RefreshCw size={16} strokeWidth={1.5} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh {playlistId ? "Playlist" : "Channel"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        </div>
      </Nav>
      <div className="p-4 w-full max-w-200 bg-background">
        <div className="aspect-video">
          <YTPlayer
            videoId={currentVideoId || ""}
            onVideoEnd={() => playNextVideoRef.current()}
            forceReplay={forceReplay}
          />
        </div>
      </div>

      <div className="h-8 flex items-center justify-between pb-2 sticky top-0 bg-background z-10 pt-2 max-w-200 w-full">
        <div className="flex flex-row justify-between w-full px-4">
          <h2 className="font-semibold">
            Playlist
            <span className="text-sm text-muted-foreground ml-2 font-normal">
              {currentVideoId
                ? `${processedVideos.findIndex((v) => v.id === currentVideoId) + 1} / ${processedVideos.length}`
                : `0 / ${processedVideos.length}`}
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={toggleShuffle}
              className={cn("p-1 rounded hover:bg-accent", isShuffled && "text-primary")}
            >
              <Shuffle strokeWidth={1.5} size={20} />
            </button>
            <button
              onClick={toggleLoopMode}
              className={cn("p-1 rounded hover:bg-accent", loopMode !== "none" && "text-primary")}
            >
              {loopMode === "one" ? (
                <Repeat1 strokeWidth={1.5} size={20} />
              ) : (
                <Repeat strokeWidth={1.5} size={20} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 max-w-200 w-full bg-background">
        <div className="grid gap-4">
          {processedVideos.map((video) => (
            <div
              key={video.id}
              id={`video-item-${video.id}`}
              className={cn(
                "flex gap-4 items-center hover:bg-accent p-2 rounded group",
                currentVideoId === video.id && "bg-accent",
                video.isSkipped && "opacity-50"
              )}
              onClick={() => setCurrentVideoId(video.id)}
            >
              <div className="w-6 flex items-center justify-center text-sm text-muted-foreground shrink-0">
                {processedVideos.findIndex(v => v.id === video.id) + 1}
              </div>
              {/* Modified thumbnail container */}
              <div className="w-24 h-16 flex-none">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <div className="user-select-none cursor-default" style={{ WebkitUserSelect: "none" }}>
                <h2 className="line-clamp-2 leading-5">{video.title}</h2>
                <div className="flex flex-row gap-1">
                  <span className="text-sm text-gray-500">{video.duration}</span>
                </div>
              </div>
              <div className="ml-auto flex gap-1">
                {video.isSkipped ? (
                  <button
                    onClick={(e) => handleUnskipVideo(video.id, e)}
                    className="p-1 rounded hover:bg-accent-foreground/10 opacity-80"
                  >
                    <Eye size={20} strokeWidth={1.5} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={(e) => handleSkipVideo(video.id, e)}
                      className={cn(
                        "p-1 rounded hover:bg-accent-foreground/10",
                        "opacity-0 group-hover:opacity-80"
                      )}
                    >
                      <EyeOff size={20} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => toggleBookmark(video.id, e)}
                      className={cn(
                        "p-1 rounded hover:bg-accent-foreground/10",
                        bookmarkedVideos.has(video.id) ? "" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <BookmarkIcon size={20} fill={bookmarkedVideos.has(video.id) ? "#ccc" : "none"} strokeWidth={bookmarkedVideos.has(video.id) ? 1 : 1} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
