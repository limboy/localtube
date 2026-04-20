import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useMatch, useLocation } from "@tanstack/react-router";
import { Plus, Loader, RefreshCw, List, CircleUserRound, Settings, Check, Monitor, Sun, Moon, SunMoon, Pin, PinOff, BookmarkIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import {
  removeBookmark,
  cn,
  addOrUpdatePlaylist,
  removePlaylist,
  isPlaylistUrl,
  isChannelUrl,
  removeChannel,
  markPlaylistAsRead,
  markChannelAsRead,
  addOrUpdateChannel,
  loadPlaylists,
  loadChannels,
  enrichBookmarks
} from "@/lib/utils";
import { PlaylistInfo, ChannelInfo, EnrichedBookmark } from "@/types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { checkAllPlaylistsForUpdates, parseYouTubePlaylist } from "@/lib/playlist-parser";
import { checkAllChannelsForUpdates, parseYouTubeChannel } from "@/lib/channel-parser";
// Tabs removed



interface PlaylistItemProps {
  playlist: PlaylistInfo;
  isActive: boolean;
  onPlaylistClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function PlaylistItem({ playlist, isActive, onPlaylistClick, onContextMenu }: PlaylistItemProps) {
  const [imgError, setImgError] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlaylistClick(playlist.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only prevent default for right-click (context menu)
    if (e.button === 2) {
      e.preventDefault();
    }
  };

  return (
    <SidebarMenuItem className="list-none w-full">
      <SidebarMenuButton key={playlist.id} asChild>
        <div
          className={cn(
            "pr-2 group/playlist w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
            isActive ? "bg-sidebar-accent" : ""
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
            <div className="flex items-center flex-1 gap-2">
              {playlist.thumbnail && !imgError ? (
                <img
                  src={playlist.thumbnail}
                  alt=""
                  className="w-5 h-5 rounded object-cover shrink-0"
                  onError={() => setImgError(true)}
                />
              ) : (
                <List size={16} className="shrink-0 text-muted-foreground" />
              )}
              <span className={cn(
                "line-clamp-1",
                playlist.unreadCount > 0 ? "font-bold" : "font-normal"
              )}>
                {playlist.title}
              </span>
            </div>
            <button
              onClick={handleClick}
              onContextMenu={(e) => onContextMenu(e, playlist.id)}
              className="absolute inset-0 w-full h-full bg-transparent pointer-events-auto"
            />
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface ChannelItemProps {
  channel: ChannelInfo;
  isActive: boolean;
  onChannelClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function ChannelItem({ channel, isActive, onChannelClick, onContextMenu }: ChannelItemProps) {
  const [imgError, setImgError] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChannelClick(channel.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only prevent default for right-click (context menu)
    if (e.button === 2) {
      e.preventDefault();
    }
  };

  return (
    <SidebarMenuItem className="list-none w-full">
      <SidebarMenuButton key={channel.id} asChild>
        <div
          className={cn(
            "pr-2 group/channel w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
            isActive ? "bg-sidebar-accent" : ""
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
            <div className="flex items-center flex-1 gap-2">
              {channel.thumbnail && !imgError ? (
                <img
                  src={channel.thumbnail}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                  onError={() => setImgError(true)}
                />
              ) : (
                <CircleUserRound size={16} className="shrink-0 text-muted-foreground" />
              )}
              <span className={cn(
                "line-clamp-1",
                channel.unreadCount > 0 ? "font-bold" : "font-normal"
              )}>
                {channel.title}
              </span>
            </div>
            <button
              onClick={handleClick}
              onContextMenu={(e) => onContextMenu(e, channel.id)}
              className="absolute inset-0 w-full h-full bg-transparent pointer-events-auto"
            />
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}



export default function AppSidebar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const { theme, setTheme } = useTheme();
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const alwaysOnTop = await window.electron.store.get<boolean>("alwaysOnTop");
      setIsAlwaysOnTop(!!alwaysOnTop);
    };
    loadSettings();
  }, []);

  const toggleAlwaysOnTop = async () => {
    const nextValue = !isAlwaysOnTop;
    setIsAlwaysOnTop(nextValue);
    await window.electron.setAlwaysOnTop(nextValue);
  };


  const [refreshingPlaylists, setRefreshingPlaylists] = useState(false);
  const [refreshingChannels, setRefreshingChannels] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number, total: number } | null>(null);
  const [playlistOrChannelUrl, setPlaylistOrChannelUrl] = useState("");
  const [addingPlaylistOrChannel, setAddingPlaylistOrChannel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [bookmarks, setBookmarks] = useState<EnrichedBookmark[]>([]);
  const lastCheckTimeRef = useRef<number>(Date.now());

  // Tabs effect removed

  const checkUpdatesIfNeeded = async () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (now - lastCheckTimeRef.current < oneHour) {
      return;
    }
    lastCheckTimeRef.current = now;

    const actualPlaylists = await loadPlaylists();
    const actualChannels = await loadChannels();
    const totalCount = actualPlaylists.length + actualChannels.length;

    if (totalCount === 0) return;

    setRefreshingPlaylists(true);
    setRefreshingChannels(true);
    setRefreshProgress(null);

    try {
      await checkAllPlaylistsForUpdates((current) => {
        setRefreshProgress({ current, total: totalCount });
      });

      const playlistsData = await loadPlaylists();
      setPlaylists(playlistsData);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingPlaylists(false);

      await checkAllChannelsForUpdates((current) => {
        setRefreshProgress({ current: actualPlaylists.length + current, total: totalCount });
      });

      const channelsData = await loadChannels();
      setChannels(channelsData);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingChannels(false);
    } catch (e) {
      setRefreshingPlaylists(false);
      setRefreshingChannels(false);
    } finally {
      setRefreshProgress(null);
    }
  };

  const refreshSidebarData = async () => {
    try {
      // Load everything and update locally
      const pData = await loadPlaylists();
      setPlaylists(pData);

      const cData = await loadChannels();
      setChannels(cData);

      // Pass the already loaded/synced data to avoid redundant store gets
      const actualP = pData;
      const actualC = cData;
      const bData = await enrichBookmarks(actualP, actualC);
      setBookmarks(bData);
    } catch (e) {
      console.error("Failed to refresh sidebar data:", e);
    }
  };

  useEffect(() => {
    const focusHandler = () => {
      checkUpdatesIfNeeded();
      refreshSidebarData();
    };

    const unlistenFocus = window.electron.onWindowFocus(focusHandler);

    const unlistenMenu = window.electron.onMenuEvent(async (eventId) => {
      if (eventId.startsWith("view-playlist-in-browser-")) {
        const playlistId = eventId.replace("view-playlist-in-browser-", "");
        await window.electron.openUrl(`https://www.youtube.com/playlist?list=${playlistId}`);
      } else if (eventId.startsWith("view-channel-in-browser-")) {
        const channelId = eventId.replace("view-channel-in-browser-", "");
        await window.electron.openUrl(`https://www.youtube.com/channel/${channelId}`);
      } else if (eventId.startsWith("delete-playlist-")) {
        const playlistId = eventId.replace("delete-playlist-", "");
        const confirmed = await window.electron.confirm("Are you sure to delete this playlist?", {
          title: "Delete Playlist",
          kind: "warning",
          okLabel: "Delete"
        });
        if (confirmed) {
          await removePlaylist(playlistId);
          const updatedPlaylists = await loadPlaylists();
          setPlaylists(updatedPlaylists);

          const actualPlaylists = updatedPlaylists;
          if (playlistMatch?.params.playlistId === playlistId && actualPlaylists.length > 0) {
            handlePlaylistClick(actualPlaylists[0].id);
          }
          if (actualPlaylists.length === 0) {
            navigate({ to: '/playlist' });
          }
        }
      } else if (eventId.startsWith("delete-channel-")) {
        const channelId = eventId.replace("delete-channel-", "");
        const confirmed = await window.electron.confirm("Are you sure to delete this channel?", {
          title: "Delete Channel",
          kind: "warning",
          okLabel: "Delete"
        });
        if (confirmed) {
          await removeChannel(channelId);
          const updatedChannels = await loadChannels();
          setChannels(updatedChannels);

          const actualChannels = updatedChannels;
          if (channelMatch?.params.channelId === channelId && actualChannels.length > 0) {
            await handleChannelClick(actualChannels[0].id);
          }
          if (actualChannels.length === 0) {
            navigate({ to: '/channel' });
          }
        }

      }
    });

    return () => {
      unlistenFocus();
      unlistenMenu();
    };
  }, [playlists]);

  useEffect(() => {
    refreshSidebarData();

    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      // Debounce updates to avoid rapid re-renders during batch sync
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        refreshSidebarData();
      }, 50);
    };
    window.addEventListener('store-updated', handleUpdate);
    return () => {
      window.removeEventListener('store-updated', handleUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (playlists.length > 0 || channels.length > 0) {
      if (location.pathname === '/' || location.pathname === '/playlist' || location.pathname === '/channel') {
        const firstPlaylist = playlists[0];
        const firstChannel = channels[0];
        if (firstPlaylist) {
          handlePlaylistClick(firstPlaylist.id);
          hasLoadedRef.current = true;
        } else if (firstChannel) {
          handleChannelClick(firstChannel.id);
          hasLoadedRef.current = true;
        }
      }
    }
  }, [playlists, channels, location.pathname]);



  async function playlistClickHandler(event: React.MouseEvent, playlistId: string) {
    event.preventDefault();
    try {
      await window.electron.showContextMenu([
        { id: `view-playlist-in-browser-${playlistId}`, label: "View In Browser" },
        { type: "separator" },
        { id: `delete-playlist-${playlistId}`, label: "Delete" }
      ]);
    } catch (error) {
      console.error("Error creating playlist context menu:", error);
    }
  }

  const handleAddPlaylistOrChannel = async () => {
    if (!playlistOrChannelUrl) return;
    setAddingPlaylistOrChannel(true);
    setError(null);
    try {
      const isPlaylist = isPlaylistUrl(playlistOrChannelUrl);
      const isChannel = isChannelUrl(playlistOrChannelUrl);

      if (!isPlaylist && !isChannel) {
        throw new Error("Invalid URL. Please provide a valid YouTube playlist or channel URL.");
      }

      if (isPlaylist) {
        const playlist = await parseYouTubePlaylist(playlistOrChannelUrl);
        await addOrUpdatePlaylist(playlist);

        await refreshSidebarData();

        setOpen(false);
        setPlaylistOrChannelUrl("");
        setAddingPlaylistOrChannel(false);
        navigate({
          to: "/playlist/$playlistId",
          params: { playlistId: playlist.id },
          search: { autoPlay: false }
        });
      } else {
        const channel = await parseYouTubeChannel(playlistOrChannelUrl);
        await addOrUpdateChannel(channel);

        await refreshSidebarData();

        setOpen(false);
        setPlaylistOrChannelUrl("");
        setAddingPlaylistOrChannel(false);
        navigate({
          to: "/channel/$channelId",
          params: { channelId: channel.id },
          search: { autoPlay: false }
        });
      }
    } catch (error) {
      setError((error as Error).message);
      setAddingPlaylistOrChannel(false);
      return;
    }
  };

  const handlePlaylistClick = async (playlistId: string, fromBookmarks = false) => {
    await markPlaylistAsRead(playlistId);
    const newPlaylists = await loadPlaylists();
    setPlaylists(newPlaylists);
    navigate({
      to: "/playlist/$playlistId",
      params: { playlistId },
      search: { showBookmarkedOnly: fromBookmarks, autoPlay: false }
    });
  };

  const playlistMatch = useMatch({
    from: "/playlist/$playlistId",
    shouldThrow: false
  });

  const channelMatch = useMatch({
    from: "/channel/$channelId",
    shouldThrow: false
  });

  const bookmarkMatch = useMatch({
    from: "/bookmarks",
    shouldThrow: false
  });

  // Redundant bookmarkMatch effect removed

  const handleChannelClick = async (channelId: string, fromBookmarks = false) => {
    await markChannelAsRead(channelId);
    const newChannels = await loadChannels();
    setChannels(newChannels);
    navigate({
      to: "/channel/$channelId",
      params: { channelId },
      search: { showBookmarkedOnly: fromBookmarks, autoPlay: false }
    });
  };

  async function channelClickHandler(event: React.MouseEvent, channelId: string) {
    event.preventDefault();
    try {
      await window.electron.showContextMenu([
        { id: `view-channel-in-browser-${channelId}`, label: "View In Browser" },
        { type: "separator" },
        { id: `delete-channel-${channelId}`, label: "Delete" }
      ]);
    } catch (error) {
      console.error("Error creating channel context menu:", error);
    }
  }





  const handleRemoveBookmark = async (videoId: string) => {
    await removeBookmark(videoId);
    await refreshSidebarData();
  };


  const handleRefreshAll = async () => {
    const pItemsCount = playlists.length;
    const cItemsCount = channels.length;
    const totalCount = pItemsCount + cItemsCount;

    setRefreshingPlaylists(true);
    setRefreshingChannels(true);
    setRefreshProgress(null);

    try {
      await checkAllPlaylistsForUpdates((current) => {
        setRefreshProgress({ current, total: totalCount });
      });
      const newPlaylists = await loadPlaylists();
      setPlaylists(newPlaylists);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingPlaylists(false);

      await checkAllChannelsForUpdates((current) => {
        setRefreshProgress({ current: pItemsCount + current, total: totalCount });
      });
      const newChannels = await loadChannels();
      setChannels(newChannels);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingChannels(false);

      await refreshSidebarData();
    } catch (e) {
      console.error("Refresh all failed", e);
      setRefreshingPlaylists(false);
      setRefreshingChannels(false);
    } finally {
      setRefreshProgress(null);
    }
  };


  return (
    <>
      <Sidebar className="h-full">
        <SidebarContent className="h-full">
          <SidebarGroup className="h-full pr-0">
            <SidebarGroupContent className="h-full flex flex-col" >
              <div data-tauri-drag-region className="-mx-2 flex items-center justify-between shrink-0">
                <div className="flex items-center">
                  <div className="w-26 shrink-0" />
                </div>
                <div className="flex items-center">
                  {(playlists.length > 0 || channels.length > 0) ? (
                    <Tooltip open={(refreshingPlaylists || refreshingChannels) ? false : undefined}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "mr-2",
                            (refreshingPlaylists || refreshingChannels)
                              ? "opacity-50 cursor-default"
                              : "btn-icon"
                          )}
                        >
                          <button
                            onClick={handleRefreshAll}
                            onPointerDown={(e) => e.preventDefault()}
                            disabled={refreshingPlaylists || refreshingChannels}
                            className={cn(
                              "flex items-center justify-center h-full w-full",
                              (refreshingPlaylists || refreshingChannels) && "pointer-events-none"
                            )}
                          >
                            {(refreshingPlaylists || refreshingChannels) ? (
                              <div className="flex items-center gap-1">
                                {refreshProgress && (
                                  <span className="text-xs">{refreshProgress.current}/{refreshProgress.total}</span>
                                )}
                                <Loader size={14} className="animate-spin" />
                              </div>
                            ) : (
                              <RefreshCw size={18} strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Refresh All
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  <Dialog
                    open={open}
                    onOpenChange={(isOpen) => {
                      if (addingPlaylistOrChannel) return;
                      setOpen(isOpen);
                    }}
                  >
                    <DialogTrigger className="focus-visible:ring-0 focus-visible:outline-none mr-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn("btn-icon")}>
                            <Plus size={18} strokeWidth={1.5} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Add YouTube Playlist or Channel</TooltipContent>
                      </Tooltip>
                    </DialogTrigger>
                    <DialogContent forceMount showCloseButton={false}>
                      <DialogHeader>
                        <DialogTitle className="text-foreground">
                          Add YouTube Playlist or Channel
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter YouTube playlist or channel URL"
                            className="flex-1 bg-muted focus-visible:ring-0 text-foreground"
                            value={playlistOrChannelUrl}
                            onChange={(e) => {
                              setPlaylistOrChannelUrl(e.target.value);
                              setError(null);
                            }}
                            disabled={addingPlaylistOrChannel}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (
                                  !addingPlaylistOrChannel &&
                                  playlistOrChannelUrl &&
                                  (isPlaylistUrl(playlistOrChannelUrl) ||
                                    isChannelUrl(playlistOrChannelUrl))
                                ) {
                                  handleAddPlaylistOrChannel();
                                }
                              }
                            }}
                          />
                          <Button
                            className="w-12"
                            onClick={handleAddPlaylistOrChannel}
                            disabled={
                              addingPlaylistOrChannel ||
                              !playlistOrChannelUrl ||
                              !(
                                isPlaylistUrl(playlistOrChannelUrl) ||
                                isChannelUrl(playlistOrChannelUrl)
                              )
                            }
                          >
                            {addingPlaylistOrChannel ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                        {error && <div className="text-sm text-red-500">{error}</div>}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="mt-1 flex-1 flex flex-col min-h-0 select-none overflow-y-auto sidebar-menu">
                <SidebarGroup className="py-0">
                  <SidebarGroupLabel className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Collections
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="pr-2">
                      {playlists.map((playlist) => (
                        <PlaylistItem
                          key={playlist.id}
                          playlist={playlist}
                          isActive={playlistMatch?.params.playlistId === playlist.id}
                          onPlaylistClick={handlePlaylistClick}
                          onContextMenu={playlistClickHandler}
                        />
                      ))}
                      {channels.map((channel) => (
                        <ChannelItem
                          key={channel.id}
                          channel={channel}
                          isActive={channelMatch?.params.channelId === channel.id}
                          onChannelClick={handleChannelClick}
                          onContextMenu={channelClickHandler}
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                {bookmarks.length > 0 && (
                  <>
                    <SidebarSeparator className="my-2" />

                    <SidebarGroup className="py-0">
                      <SidebarGroupLabel className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Bookmarks
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu className="pr-2">
                          {/* Bookmarks content ... */}
                          {bookmarks.map((bookmark) => {
                            const searchParams = new URLSearchParams(location.search);
                            const activeBookmarkVideoId = searchParams.get('videoId');
                            const isActive = bookmarkMatch && activeBookmarkVideoId === bookmark.id;

                            return (
                              <SidebarMenuItem key={bookmark.id} className="group/bookmark list-none">
                                <SidebarMenuButton
                                  asChild
                                  className={cn(
                                    "pr-2 h-auto py-2 w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0",
                                    isActive ? "bg-sidebar-accent" : ""
                                  )}
                                >
                                  <div
                                    onClick={() => navigate({ to: '/bookmarks', search: { videoId: bookmark.id } })}
                                    className="flex items-start gap-2 w-full cursor-default"
                                  >
                                    <div className="w-16 h-10 flex-none bg-muted rounded overflow-hidden">
                                      {bookmark.thumbnail && (
                                        <img
                                          src={bookmark.thumbnail}
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="line-clamp-1 leading-tight mb-0.5">
                                        {bookmark.title}
                                      </span>
                                      <div className="flex items-center justify-between opacity-50 text-sm font-normal">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="truncate max-w-20">
                                            {bookmark.data?.title}
                                          </span>
                                          {bookmark.duration && (
                                            <>
                                              <span>•</span>
                                              <span>{bookmark.duration}</span>
                                            </>
                                          )}
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveBookmark(bookmark.id);
                                          }}
                                          className="p-0.5 rounded hover:bg-accent-foreground/20 transition-opacity"
                                        >
                                          <BookmarkIcon size={14} fill="currentColor" strokeWidth={1.5} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="w-full justify-start hover:bg-sidebar-accent text-sidebar-foreground">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-56">
                  <DropdownMenuItem onClick={toggleAlwaysOnTop} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {isAlwaysOnTop ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                      <span>{isAlwaysOnTop ? "Unpin from Top" : "Pin to Top"}</span>
                    </div>
                    {isAlwaysOnTop && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center">
                      <SunMoon className="mr-2 h-4 w-4" />
                      <span>Switch theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Monitor className="mr-2 h-4 w-4" />
                            <span>System</span>
                          </div>
                          {theme === "system" && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Light</span>
                          </div>
                          {theme === "light" && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Dark</span>
                          </div>
                          {theme === "dark" && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}
