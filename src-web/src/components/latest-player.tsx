import {
  cn,
  loadLatestVideos,
  loadUnseenVideos,
  getVideoDescription,
  loadPlaybackPosition,
  savePlaybackPosition,
  clearPlaybackPosition,
  loadBookmarks,
  saveBookmarks,
  loadSkippedVideos,
  saveSkippedVideos,
  markVideoAsSeen,
  markAllUnseenAsSeen,
} from "@/lib/utils";
import { VideoItem, BookmarkData } from "@/types";

import { Loader, BookmarkIcon, Eye, EyeOff } from "lucide-react";

import { useState, useRef, useEffect } from "react";
import Nav from "./nav";
import YTPlayer, { YTPlayerHandle } from "./yt-player";
import { VideoDescription } from "./video-description";
import { SidebarProvider, Sidebar, SidebarContent, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { PanelRight } from "lucide-react";
import { UpdateIndicator } from "./update-indicator";
import { formatRelativeTime } from "@/lib/time-utils";
import { Button } from "@/components/ui/button";

export default function LatestPlayer({
  onlyUnseen = false,
  title = "Latest",
}: {
  onlyUnseen?: boolean;
  title?: string;
} = {}) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [startSeconds, setStartSeconds] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState<string>("");
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Map<string, BookmarkData>>(new Map());
  const [skippedVideos, setSkippedVideos] = useState<Set<string>>(new Set());

  const playerRef = useRef<YTPlayerHandle>(null);
  const playNextVideoRef = useRef<() => void>(() => {});

  const switchVideo = async (videoId: string | null) => {
    if (videoId) {
      const pos = await loadPlaybackPosition(videoId);
      setStartSeconds(pos ? pos.position : undefined);
    } else {
      setStartSeconds(undefined);
    }
    setCurrentVideoId(videoId);
  };

  useEffect(() => {
    async function fetchVideos() {
      setIsLoading(true);
      const data = onlyUnseen ? await loadUnseenVideos() : await loadLatestVideos();
      setVideos(data);
      if (onlyUnseen) setUnseenCount(data.length);
      if (data.length > 0 && !currentVideoId) {
        await switchVideo(data[0].id);
      }
      setIsLoading(false);
    }
    fetchVideos();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const [bookmarks, skipped] = await Promise.all([
          loadBookmarks(),
          loadSkippedVideos(),
        ]);
        if (onlyUnseen) {
          // Keep the list membership stable for the session so the video being
          // watched doesn't vanish when it gets marked seen — just refresh the dots.
          const unseen = await loadUnseenVideos();
          setUnseenCount(unseen.length);
          const unseenIds = new Set(unseen.map((v) => v.id));
          setVideos((prev) => prev.map((v) => ({ ...v, unseen: unseenIds.has(v.id) })));
        } else {
          setVideos(await loadLatestVideos());
        }
        setBookmarkedVideos(bookmarks);
        setSkippedVideos(skipped);
      }, 50);
    };
    window.addEventListener('store-updated', handleUpdate);
    return () => {
      window.removeEventListener('store-updated', handleUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    playNextVideoRef.current = () => {
      if (videos.length === 0) return;
      const idx = videos.findIndex(v => v.id === currentVideoId);
      const nextIdx = idx + 1;
      if (nextIdx < videos.length) {
        switchVideo(videos[nextIdx].id);
        setShouldAutoPlay(true);
        markVideoAsSeen(videos[nextIdx].id);
      }
    };
  }, [currentVideoId, videos]);

  useEffect(() => {
    if (currentVideoId) {
      const el = document.getElementById(`video-item-${currentVideoId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });

      setDescription("");
      setIsLoadingDescription(true);
      getVideoDescription(currentVideoId).then(desc => {
        setDescription(desc);
        setIsLoadingDescription(false);
      });
    }
  }, [currentVideoId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && currentVideoId) {
        const time = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        if (time > 0 && duration > 0) {
          savePlaybackPosition(currentVideoId, time, duration);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentVideoId]);

  useEffect(() => {
    async function loadState() {
      const [bookmarks, skipped] = await Promise.all([loadBookmarks(), loadSkippedVideos()]);
      setBookmarkedVideos(bookmarks);
      setSkippedVideos(skipped);
    }
    loadState();
  }, []);

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
  };

  const handleSkipVideo = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSkipped = new Set(skippedVideos).add(videoId);
    setSkippedVideos(newSkipped);
    await saveSkippedVideos(newSkipped);
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

  const handleMarkAllAsSeen = async () => {
    if (unseenCount === 0) return;

    await markAllUnseenAsSeen();
    setUnseenCount(0);
    setVideos([]);
    setShouldAutoPlay(false);
    await switchVideo(null);
  };

  const displayVideos = videos.map(video => ({
    ...video,
    isSkipped: skippedVideos.has(video.id),
  }));

  const currentVideo = videos.find(v => v.id === currentVideoId);

  return (
    <SidebarProvider defaultOpen={true} storageKey="right-sidebar" className="min-h-full h-full relative">
      <div className="flex flex-col flex-1 h-screen bg-background min-w-0 overflow-hidden">
        <Nav>
          <div />
          <div className="flex flex-row gap-2 items-center">
            <UpdateIndicator />
            <SidebarTrigger className="shrink-0 ml-1">
              <PanelRight size={18} strokeWidth={2} />
            </SidebarTrigger>
          </div>
        </Nav>

        <div className="flex-1 overflow-y-auto w-full flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader className="animate-spin text-muted-foreground" size={32} />
            </div>
          ) : !currentVideoId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>{onlyUnseen ? "You’re all caught up." : "No videos yet. Subscribe to channels or playlists first."}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 w-full bg-background flex flex-col">
              <div className="aspect-video relative">
                <YTPlayer
                  ref={playerRef}
                  videoId={currentVideoId}
                  onVideoEnd={() => {
                    if (currentVideoId) clearPlaybackPosition(currentVideoId);
                    playNextVideoRef.current();
                  }}
                  forceReplay={false}
                  autoPlay={shouldAutoPlay}
                  startSeconds={startSeconds}
                />
              </div>
              {currentVideo && (
                <div className="mt-4 pb-4">
                  <h1
                    className="underline text-xl font-bold line-clamp-2 cursor-pointer hover:text-primary transition-colors block"
                    onClick={() => window.electron.openUrl(`https://www.youtube.com/watch?v=${currentVideoId}`)}
                  >
                    {currentVideo.title}
                  </h1>
                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap pr-2 select-text">
                      {isLoadingDescription ? (
                        <div className="flex items-center gap-2">
                          <Loader size={12} className="animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : description ? (
                        <VideoDescription
                          text={description}
                          onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
                        />
                      ) : (
                        "No description available"
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Sidebar side="right" className="border-l border-sidebar-border text-foreground">
        <SidebarContent className="bg-background gap-0 overflow-hidden">
          <div data-tauri-drag-region className="h-11 flex items-center justify-between sticky top-0 bg-background z-10 w-full border-b border-sidebar-border! shrink-0">
            <div className="flex flex-row justify-between w-full px-4 items-center gap-2">
              <h2 className="font-semibold truncate min-w-0">
                {title}
                {!isLoading && videos.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2 font-normal truncate">
                    {currentVideoId
                      ? `${videos.findIndex(v => v.id === currentVideoId) + 1} / ${videos.length}`
                      : `0 / ${videos.length}`}
                  </span>
                )}
              </h2>
              {onlyUnseen && unseenCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 shadow-none shrink-0 px-2 text-xs [app-region:no-drag] [-webkit-app-region:no-drag]"
                  onClick={handleMarkAllAsSeen}
                >
                  Mark as Seen
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 w-full bg-background">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-16 h-10 bg-muted rounded shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-0.5">
                {displayVideos.map((video) => (
                  <div
                    key={video.id}
                    id={`video-item-${video.id}`}
                    className={cn(
                      "flex items-start gap-2 w-full hover:bg-accent p-2 rounded group/video cursor-default",
                      currentVideoId === video.id && "bg-accent",
                      video.isSkipped && "opacity-50"
                    )}
                    onClick={() => {
                      switchVideo(video.id);
                      setShouldAutoPlay(true);
                      markVideoAsSeen(video.id);
                    }}
                  >
                    <div className="w-24 h-14 flex-none bg-muted rounded overflow-hidden relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {video.duration && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-white text-[9px] font-medium px-1 rounded-sm select-none">
                          {video.duration}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 user-select-none flex flex-col justify-between h-14" style={{ WebkitUserSelect: "none" }}>
                      <span className="line-clamp-2 text-sm leading-tight mb-0.5" title={video.title}>{video.title}</span>
                      <div className="flex items-center justify-between opacity-50 text-xs font-normal min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 mr-2 flex-1">
                          <span className="truncate">{video.publishedAt ? formatRelativeTime(video.publishedAt) : ""}</span>
                          {video.unseen && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-700 dark:bg-blue-200 shrink-0 mt-0.5" />
                          )}
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
            )}
          </div>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}
