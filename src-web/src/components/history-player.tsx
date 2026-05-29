import {
  cn,
  loadWatchHistory,
  clearWatchHistory,
  getVideoDescription,
  loadPlaybackPosition,
  savePlaybackPosition,
  clearPlaybackPosition,
} from "@/lib/utils";
import { WatchHistoryEntry } from "@/types";

import { Loader, Trash2 } from "lucide-react";

import { useState, useRef, useEffect } from "react";
import Nav from "./nav";
import YTPlayer, { YTPlayerHandle } from "./yt-player";
import { SidebarProvider, Sidebar, SidebarContent, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { PanelRight } from "lucide-react";
import { UpdateIndicator } from "./update-indicator";
import { formatRelativeTime } from "@/lib/time-utils";

export default function HistoryPlayer() {
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [startSeconds, setStartSeconds] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState<string>("");
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);

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
    async function fetchHistory() {
      setIsLoading(true);
      const data = await loadWatchHistory();
      setHistory(data);
      if (data.length > 0 && !currentVideoId) {
        await switchVideo(data[0].videoId);
      }
      setIsLoading(false);
    }
    fetchHistory();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const data = await loadWatchHistory();
        setHistory(data);
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
      if (history.length === 0) return;
      const idx = history.findIndex(e => e.videoId === currentVideoId);
      const nextIdx = idx + 1;
      if (nextIdx < history.length) {
        switchVideo(history[nextIdx].videoId);
        setShouldAutoPlay(true);
      }
    };
  }, [currentVideoId, history]);

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

  const handleClearHistory = async () => {
    const confirmed = await window.electron.confirm("Are you sure you want to clear all watch history?", {
      title: "Clear History",
      kind: "warning",
      okLabel: "Clear"
    });
    if (confirmed) {
      await clearWatchHistory();
      setHistory([]);
      setCurrentVideoId(null);
    }
  };

  const currentVideo = history.find(e => e.videoId === currentVideoId);

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
                <p>No watch history yet</p>
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
                      ) : (
                        description || "No description available"
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Sidebar side="right" className="border-l border-sidebar-border">
        <SidebarContent className="bg-background gap-0 overflow-hidden">
          <div data-tauri-drag-region className="h-11 flex items-center justify-between sticky top-0 bg-background z-10 w-full border-b border-sidebar-border! shrink-0">
            <div className="flex flex-row justify-between w-full px-4 items-center gap-2">
              <h2 className="font-semibold truncate min-w-0">
                History
                {!isLoading && history.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2 font-normal truncate">
                    {currentVideoId
                      ? `${history.findIndex(e => e.videoId === currentVideoId) + 1} / ${history.length}`
                      : `0 / ${history.length}`}
                  </span>
                )}
              </h2>
              {!isLoading && history.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleClearHistory}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 strokeWidth={1.5} size={18} />
                  </button>
                </div>
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
                {history.map((entry) => (
                  <div
                    key={entry.videoId}
                    id={`video-item-${entry.videoId}`}
                    className={cn(
                      "flex items-start gap-2 w-full hover:bg-accent p-2 rounded group/video cursor-default",
                      currentVideoId === entry.videoId && "bg-accent"
                    )}
                    onClick={() => {
                      switchVideo(entry.videoId);
                      setShouldAutoPlay(true);
                    }}
                  >
                    <div className="w-24 h-14 flex-none bg-muted rounded overflow-hidden relative">
                      <img
                        src={entry.thumbnail}
                        alt={entry.title}
                        className="w-full h-full object-cover"
                      />
                      {entry.duration && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-white text-[9px] font-medium px-1 rounded-sm select-none">
                          {entry.duration}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 user-select-none flex flex-col justify-between h-14" style={{ WebkitUserSelect: "none" }}>
                      <span className="line-clamp-2 text-sm leading-tight mb-0.5" title={entry.title}>{entry.title}</span>
                      <div className="flex items-center opacity-50 text-xs font-normal min-w-0">
                        <span className="truncate">{entry.watchedAt ? formatRelativeTime(entry.watchedAt) : ""}</span>
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
