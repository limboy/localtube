import {
  loadPlaylist,
  cn,
  loadChannel,
  loadBookmarks,
  saveBookmarks,
  loadPlaylists,
  loadChannels,
  loadSkippedVideos,
  saveSkippedVideos,
  getVideoDescription
} from "@/lib/utils";
import { VideoListInfo, VideoItem, BookmarkData } from "@/types";

import { Loader, Shuffle, Repeat1, Repeat, BookmarkIcon, Eye, EyeOff } from "lucide-react";

import { useState, useRef, useEffect } from "react";
import Nav from "./nav";
import YTPlayer from "./yt-player";
import { useNavigate } from "@tanstack/react-router";
import { SidebarProvider, Sidebar, SidebarContent, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { PanelRight } from "lucide-react";
import { UpdateIndicator } from "./update-indicator";

export default function VideoListPlayer({
  playlistId,
  channelId,
  showBookmarkedOnly = false,
  initialVideoId,
  autoPlay = true
}: {
  playlistId?: string;
  channelId?: string;
  showBookmarkedOnly?: boolean;
  initialVideoId?: string;
  autoPlay?: boolean;
}) {
  const [videolist, setVideoList] = useState<VideoListInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [loopMode, setLoopMode] = useState<"none" | "all" | "one">("none");
  const [shuffledItems, setShuffledItems] = useState<VideoListInfo["items"]>([]);
  const [forceReplay, setForceReplay] = useState(false);
  const [description, setDescription] = useState<string>("");
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);


  const [bookmarkedVideos, setBookmarkedVideos] = useState<Map<string, BookmarkData>>(new Map());
  const [skippedVideos, setSkippedVideos] = useState<Set<string>>(new Set());
  const [shouldAutoPlay, setShouldAutoPlay] = useState(autoPlay);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 50);
    };
    window.addEventListener('store-updated', handleUpdate);
    return () => {
      window.removeEventListener('store-updated', handleUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  const playNextVideoRef = useRef<() => void>(() => { });

  const processVideoList = (videos: VideoItem[], bookmarks: Map<string, BookmarkData>, showBookmarkedOnly: boolean) => {
    const processedVideos = videos.map(video => ({
      ...video,
      isBookmarked: bookmarks.has(video.id),
      isSkipped: skippedVideos.has(video.id),
      bookmarkedAt: bookmarks.get(video.id)?.createdAt,
      originalIndex: videolist?.items.findIndex(v => v.id === video.id) || 0
    }))
      .filter(video => !showBookmarkedOnly || video.isBookmarked);

    return processedVideos;
  };

  const lastSourceKeyRef = useRef<string>("");

  useEffect(() => {
    const sourceKey = `${playlistId ?? ""}::${channelId ?? ""}::${showBookmarkedOnly}`;
    const isSourceChange = lastSourceKeyRef.current !== sourceKey;
    lastSourceKeyRef.current = sourceKey;

    async function fetchData() {
      if (isSourceChange) {
        setVideoList(null);
        setCurrentVideoId(null);
        setIsShuffled(false);
        setLoopMode("none");
        setShuffledItems([]);
        setShouldAutoPlay(autoPlay);
        setIsLoading(true);
      }

      try {
        let data = null;
        const bookmarks = await loadBookmarks();
        setBookmarkedVideos(bookmarks);

        if (showBookmarkedOnly && !playlistId && !channelId) {
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
          if (isSourceChange) {
            const processedVideos = processVideoList(videoList.items, bookmarks, showBookmarkedOnly);
            const firstNonSkipped = processedVideos.find(video => !skippedVideos.has(video.id));
            setCurrentVideoId(initialVideoId || firstNonSkipped?.id || null);
          }
          return;
        }

        if (playlistId) {
          data = await loadPlaylist(playlistId);
        } else if (channelId) {
          data = await loadChannel(channelId);
        }

        if (data) {
          const seen = new Set();
          const uniqueItems = data.items.filter((item: VideoItem) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          const dedupedPlaylist = { ...data, items: uniqueItems };
          setVideoList(dedupedPlaylist);

          if (isSourceChange) {
            const processedVideos = processVideoList(uniqueItems, bookmarks, showBookmarkedOnly);
            const firstNonSkipped = processedVideos.find(video => !skippedVideos.has(video.id));
            setCurrentVideoId(initialVideoId || firstNonSkipped?.id || null);
          }
        } else if (playlistId || channelId) {
          if (isSourceChange) setError("Playlist or channel not found");
        }
      } catch (e) {
        if (isSourceChange) setError(e instanceof Error ? e.message : "Failed to load content");
      } finally {
        if (isSourceChange) setIsLoading(false);
      }
    }
    fetchData();
  }, [playlistId, channelId, showBookmarkedOnly, refreshKey]);

  // Add a safety check to ensure currentVideoId belongs to current playlist
  useEffect(() => {
    if (videolist && currentVideoId) {
      const items = processVideoList(videolist.items, bookmarkedVideos, showBookmarkedOnly);
      const videoExists = items.some((item) => item.id === currentVideoId);
      if (!videoExists) {
        if (!initialVideoId) {
          setCurrentVideoId(items[0]?.id || null);
        }
      }
    }
  }, [videolist, currentVideoId, isShuffled, bookmarkedVideos, showBookmarkedOnly, initialVideoId]);

  useEffect(() => {
    if (initialVideoId) {
      setCurrentVideoId(initialVideoId);
    }
  }, [initialVideoId]);

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
    const itemsToShuffle = processVideoList(videolist.items, bookmarkedVideos, showBookmarkedOnly);
    const cloned = [...itemsToShuffle];
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





  useEffect(() => {
    playNextVideoRef.current = () => {
      if (!videolist) return;
      if (loopMode === "one" && currentVideoId) {
        setShouldAutoPlay(true);
        setForceReplay((prev) => !prev);
        return;
      }

      setShouldAutoPlay(true);
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
        const items = processVideoList(videolist.items, bookmarkedVideos, showBookmarkedOnly);
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
  }, [isShuffled, loopMode, currentVideoId, videolist, shuffledItems, bookmarkedVideos, showBookmarkedOnly]);

  useEffect(() => {
    if (currentVideoId) {
      const el = document.getElementById(`video-item-${currentVideoId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });

      // Fetch description
      setDescription("");
      setIsLoadingDescription(true);
      getVideoDescription(currentVideoId).then(desc => {
        setDescription(desc);
        setIsLoadingDescription(false);
      });
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
    videolist?.items || [],
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
    <SidebarProvider defaultOpen={true} storageKey="right-sidebar" className="min-h-full h-full relative">
      <div className="flex flex-col flex-1 h-screen bg-background min-w-0 overflow-hidden">
        <Nav>
          <div />

          <div className="flex flex-row gap-2 items-center">
            <UpdateIndicator />
            {/* The right sidebar trigger */}
            {!showBookmarkedOnly && (
              <SidebarTrigger className="shrink-0 ml-1">
                <PanelRight size={18} strokeWidth={2} />
              </SidebarTrigger>
            )}
          </div>
        </Nav>
        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center">
          <div className="p-4 w-full bg-background flex flex-col max-w-4xl">
            <div className="aspect-video relative">
              <YTPlayer
                videoId={currentVideoId || ""}
                onVideoEnd={() => playNextVideoRef.current()}
                forceReplay={forceReplay}
                autoPlay={shouldAutoPlay}
              />
            </div>
            {currentVideoId && (
              <div className="mt-4 pb-4">
                <h1
                  className="underline text-xl font-bold line-clamp-2 cursor-pointer hover:text-primary transition-colors block"
                  onClick={() => window.electron.openUrl(`https://www.youtube.com/watch?v=${currentVideoId}`)}
                >
                  {processedVideos.find(v => v.id === currentVideoId)?.title}
                </h1>
                <div className="mt-2">
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap pr-2">
                    {isLoadingDescription ? (
                      <div className="flex items-center gap-2">
                        <Loader size={12} className="animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      description || "No description available"
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!showBookmarkedOnly && (
        <Sidebar side="right" className="border-l">
          <SidebarContent className="bg-background gap-0 overflow-hidden">
            <div className="h-11 flex items-center justify-between sticky top-0 bg-background z-10 w-full border-b shrink-0">
              <div className="flex flex-row justify-between w-full px-4 items-center gap-2">
                <h2 className="font-semibold truncate min-w-0">
                  Videos
                  <span className="text-sm text-muted-foreground ml-2 font-normal truncate">
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
                    <Shuffle strokeWidth={1.5} size={18} />
                  </button>
                  <button
                    onClick={toggleLoopMode}
                    className={cn("p-1 rounded hover:bg-accent", loopMode !== "none" && "text-primary")}
                  >
                    {loopMode === "one" ? (
                      <Repeat1 strokeWidth={1.5} size={18} />
                    ) : (
                      <Repeat strokeWidth={1.5} size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 w-full bg-background">
              <div className="grid gap-0.5">
                {processedVideos.map((video) => (
                  <div
                    key={video.id}
                    id={`video-item-${video.id}`}
                    className={cn(
                      "flex items-start gap-2 w-full hover:bg-accent p-2 rounded group/video cursor-default",
                      currentVideoId === video.id && "bg-accent",
                      video.isSkipped && "opacity-50"
                    )}
                    onClick={() => {
                      setCurrentVideoId(video.id);
                      setShouldAutoPlay(true);
                    }}
                  >
                    <div className="w-16 h-10 flex-none bg-muted rounded overflow-hidden">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 user-select-none" style={{ WebkitUserSelect: "none" }}>
                      <span className="line-clamp-1 text-sm leading-tight mb-0.5" title={video.title}>{video.title}</span>
                      <div className="flex items-center justify-between opacity-50 text-sm font-normal mt-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 mr-2 flex-1">
                          <span className="truncate">{video.duration}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {video.isSkipped ? (
                            <button
                              onClick={(e) => handleUnskipVideo(video.id, e)}
                              className="p-0.5 rounded hover:bg-accent-foreground/20 opacity-80"
                            >
                              <Eye size={14} strokeWidth={1.5} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleSkipVideo(video.id, e)}
                                className={cn(
                                  "p-0.5 rounded hover:bg-accent-foreground/20 transition-opacity",
                                  "opacity-0 group-hover/video:opacity-80"
                                )}
                              >
                                <EyeOff size={14} strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={(e) => toggleBookmark(video.id, e)}
                                className={cn(
                                  "p-0.5 rounded hover:bg-accent-foreground/20 transition-opacity",
                                  bookmarkedVideos.has(video.id) ? "" : "opacity-0 group-hover/video:opacity-100"
                                )}
                              >
                                <BookmarkIcon size={14} fill={bookmarkedVideos.has(video.id) ? "currentColor" : "none"} strokeWidth={1.5} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
      )}
    </SidebarProvider>
  );
}
