import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
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
import { useNavigate, useMatch } from "@tanstack/react-router";
import { Plus, Loader, RefreshCw, List, CircleUserRound, Bookmark } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
        <SidebarMenuItem className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
          <div className="flex items-center flex-1">
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
        </SidebarMenuItem>
      </div>
    </SidebarMenuButton>
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
        <SidebarMenuItem className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
          <div className="flex items-center flex-1">
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
        </SidebarMenuItem>
      </div>
    </SidebarMenuButton>
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
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [refreshingPlaylists, setRefreshingPlaylists] = useState(false);
  const [refreshingChannels, setRefreshingChannels] = useState(false);
  const [playlistProgress, setPlaylistProgress] = useState<{ current: number, total: number } | null>(null);
  const [channelProgress, setChannelProgress] = useState<{ current: number, total: number } | null>(null);
  const [playlistOrChannelUrl, setPlaylistOrChannelUrl] = useState("");
  const [addingPlaylistOrChannel, setAddingPlaylistOrChannel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState("playlists");
  const [bookmarks, setBookmarks] = useState<EnrichedBookmark[]>([]);

  const checkUpdatesIfNeeded = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (now - lastCheckTimeRef.current < oneHour) {
      return;
    }
    lastCheckTimeRef.current = now;

    setRefreshingPlaylists(true);
    setRefreshingChannels(true);
    setPlaylistProgress(null);
    setChannelProgress(null);

    checkAllPlaylistsForUpdates((current, total) => {
      setPlaylistProgress({ current, total });
    })
      .then(async (playlistsUpdated) => {
        if (playlistsUpdated) {
          const newPlaylists = await syncPlaylistsWithDividers();
          setPlaylists(newPlaylists);
        }
        setRefreshingPlaylists(false);
        setPlaylistProgress(null);
      })
      .catch(() => {
        setRefreshingPlaylists(false);
        setPlaylistProgress(null);
      });

    checkAllChannelsForUpdates((current, total) => {
      setChannelProgress({ current, total });
    })
      .then(async (channelsUpdated) => {
        if (channelsUpdated) {
          const newChannels = await syncChannelsWithDividers();
          setChannels(newChannels);
        }
        setRefreshingChannels(false);
        setChannelProgress(null);
      })
      .catch(() => {
        setRefreshingChannels(false);
        setChannelProgress(null);
      });
  };

  const loadPlaylistsData = async () => {
    setLoadingPlaylists(true);
    try {
      await initializePlaylistsWithDividers();
      const playlistsData = await syncPlaylistsWithDividers();
      setPlaylists(playlistsData);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const loadChannelsData = async () => {
    setLoadingChannels(true);
    try {
      await initializeChannelsWithDividers();
      const channelsData = await syncChannelsWithDividers();
      setChannels(channelsData);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadBookmarksData = async () => {
    setLoadingBookmarks(true);
    try {
      const bookmarksData = await enrichBookmarks();
      setBookmarks(bookmarksData);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    checkUpdatesIfNeeded();

    const unlistenFocus = window.electron.onWindowFocus(() => {
      checkUpdatesIfNeeded();
      if (activeTab === 'playlists') {
        loadPlaylistsData();
      } else if (activeTab === 'channels') {
        loadChannelsData();
      } else if (activeTab === 'bookmarks') {
        loadBookmarksData();
      }
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
        if (activeTab === 'playlists') {
          await removeDivider(dividerId, 'playlist');
          await loadPlaylistsData();
        } else if (activeTab === 'channels') {
          await removeDivider(dividerId, 'channel');
          await loadChannelsData();
        }
      }
    });

    return () => {
      unlistenFocus();
      unlistenMenu();
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'playlists') {
      loadPlaylistsData();
    }
  }, []);

  const handleRefreshPlaylists = () => {
    setRefreshingPlaylists(true);
    setPlaylistProgress(null);
    checkAllPlaylistsForUpdates((current, total) => {
      setPlaylistProgress({ current, total });
    })
      .then(async (playlistsUpdated) => {
        if (playlistsUpdated) {
          const newPlaylists = await syncPlaylistsWithDividers();
          setPlaylists(newPlaylists);
        }
        setRefreshingPlaylists(false);
        setPlaylistProgress(null);
      })
      .catch(() => {
        setRefreshingPlaylists(false);
        setPlaylistProgress(null);
      });
  };

  const handleRefreshChannels = () => {
    setRefreshingChannels(true);
    setChannelProgress(null);
    checkAllChannelsForUpdates((current, total) => {
      setChannelProgress({ current, total });
    })
      .then(async (channelsUpdated) => {
        if (channelsUpdated) {
          const newChannels = await syncChannelsWithDividers();
          setChannels(newChannels);
        }
        setRefreshingChannels(false);
        setChannelProgress(null);
      })
      .catch(() => {
        setRefreshingChannels(false);
        setChannelProgress(null);
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
        if (activeTab !== 'playlists') {
          await handleTabChange('playlists');
        } else {
          const newPlaylists = await syncPlaylistsWithDividers();
          setPlaylists(newPlaylists);
        }
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
        if (activeTab !== 'channels') {
          await handleTabChange('channels');
        } else {
          const newChannels = await syncChannelsWithDividers();
          setChannels(newChannels);
        }
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

  useEffect(() => {
    if (bookmarkMatch) {
      loadBookmarksData();
    }
  }, [bookmarkMatch]);

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

    if (activeTab === 'playlists') {
      const oldIndex = playlists.findIndex((item) => item.id === active.id);
      const newIndex = playlists.findIndex((item) => item.id === over.id);

      const newPlaylists = arrayMove(playlists, oldIndex, newIndex);
      setPlaylists(newPlaylists);
      
      await savePlaylistsWithDividers(newPlaylists);
    } else if (activeTab === 'channels') {
      const oldIndex = channels.findIndex((item) => item.id === active.id);
      const newIndex = channels.findIndex((item) => item.id === over.id);

      const newChannels = arrayMove(channels, oldIndex, newIndex);
      setChannels(newChannels);
      
      await saveChannelsWithDividers(newChannels);
    }
  };


  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    if (value === 'playlists') {
      await loadPlaylistsData();
      const actualPlaylists = playlists.filter(item => !isDivider(item)) as PlaylistInfo[];
      if (actualPlaylists.length > 0) {
        // disable auto-selecting the first playlist
      }
      navigate({ to: '/playlist' });
    } else if (value === 'channels') {
      await loadChannelsData();
      const actualChannels = channels.filter(item => !isDivider(item)) as ChannelInfo[];
      if (actualChannels.length > 0) {
        // disable auto-selecting the first channel
      }
      navigate({ to: '/channel' });
    } else if (value === 'bookmarks') {
      await loadBookmarksData();
      navigate({ to: '/bookmarks' });
    }
  };

  const reduceBookmarks = (bookmarks: EnrichedBookmark[]) => {
    return bookmarks.reduce((acc, bookmark) => {
      const existing = acc.find(b => b.data?.id === bookmark.data?.id && b.type === bookmark.type);
      if (!existing) {
        acc.push(bookmark);
      }
      return acc;
    }, [] as EnrichedBookmark[]);
  };

  return (
    <>
        <Sidebar className="h-full">
          <SidebarContent className="h-full">
            <SidebarGroup className="h-full pr-0">
              <SidebarGroupContent className="h-full flex flex-col" >
                <div data-tauri-drag-region className="h-11 -m-2 flex items-center justify-end">
                  {(activeTab === 'playlists' && playlists.filter(item => !isDivider(item)).length > 0) || (activeTab === 'channels' && channels.filter(item => !isDivider(item)).length > 0) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={activeTab === 'playlists' ? handleRefreshPlaylists : handleRefreshChannels}
                          disabled={refreshingPlaylists || refreshingChannels}
                          className={cn(
                            "mr-1",
                            (refreshingPlaylists || refreshingChannels)
                              ? "cursor-default opacity-50"
                              : "btn-icon"
                          )}
                        >
                          {(activeTab === 'playlists' && refreshingPlaylists) || (activeTab === 'channels' && refreshingChannels) ? (
                            <div className="flex items-center gap-1">
                              {activeTab === 'playlists' && playlistProgress && (
                                <span className="text-xs">{playlistProgress.current}/{playlistProgress.total}</span>
                              )}
                              {activeTab === 'channels' && channelProgress && (
                                <span className="text-xs">{channelProgress.current}/{channelProgress.total}</span>
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
                          {activeTab === 'playlists' ? 'Refresh Playlists' : 'Refresh Channels'}
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
                    <DialogTrigger className="focus-visible:ring-0 focus-visible:outline-none mr-2">
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
                <div className="flex-1 flex flex-col min-h-0 select-none">
                  <SidebarMenu className="mt-1 pr-2 flex-1 overflow-y-auto sidebar-menu">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                      <TabsList className="sidebar-tabs-list">
                        <TabsTrigger
                          value="playlists"
                          className="sidebar-tab-trigger"
                        >
                          <span><List /></span>
                          <span>Playlists</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="channels"
                          className="sidebar-tab-trigger"
                        >
                          <span><CircleUserRound /></span>
                          <span>Channels</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="bookmarks"
                          className="sidebar-tab-trigger"
                        >
                          <span><Bookmark /></span>
                          <span>Bookmarks</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="playlists" className="m-0">
                        {loadingPlaylists ? (
                          <div className="flex items-center justify-center py-2">
                            {/* <Loader className="h-4 w-4 animate-spin" /> */}
                          </div>
                        ) : (
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
                                if (isDivider(item)) {
                                  return (
                                    <SortableDividerItem
                                      key={item.id}
                                      dividerId={item.id}
                                      onContextMenu={dividerClickHandler}
                                    />
                                  );
                                }
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
                          </DndContext>
                        )}
                      </TabsContent>

                      <TabsContent value="channels" className="m-0">
                        {loadingChannels ? (
                          <div className="flex items-center justify-center py-2">
                            {/* <Loader className="h-4 w-4 animate-spin" /> */}
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={channels.map(c => c.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {channels.map((item) => {
                                if (isDivider(item)) {
                                  return (
                                    <SortableDividerItem
                                      key={item.id}
                                      dividerId={item.id}
                                      onContextMenu={dividerClickHandler}
                                    />
                                  );
                                }
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
                        )}
                      </TabsContent>

                      <TabsContent value="bookmarks" className="m-0">
                        {loadingBookmarks ? (
                          <div className="flex items-center justify-center py-2">
                            {/* <Loader className="h-4 w-4 animate-spin" /> */}
                          </div>
                        ) : (
                          <>
                            {bookmarks.some(b => b.type === 'playlist') && (
                              <div className="mb-4">
                                <div className="text-xs text-sidebar-foreground/50 px-2 mt-1 mb-1">Playlists</div>
                                {reduceBookmarks(bookmarks)
                                  .filter(b => b.type === 'playlist')
                                  .map((bookmark) => (
                                    <SidebarMenuButton key={bookmark.id} asChild>
                                      <button
                                        onClick={() => handlePlaylistClick(bookmark.data!.id, true)}
                                        className={cn(
                                          "pr-2 group/bookmark w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
                                          playlistMatch?.params.playlistId === bookmark.data!.id ? "bg-sidebar-accent" : ""
                                        )}
                                      >
                                        <SidebarMenuItem className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
                                          <div className="flex items-center flex-1">
                                            <span className="line-clamp-1">{bookmark.title}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-xs text-sidebar-foreground/50 ml-2">
                                              {bookmarks.filter(b => b.type === 'playlist' && b.data?.id === bookmark.data!.id).length}
                                            </span>
                                          </div>
                                        </SidebarMenuItem>
                                      </button>
                                    </SidebarMenuButton>
                                  ))}
                              </div>
                            )}

                            {bookmarks.some(b => b.type === 'channel') && (
                              <div>
                                <div className="text-xs text-sidebar-foreground/50 px-2 mt-1 mb-1">Channels</div>
                                {reduceBookmarks(bookmarks)
                                  .filter(b => b.type === 'channel')
                                  .map((bookmark) => (
                                    <SidebarMenuButton key={bookmark.id} asChild>
                                      <button
                                        onClick={() => handleChannelClick(bookmark.data!.id, true)}
                                        className={cn(
                                          "pr-2 group/bookmark w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
                                          channelMatch?.params.channelId === bookmark.data!.id ? "bg-sidebar-accent" : ""
                                        )}
                                      >
                                        <SidebarMenuItem className="line-clamp-1 select-none flex items-center justify-between w-full flex-1">
                                          <div className="flex items-center flex-1">
                                            <span className="line-clamp-1">{bookmark.title}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-xs text-sidebar-foreground/50 ml-2">
                                              {bookmarks.filter(b => b.type === 'channel' && b.data?.id === bookmark.data!.id).length}
                                            </span>
                                          </div>
                                        </SidebarMenuItem>
                                      </button>
                                    </SidebarMenuButton>
                                  ))}
                              </div>
                            )}
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  </SidebarMenu>


                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </>
    );
  }
