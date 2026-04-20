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
import { Plus, Loader, RefreshCw, List, CircleUserRound, Bookmark, Settings, Check, Monitor, Sun, Moon, SunMoon, Pin, PinOff, BookmarkOff } from "lucide-react";
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
  enrichBookmarks,
  savePlaylistsWithDividers,
  saveChannelsWithDividers,
  addDividerAfterItem,
  removeDivider,
  initializePlaylistsWithDividers,
  initializeChannelsWithDividers,
  syncPlaylistsWithDividers,
  syncChannelsWithDividers,
  isDivider
} from "@/lib/utils";
import { PlaylistInfo, ChannelInfo, EnrichedBookmark, SidebarItem } from "@/types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { checkAllPlaylistsForUpdates, parseYouTubePlaylist } from "@/lib/playlist-parser";
import { checkAllChannelsForUpdates, parseYouTubeChannel } from "@/lib/channel-parser";
// Tabs removed
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface SortablePlaylistItemProps {
  playlist: PlaylistInfo;
  isActive: boolean;
  onPlaylistClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function SortablePlaylistItem({ playlist, isActive, onPlaylistClick, onContextMenu }: SortablePlaylistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            "pr-2 group/playlist w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
            isActive ? "bg-sidebar-accent" : ""
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
            <div className="flex items-center flex-1 gap-2">
              {playlist.thumbnail ? (
                <img
                  src={playlist.thumbnail}
                  alt=""
                  className="w-5 h-5 rounded object-cover shrink-0"
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

interface SortableChannelItemProps {
  channel: ChannelInfo;
  isActive: boolean;
  onChannelClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function SortableChannelItem({ channel, isActive, onChannelClick, onContextMenu }: SortableChannelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            "pr-2 group/channel w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
            isActive ? "bg-sidebar-accent" : ""
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
            <div className="flex items-center flex-1 gap-2">
              {channel.thumbnail ? (
                <img
                  src={channel.thumbnail}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover shrink-0"
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

interface SortableDividerItemProps {
  dividerId: string;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function SortableDividerItem({ dividerId, onContextMenu }: SortableDividerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dividerId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => onContextMenu(e, dividerId)}
      className="pr-2 w-full cursor-default shrink-0 mb-0.5 py-1 flex items-center justify-center group/divider"
    >
      <div className="w-full h-px bg-sidebar-border" />
    </div>
  );
}

export default function AppSidebar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<SidebarItem[]>([]);
  const [channels, setChannels] = useState<SidebarItem[]>([]);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [refreshingPlaylists, setRefreshingPlaylists] = useState(false);
  const [refreshingChannels, setRefreshingChannels] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number, total: number } | null>(null);
  const [playlistOrChannelUrl, setPlaylistOrChannelUrl] = useState("");
  const [addingPlaylistOrChannel, setAddingPlaylistOrChannel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [bookmarks, setBookmarks] = useState<EnrichedBookmark[]>([]);
  const lastCheckTimeRef = useRef<number>(0);

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

      const playlistsData = await syncPlaylistsWithDividers();
      setPlaylists(playlistsData);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingPlaylists(false);

      await checkAllChannelsForUpdates((current) => {
        setRefreshProgress({ current: actualPlaylists.length + current, total: totalCount });
      });

      const channelsData = await syncChannelsWithDividers();
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

  const loadPlaylistsData = async () => {
    try {
      await initializePlaylistsWithDividers();
      const playlistsData = await syncPlaylistsWithDividers();
      setPlaylists(playlistsData);
    } catch (e) {}
  };

  const loadChannelsData = async () => {
    try {
      await initializeChannelsWithDividers();
      const channelsData = await syncChannelsWithDividers();
      setChannels(channelsData);
    } catch (e) {}
  };

  const loadBookmarksData = async () => {
    try {
      const bookmarksData = await enrichBookmarks();
      setBookmarks(bookmarksData);
    } catch (e) {}
  };

  useEffect(() => {
    checkUpdatesIfNeeded();

    const unlistenFocus = window.electron.onWindowFocus(() => {
      checkUpdatesIfNeeded();
      loadPlaylistsData();
      loadChannelsData();
      loadBookmarksData();
    });

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
          const updatedPlaylists = await syncPlaylistsWithDividers();
          setPlaylists(updatedPlaylists);

          const actualPlaylists = updatedPlaylists.filter(item => !isDivider(item)) as PlaylistInfo[];
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
          const updatedChannels = await syncChannelsWithDividers();
          setChannels(updatedChannels);

          const actualChannels = updatedChannels.filter(item => !isDivider(item)) as ChannelInfo[];
          if (channelMatch?.params.channelId === channelId && actualChannels.length > 0) {
            await handleChannelClick(actualChannels[0].id);
          }
          if (actualChannels.length === 0) {
            navigate({ to: '/channel' });
          }
        }
      } else if (eventId.startsWith("add-divider-playlist-")) {
        const playlistId = eventId.replace("add-divider-playlist-", "");
        await addDividerAfterItem(playlistId, 'playlist');
        await loadPlaylistsData();
      } else if (eventId.startsWith("add-divider-channel-")) {
        const channelId = eventId.replace("add-divider-channel-", "");
        await addDividerAfterItem(channelId, 'channel');
        await loadChannelsData();
      } else if (eventId.startsWith("delete-divider-")) {
        const dividerId = eventId.replace("delete-divider-", "");
        const isPlaylistDivider = playlists.some(item => isDivider(item) && item.id === dividerId);
        if (isPlaylistDivider) {
          await removeDivider(dividerId, 'playlist');
          await loadPlaylistsData();
        } else {
          await removeDivider(dividerId, 'channel');
          await loadChannelsData();
        }
      }
    });

    return () => {
      unlistenFocus();
      unlistenMenu();
    };
  }, [playlists]);

  useEffect(() => {
    loadPlaylistsData();
    loadChannelsData();
    loadBookmarksData();
  }, []);

  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (playlists.length > 0 || channels.length > 0) {
      if (location.pathname === '/' || location.pathname === '/playlist' || location.pathname === '/channel') {
        const firstPlaylist = playlists.find(item => !isDivider(item)) as PlaylistInfo | undefined;
        const firstChannel = channels.find(item => !isDivider(item)) as ChannelInfo | undefined;
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

  const handleRefreshPlaylists = () => {
    setRefreshingPlaylists(true);
    setRefreshProgress(null);
    checkAllPlaylistsForUpdates((current, total) => {
      setRefreshProgress({ current, total });
    })
      .then(async () => {
        const newPlaylists = await syncPlaylistsWithDividers();
        setPlaylists(newPlaylists);
        window.dispatchEvent(new CustomEvent('store-updated'));
        setRefreshingPlaylists(false);
        setRefreshProgress(null);
      })
      .catch(() => {
        setRefreshingPlaylists(false);
        setRefreshProgress(null);
      });
  };

  const handleRefreshChannels = () => {
    setRefreshingChannels(true);
    setRefreshProgress(null);
    checkAllChannelsForUpdates((current, total) => {
      setRefreshProgress({ current, total });
    })
      .then(async () => {
        const newChannels = await syncChannelsWithDividers();
        setChannels(newChannels);
        window.dispatchEvent(new CustomEvent('store-updated'));
        setRefreshingChannels(false);
        setRefreshProgress(null);
      })
      .catch(() => {
        setRefreshingChannels(false);
        setRefreshProgress(null);
      });
  };

  async function playlistClickHandler(event: React.MouseEvent, playlistId: string) {
    event.preventDefault();
    try {
      await window.electron.showContextMenu([
        { id: `view-playlist-in-browser-${playlistId}`, label: "View In Browser" },
        { type: "separator" },
        { id: `add-divider-playlist-${playlistId}`, label: "Add Divider" },
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

        await loadPlaylistsData();

        setOpen(false);
        setPlaylistOrChannelUrl("");
        setAddingPlaylistOrChannel(false);
        navigate({
          to: "/playlist/$playlistId",
          params: { playlistId: playlist.id }
        });
      } else {
        const channel = await parseYouTubeChannel(playlistOrChannelUrl);
        await addOrUpdateChannel(channel);

        await loadChannelsData();

        setOpen(false);
        setPlaylistOrChannelUrl("");
        setAddingPlaylistOrChannel(false);
        navigate({
          to: "/channel/$channelId",
          params: { channelId: channel.id }
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
    const newPlaylists = await syncPlaylistsWithDividers();
    setPlaylists(newPlaylists);
    navigate({
      to: "/playlist/$playlistId",
      params: { playlistId },
      search: { showBookmarkedOnly: fromBookmarks }
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
    const newChannels = await syncChannelsWithDividers();
    setChannels(newChannels);
    navigate({
      to: "/channel/$channelId",
      params: { channelId },
      search: { showBookmarkedOnly: fromBookmarks }
    });
  };

  async function channelClickHandler(event: React.MouseEvent, channelId: string) {
    event.preventDefault();
    try {
      await window.electron.showContextMenu([
        { id: `view-channel-in-browser-${channelId}`, label: "View In Browser" },
        { type: "separator" },
        { id: `add-divider-channel-${channelId}`, label: "Add Divider" },
        { type: "separator" },
        { id: `delete-channel-${channelId}`, label: "Delete" }
      ]);
    } catch (error) {
      console.error("Error creating channel context menu:", error);
    }
  }


  async function dividerClickHandler(event: React.MouseEvent, dividerId: string) {
    event.preventDefault();
    try {
      await window.electron.showContextMenu([
        { id: `delete-divider-${dividerId}`, label: "Delete" }
      ]);
    } catch (error) {
      console.error("Error creating divider context menu:", error);
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    if (playlists.some((item) => item.id === active.id)) {
      const oldIndex = playlists.findIndex((item) => item.id === active.id);
      const newIndex = playlists.findIndex((item) => item.id === over.id);

      const newPlaylists = arrayMove(playlists, oldIndex, newIndex);
      setPlaylists(newPlaylists);

      await savePlaylistsWithDividers(newPlaylists);
    } else if (channels.some((item) => item.id === active.id)) {
      const oldIndex = channels.findIndex((item) => item.id === active.id);
      const newIndex = channels.findIndex((item) => item.id === over.id);

      const newChannels = arrayMove(channels, oldIndex, newIndex);
      setChannels(newChannels);

      await saveChannelsWithDividers(newChannels);
    }
  };


  const handleRemoveBookmark = async (videoId: string) => {
    const confirmed = await window.electron.confirm("Are you sure to remove this bookmark?", {
      title: "Remove Bookmark",
      kind: "warning",
      okLabel: "Remove"
    });
    if (confirmed) {
      await removeBookmark(videoId);
      await loadBookmarksData();
    }
  };


  const handleRefreshAll = async () => {
    const pItemsCount = playlists.filter(p => !isDivider(p)).length;
    const cItemsCount = channels.filter(c => !isDivider(c)).length;
    const totalCount = pItemsCount + cItemsCount;

    setRefreshingPlaylists(true);
    setRefreshingChannels(true);
    setRefreshProgress(null);

    try {
      await checkAllPlaylistsForUpdates((current) => {
        setRefreshProgress({ current, total: totalCount });
      });
      const newPlaylists = await syncPlaylistsWithDividers();
      setPlaylists(newPlaylists);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingPlaylists(false);

      await checkAllChannelsForUpdates((current) => {
        setRefreshProgress({ current: pItemsCount + current, total: totalCount });
      });
      const newChannels = await syncChannelsWithDividers();
      setChannels(newChannels);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingChannels(false);

      await loadBookmarksData();
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
                  {(playlists.filter(item => !isDivider(item)).length > 0 || channels.filter(item => !isDivider(item)).length > 0) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleRefreshAll}
                          disabled={refreshingPlaylists || refreshingChannels}
                          className={cn(
                            "mr-2",
                            (refreshingPlaylists || refreshingChannels)
                              ? "cursor-default opacity-50"
                              : "btn-icon"
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
                      </TooltipTrigger>
                      {!(refreshingPlaylists || refreshingChannels) && (
                        <TooltipContent>
                          Refresh All
                        </TooltipContent>
                      )}
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
                       {/* Combined Playlists and Channels */}
                         <DndContext
                           sensors={sensors}
                           collisionDetection={closestCenter}
                           onDragEnd={handleDragEnd}
                         >
                           <SortableContext
                             items={playlists.map(p => p.id)}
                             strategy={verticalListSortingStrategy}
                           >
                             {playlists.map((item) => {
                               if (isDivider(item)) return <SortableDividerItem key={item.id} dividerId={item.id} onContextMenu={dividerClickHandler} />;
                               const playlist = item as PlaylistInfo;
                               return (
                                 <SortablePlaylistItem
                                   key={playlist.id}
                                   playlist={playlist}
                                   isActive={playlistMatch?.params.playlistId === playlist.id}
                                   onPlaylistClick={handlePlaylistClick}
                                   onContextMenu={playlistClickHandler}
                                 />
                               );
                             })}
                           </SortableContext>
                           <SortableContext
                             items={channels.map(c => c.id)}
                             strategy={verticalListSortingStrategy}
                           >
                             {channels.map((item) => {
                               if (isDivider(item)) return <SortableDividerItem key={item.id} dividerId={item.id} onContextMenu={dividerClickHandler} />;
                               const channel = item as ChannelInfo;
                               return (
                                 <SortableChannelItem
                                   key={channel.id}
                                   channel={channel}
                                   isActive={channelMatch?.params.channelId === channel.id}
                                   onChannelClick={handleChannelClick}
                                   onContextMenu={channelClickHandler}
                                 />
                               );
                             })}
                           </SortableContext>
                         </DndContext>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

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
                                          className="opacity-0 group-hover/bookmark:opacity-100 p-0.5 hover:bg-sidebar-border rounded flex-none transition-opacity ml-1"
                                        >
                                          <BookmarkOff size={14} className="hover:text-red-500 transition-colors" />
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
