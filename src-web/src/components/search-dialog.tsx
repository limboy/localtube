import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, List, CircleUserRound, BookmarkIcon } from "lucide-react";
import { cn, loadPlaylists, loadChannels, loadBookmarks } from "@/lib/utils";

interface SearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  sourceType: "playlist" | "channel" | "bookmark";
  sourceId: string;
  sourceTitle: string;
  sourceThumbnail?: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allItems, setAllItems] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadSearchData();
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const loadSearchData = async () => {
    const [playlists, channels, bookmarksMap] = await Promise.all([
      loadPlaylists(),
      loadChannels(),
      loadBookmarks(),
    ]);

    const items: SearchResult[] = [];
    const seen = new Set<string>();

    for (const playlist of playlists) {
      for (const video of playlist.items) {
        if (!seen.has(video.id)) {
          seen.add(video.id);
          items.push({
            videoId: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            sourceType: "playlist",
            sourceId: playlist.id,
            sourceTitle: playlist.title,
            sourceThumbnail: playlist.thumbnail,
          });
        }
      }
    }

    for (const channel of channels) {
      for (const video of channel.items) {
        if (!seen.has(video.id)) {
          seen.add(video.id);
          items.push({
            videoId: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            sourceType: "channel",
            sourceId: channel.id,
            sourceTitle: channel.title,
            sourceThumbnail: channel.thumbnail,
          });
        }
      }
    }

    for (const [id, bookmark] of bookmarksMap) {
      if (!seen.has(id) && bookmark.videoDetails) {
        seen.add(id);
        items.push({
          videoId: id,
          title: bookmark.videoDetails.title,
          thumbnail: bookmark.videoDetails.thumbnail,
          duration: bookmark.videoDetails.duration,
          sourceType: "bookmark",
          sourceId: id,
          sourceTitle: "Bookmarks",
        });
      }
    }

    setAllItems(items);
  };

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return allItems
      .filter((item) => {
        const text = `${item.title} ${item.sourceTitle}`.toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .slice(0, 50);
  }, [query, allItems]);

  useEffect(() => {
    setResults(filteredResults);
    setSelectedIndex(0);
  }, [filteredResults]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectResult = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      if (result.sourceType === "playlist") {
        navigate({
          to: "/playlist/$playlistId",
          params: { playlistId: result.sourceId },
          search: { videoId: result.videoId, autoPlay: false },
        });
      } else if (result.sourceType === "channel") {
        navigate({
          to: "/channel/$channelId",
          params: { channelId: result.sourceId },
          search: { videoId: result.videoId, autoPlay: false },
        });
      } else {
        navigate({
          to: "/bookmarks",
          search: { videoId: result.videoId },
        });
      }
    },
    [navigate, onOpenChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const SourceIcon = ({ type }: { type: SearchResult["sourceType"] }) => {
    if (type === "playlist") return <List size={12} className="shrink-0 text-muted-foreground" />;
    if (type === "channel") return <CircleUserRound size={12} className="shrink-0 text-muted-foreground" />;
    return <BookmarkIcon size={12} className="shrink-0 text-muted-foreground" />;
  };

  return (
    <div className="fixed inset-0 z-50" onClick={() => onOpenChange(false)}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-[560px] px-4">
        <div
          className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search videos..."
              className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {query.trim() && (
            <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                results.map((result, index) => (
                  <div
                    key={`${result.videoId}-${result.sourceId}`}
                    data-index={index}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 cursor-default transition-colors",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/50"
                    )}
                    onClick={() => selectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="relative w-16 h-9 shrink-0 bg-muted rounded overflow-hidden">
                      <img
                        src={result.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {result.duration && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-white text-[9px] font-medium px-1 rounded-sm select-none">
                          {result.duration}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm line-clamp-1">{result.title}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <SourceIcon type={result.sourceType} />
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {result.sourceTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
