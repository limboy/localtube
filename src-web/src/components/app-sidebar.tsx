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
  SidebarMenuBadge,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useMatch, useLocation } from "@tanstack/react-router";
import { Plus, Loader, RefreshCw, List, CircleUserRound, Settings, Check, Monitor, Sun, Moon, SunMoon, Pin, PinOff, BookmarkIcon, ChevronRight, Folder, FolderOpen, Search, History, Clock, Download, Upload } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
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
  cn,
  addOrUpdatePlaylist,
  removePlaylist,
  isPlaylistUrl,
  isChannelUrl,
  removeChannel,
  markPlaylistAsSeen,
  markChannelAsSeen,
  markFolderAsSeen,
  markAllUnseenAsSeen,
  addOrUpdateChannel,
  loadPlaylists,
  loadChannels,
  loadFolders,
  loadSidebarOrder,
  createFolder,
  renameFolder,
  removeFolder,
  setFolderCollapsed,
  moveItemToFolder,
  moveItemToTopLevel,
  exportData,
  importData,
} from "@/lib/utils";
import { PlaylistInfo, ChannelInfo, FolderInfo, SidebarItem, VideoItem, RefreshFailure } from "@/types";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import { checkAllPlaylistsForUpdates, fullRefreshAllPlaylists, parseYouTubePlaylist } from "@/lib/playlist-parser";
import { checkAllChannelsForUpdates, fullRefreshAllChannels, parseYouTubeChannel } from "@/lib/channel-parser";
import { isVideoUrl, parseYouTubeVideo } from "@/lib/video-parser";
import { loadBookmarks, saveBookmarks } from "@/lib/utils";
import SearchDialog from "@/components/search-dialog";
import { toast } from "@/hooks/use-toast";
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
            "group/playlist w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
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
              <span className="line-clamp-1 font-normal">
                {playlist.title}
              </span>
            </div>
            <button
              onClick={handleClick}
              onContextMenu={(e) => onContextMenu(e, playlist.id)}
              className="absolute inset-0 w-full h-full bg-transparent pointer-events-auto focus:outline-none"
            />
          </div>
        </div>
      </SidebarMenuButton>
      {playlist.unreadCount > 0 && (
        <SidebarMenuBadge className="bg-transparent text-sidebar-foreground/50 mr-0.5">
          {playlist.unreadCount}
        </SidebarMenuBadge>
      )}
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
            "group/channel w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5",
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
              <span className="line-clamp-1 font-normal">
                {channel.title}
              </span>
            </div>
            <button
              onClick={handleClick}
              onContextMenu={(e) => onContextMenu(e, channel.id)}
              className="absolute inset-0 w-full h-full bg-transparent pointer-events-auto focus:outline-none"
            />
          </div>
        </div>
      </SidebarMenuButton>
      {channel.unreadCount > 0 && (
        <SidebarMenuBadge className="bg-transparent text-sidebar-foreground/50 mr-0.5">
          {channel.unreadCount}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}



interface FolderItemProps {
  folder: FolderInfo;
  children: React.ReactNode;
  unreadCount: number;
  onContextMenu: (e: React.MouseEvent, folderId: string) => void;
  onToggleCollapse: (folderId: string, collapsed: boolean) => void;
  renamingFolderId: string | null;
  onRenameCommit: (folderId: string, name: string) => void;
  onRenameCancel: () => void;
}

function FolderItem({ folder, children, unreadCount, onContextMenu, onToggleCollapse, renamingFolderId, onRenameCommit, onRenameCancel }: FolderItemProps) {
  const [renameValue, setRenameValue] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRenaming = renamingFolderId === folder.id;

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(folder.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isRenaming, folder.name]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRenameCommit(folder.id, trimmed);
    } else {
      onRenameCancel();
    }
  };

  return (
    <Collapsible open={!folder.isCollapsed} onOpenChange={(open) => onToggleCollapse(folder.id, !open)}>
      <SidebarMenuItem className="list-none w-full">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0 mb-0.5"
            onContextMenu={(e) => onContextMenu(e, folder.id)}
          >
            <ChevronRight size={14} className={cn("shrink-0 transition-transform duration-200", !folder.isCollapsed && "rotate-90")} />
            {folder.isCollapsed ? (
              <Folder size={16} className="shrink-0 text-muted-foreground" />
            ) : (
              <FolderOpen size={16} className="shrink-0 text-muted-foreground" />
            )}
            {isRenaming ? (
              <input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                  if (e.key === 'Escape') { e.preventDefault(); onRenameCancel(); }
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-transparent border-b border-foreground/30 outline-none text-sm py-0 px-0"
              />
            ) : (
              <span className="line-clamp-1 font-normal">{folder.name}</span>
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {!isRenaming && unreadCount > 0 && (
          <SidebarMenuBadge className="bg-transparent text-sidebar-foreground/50 mr-0.5">
            {unreadCount}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
      <CollapsibleContent>
        <SidebarMenu className="pl-6 pr-0">
          {children}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AppSidebar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [sidebarOrder, setSidebarOrder] = useState<SidebarItem[]>([]);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
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
      const pData = await loadPlaylists();
      setPlaylists(pData);

      const cData = await loadChannels();
      setChannels(cData);

      const fData = await loadFolders();
      setFolders(fData);

      const oData = await loadSidebarOrder();
      setSidebarOrder(oData);
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
      if (eventId === "mark-latest-seen") {
        await markAllUnseenAsSeen();
      } else if (eventId.startsWith("mark-playlist-seen-")) {
        const playlistId = eventId.replace("mark-playlist-seen-", "");
        await markPlaylistAsSeen(playlistId);
      } else if (eventId.startsWith("mark-channel-seen-")) {
        const channelId = eventId.replace("mark-channel-seen-", "");
        await markChannelAsSeen(channelId);
      } else if (eventId.startsWith("mark-folder-seen-")) {
        const folderId = eventId.replace("mark-folder-seen-", "");
        await markFolderAsSeen(folderId);
      } else if (eventId.startsWith("view-playlist-in-browser-")) {
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
      } else if (eventId === "new-folder") {
        handleNewFolder();
      } else if (eventId.startsWith("rename-folder-")) {
        const folderId = eventId.replace("rename-folder-", "");
        setRenamingFolderId(folderId);
      } else if (eventId.startsWith("delete-folder-")) {
        const folderId = eventId.replace("delete-folder-", "");
        const confirmed = await window.electron.confirm("Delete this folder? All playlists and channels inside it will also be deleted.", {
          title: "Delete Folder",
          kind: "warning",
          okLabel: "Delete"
        });
        if (confirmed) {
          await removeFolder(folderId);
          await refreshSidebarData();
        }
      } else if (eventId.startsWith("move-playlist-") || eventId.startsWith("move-channel-")) {
        const match = eventId.match(/^move-(playlist|channel)-(.+?)-to-(folder-(.+)|top-level)$/);
        if (match) {
          const itemType = match[1] as 'playlist' | 'channel';
          const itemId = match[2];
          const targetFolderId = match[4];
          if (targetFolderId) {
            await moveItemToFolder(itemId, itemType, targetFolderId);
          } else {
            await moveItemToTopLevel(itemId, itemType);
          }
          await refreshSidebarData();
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
    if (location.pathname === '/') {
      navigate({ to: '/latest' });
      hasLoadedRef.current = true;
      return;
    }
    if (sidebarOrder.length === 0) return;
    if (location.pathname === '/playlist' || location.pathname === '/channel') {
      let firstItem: { type: 'playlist' | 'channel'; id: string } | null = null;
      for (const entry of sidebarOrder) {
        if (entry.type === 'playlist' || entry.type === 'channel') {
          firstItem = entry;
          break;
        }
        if (entry.type === 'folder' && entry.children.length > 0) {
          firstItem = entry.children[0];
          break;
        }
      }
      if (firstItem?.type === 'playlist') {
        handlePlaylistClick(firstItem.id);
        hasLoadedRef.current = true;
      } else if (firstItem?.type === 'channel') {
        handleChannelClick(firstItem.id);
        hasLoadedRef.current = true;
      }
    }
  }, [sidebarOrder, location.pathname]);



  async function playlistClickHandler(event: React.MouseEvent, playlistId: string) {
    event.preventDefault();
    try {
      const menuItems: Array<{ id?: string; label?: string; type?: "normal" | "separator"; submenu?: Array<{ id?: string; label?: string; type?: "normal" | "separator" }> }> = [];
      menuItems.push({ id: "new-folder", label: "New Folder" });
      menuItems.push({ type: "separator" });
      if (folders.length > 0 || isItemInFolder(playlistId, 'playlist')) {
        menuItems.push({ label: "Move to Folder", submenu: buildMoveToFolderSubmenu(playlistId, 'playlist') });
        menuItems.push({ type: "separator" });
      }
      menuItems.push({ id: `mark-playlist-seen-${playlistId}`, label: "Mark as Seen" });
      menuItems.push({ type: "separator" });
      menuItems.push({ id: `view-playlist-in-browser-${playlistId}`, label: "View In Browser" });
      menuItems.push({ type: "separator" });
      menuItems.push({ id: `delete-playlist-${playlistId}`, label: "Delete" });
      await window.electron.showContextMenu(menuItems);
    } catch (error) {
      console.error("Error creating playlist context menu:", error);
    }
  }

  const handleAddPlaylistOrChannel = async () => {
    if (!playlistOrChannelUrl) return;
    setAddingPlaylistOrChannel(true);
    setError(null);
    try {
      let urlToParse = playlistOrChannelUrl.trim();
      if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
        urlToParse = 'https://' + urlToParse;
      }
      try {
        new URL(urlToParse);
      } catch {
        throw new Error("Please enter a valid URL.");
      }

      const isPlaylist = isPlaylistUrl(playlistOrChannelUrl);
      const isChannel = isChannelUrl(playlistOrChannelUrl);
      const isVideo = isVideoUrl(playlistOrChannelUrl);

      if (!isPlaylist && !isChannel && !isVideo) {
        throw new Error("Invalid URL. Please provide a valid YouTube playlist, channel, or video URL.");
      }

      if (isPlaylist) {
        const playlistId = new URL(urlToParse).searchParams.get("list");
        if (playlistId) {
          const existingPlaylists = await loadPlaylists();
          const existing = existingPlaylists.find(p => p.id === playlistId);
          if (existing) {
            throw new Error(`Playlist "${existing.title}" is already in your library.`);
          }
        }

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
      } else if (isVideo) {
        const video = await parseYouTubeVideo(playlistOrChannelUrl);
        const currentBookmarks = await loadBookmarks();
        currentBookmarks.set(video.id, {
          createdAt: Date.now(),
          videoDetails: video
        });
        await saveBookmarks(currentBookmarks);

        await refreshSidebarData();

        setOpen(false);
        setPlaylistOrChannelUrl("");
        setAddingPlaylistOrChannel(false);
        navigate({
          to: "/bookmarks",
          search: { videoId: video.id }
        });
      } else if (isChannel) {
        const directMatch = urlToParse.match(/\/channel\/(UC[\w-]+)/);
        if (directMatch) {
          const existingChannels = await loadChannels();
          const existing = existingChannels.find(c => c.id === directMatch[1]);
          if (existing) {
            throw new Error(`Channel "${existing.title}" is already in your library.`);
          }
        }

        const channel = await parseYouTubeChannel(playlistOrChannelUrl);

        if (!directMatch) {
          const existingChannels = await loadChannels();
          const existing = existingChannels.find(c => c.id === channel.id);
          if (existing) {
            throw new Error(`Channel "${existing.title}" is already in your library.`);
          }
        }

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

  const historyMatch = useMatch({
    from: "/history",
    shouldThrow: false
  });

  const latestMatch = useMatch({
    from: "/latest",
    shouldThrow: false
  });



  const handleChannelClick = async (channelId: string, fromBookmarks = false) => {
    navigate({
      to: "/channel/$channelId",
      params: { channelId },
      search: { showBookmarkedOnly: fromBookmarks, autoPlay: false }
    });
  };

  async function channelClickHandler(event: React.MouseEvent, channelId: string) {
    event.preventDefault();
    try {
      const menuItems: Array<{ id?: string; label?: string; type?: "normal" | "separator"; submenu?: Array<{ id?: string; label?: string; type?: "normal" | "separator" }> }> = [];
      menuItems.push({ id: "new-folder", label: "New Folder" });
      menuItems.push({ type: "separator" });
      if (folders.length > 0 || isItemInFolder(channelId, 'channel')) {
        menuItems.push({ label: "Move to Folder", submenu: buildMoveToFolderSubmenu(channelId, 'channel') });
        menuItems.push({ type: "separator" });
      }
      menuItems.push({ id: `mark-channel-seen-${channelId}`, label: "Mark as Seen" });
      menuItems.push({ type: "separator" });
      menuItems.push({ id: `view-channel-in-browser-${channelId}`, label: "View In Browser" });
      menuItems.push({ type: "separator" });
      menuItems.push({ id: `delete-channel-${channelId}`, label: "Delete" });
      await window.electron.showContextMenu(menuItems);
    } catch (error) {
      console.error("Error creating channel context menu:", error);
    }
  }







  const playlistsMap = useMemo(() => new Map(playlists.map(p => [p.id, p])), [playlists]);
  const channelsMap = useMemo(() => new Map(channels.map(c => [c.id, c])), [channels]);
  const foldersMap = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);

  // Count of unseen videos among the videos the Latest view actually shows: the
  // same dedupe + sort-by-date + cap as loadLatestVideos, so old videos from a
  // stale channel that fall outside the list don't inflate the badge.
  const latestUnreadCount = useMemo(() => {
    const seen = new Set<string>();
    const allVideos: VideoItem[] = [];
    for (const source of [...channels, ...playlists]) {
      for (const v of source.items) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        allVideos.push(v);
      }
    }
    allVideos.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    return allVideos.slice(0, 100).filter((v) => v.unseen).length;
  }, [channels, playlists]);



  async function latestContextMenuHandler(event: React.MouseEvent) {
    event.preventDefault();
    try {
      await window.electron.showContextMenu([
        { id: "mark-latest-seen", label: "Mark All as Seen" }
      ]);
    } catch (error) {
      console.error("Error creating latest context menu:", error);
    }
  }



  const isItemInFolder = (itemId: string, itemType: 'playlist' | 'channel'): boolean => {
    return sidebarOrder.some(e => e.type === 'folder' && e.children.some(c => c.type === itemType && c.id === itemId));
  };

  const handleNewFolder = async () => {
    const folder = await createFolder("New Folder");
    await refreshSidebarData();
    setRenamingFolderId(folder.id);
  };

  const handleFolderRenameCommit = async (folderId: string, name: string) => {
    await renameFolder(folderId, name);
    await refreshSidebarData();
    setRenamingFolderId(null);
  };

  const handleFolderRenameCancel = () => {
    setRenamingFolderId(null);
  };

  const handleFolderToggleCollapse = async (folderId: string, collapsed: boolean) => {
    await setFolderCollapsed(folderId, collapsed);
    const fData = await loadFolders();
    setFolders(fData);
  };

  async function folderContextMenuHandler(event: React.MouseEvent, folderId: string) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await window.electron.showContextMenu([
        { id: `mark-folder-seen-${folderId}`, label: "Mark All as Seen" },
        { type: "separator" },
        { id: `rename-folder-${folderId}`, label: "Rename" },
        { type: "separator" },
        { id: `delete-folder-${folderId}`, label: "Delete Folder" }
      ]);
    } catch (error) {
      console.error("Error creating folder context menu:", error);
    }
  }

  async function collectionsHeaderContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    try {
      await window.electron.showContextMenu([
        { id: "new-folder", label: "New Folder" }
      ]);
    } catch (error) {
      console.error("Error creating collections context menu:", error);
    }
  }

  function buildMoveToFolderSubmenu(itemId: string, itemType: 'playlist' | 'channel') {
    const items: Array<{ id?: string; label?: string; type?: "normal" | "separator" }> = [];
    for (const f of folders) {
      items.push({ id: `move-${itemType}-${itemId}-to-folder-${f.id}`, label: f.name });
    }
    if (isItemInFolder(itemId, itemType)) {
      if (items.length > 0) items.push({ type: "separator" });
      items.push({ id: `move-${itemType}-${itemId}-to-top-level`, label: "Top Level" });
    }
    return items;
  }

  const handleRefreshAll = async (e: React.MouseEvent) => {
    const fullRefresh = e.shiftKey;
    const pItemsCount = playlists.length;
    const cItemsCount = channels.length;
    const totalCount = pItemsCount + cItemsCount;
    const failures: RefreshFailure[] = [];
    const recordFailure = (failure: RefreshFailure) => failures.push(failure);

    setRefreshingPlaylists(true);
    setRefreshingChannels(true);
    setRefreshProgress(null);

    try {
      if (fullRefresh) {
        await fullRefreshAllPlaylists((current) => {
          setRefreshProgress({ current, total: totalCount });
        }, recordFailure);
      } else {
        await checkAllPlaylistsForUpdates((current) => {
          setRefreshProgress({ current, total: totalCount });
        }, recordFailure);
      }
      const newPlaylists = await loadPlaylists();
      setPlaylists(newPlaylists);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingPlaylists(false);

      if (fullRefresh) {
        await fullRefreshAllChannels((current) => {
          setRefreshProgress({ current: pItemsCount + current, total: totalCount });
        }, recordFailure);
      } else {
        await checkAllChannelsForUpdates((current) => {
          setRefreshProgress({ current: pItemsCount + current, total: totalCount });
        }, recordFailure);
      }
      const newChannels = await loadChannels();
      setChannels(newChannels);
      window.dispatchEvent(new CustomEvent('store-updated'));
      setRefreshingChannels(false);

      await refreshSidebarData();

      if (failures.length > 0) {
        const visibleFailures = failures
          .slice(0, 3)
          .map(({ title, type }) => `${title} (${type})`);
        const remainingCount = failures.length - visibleFailures.length;
        const description = remainingCount > 0
          ? `${visibleFailures.join(', ')}, and ${remainingCount} more could not be refreshed.`
          : `${visibleFailures.join(', ')} could not be refreshed.`;

        toast({
          variant: 'destructive',
          title: `Refresh finished with ${failures.length} ${failures.length === 1 ? 'failure' : 'failures'}`,
          description,
        });
      }
    } catch (e) {
      console.error("Refresh all failed", e);
      setRefreshingPlaylists(false);
      setRefreshingChannels(false);
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: 'An unexpected error stopped the refresh. Please try again.',
      });
    } finally {
      setRefreshProgress(null);
    }
  };


  return (
    <>
      <Sidebar className="h-full">
        <SidebarHeader className="p-0">
          <div data-tauri-drag-region className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <div className="w-26 shrink-0" />
            </div>
            <div className="flex items-center">
              {(playlists.length > 0 || channels.length > 0) ? (
                <button
                  onClick={handleRefreshAll}
                  onPointerDown={(e) => e.preventDefault()}
                  disabled={refreshingPlaylists || refreshingChannels}
                  className={cn(
                    "focus-visible:ring-0 focus-visible:outline-none mr-0.5",
                    (refreshingPlaylists || refreshingChannels) && "pointer-events-none"
                  )}
                >
                  <span className={cn("btn-icon", (refreshingPlaylists || refreshingChannels) && "opacity-50")}>
                    {(refreshingPlaylists || refreshingChannels) ? (
                      <div className="flex items-center gap-1">
                        {refreshProgress && (
                          <span className="text-[10px]">{refreshProgress.current}/{refreshProgress.total}</span>
                        )}
                        <Loader size={18} className="animate-spin" />
                      </div>
                    ) : (
                      <RefreshCw size={18} strokeWidth={1.5} />
                    )}
                  </span>
                </button>
              ) : null}

              <Dialog
                open={open}
                onOpenChange={(isOpen) => {
                  if (addingPlaylistOrChannel) return;
                  setOpen(isOpen);
                }}
              >
                <DialogTrigger className="focus-visible:ring-0 focus-visible:outline-none mr-2">
                  <span className={cn("btn-icon")}>
                    <Plus size={18} strokeWidth={1.5} />
                  </span>
                </DialogTrigger>
                <DialogContent forceMount showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle className="text-foreground">
                      Add YouTube Playlist, Channel, or Video
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter YouTube URL"
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
                                isChannelUrl(playlistOrChannelUrl) ||
                                isVideoUrl(playlistOrChannelUrl))
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
                            isChannelUrl(playlistOrChannelUrl) ||
                            isVideoUrl(playlistOrChannelUrl)
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
        </SidebarHeader>
        <SidebarContent className="h-full mt-1">
          <SidebarGroup className="h-full pr-0">
            <SidebarGroupContent className="h-full flex flex-col" >
              <div className="flex-1 flex flex-col min-h-0 select-none sidebar-menu">
                <SidebarGroup className="p-0">
                  <SidebarGroupContent>
                    <SidebarMenu className="pr-2">
                      <SidebarMenuItem className="list-none w-full">
                        <SidebarMenuButton
                          asChild
                          className={cn(
                            "w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0",
                            bookmarkMatch ? "bg-sidebar-accent" : ""
                          )}
                        >
                          <div
                            onClick={() => navigate({ to: '/bookmarks' })}
                            className="flex items-center gap-2 w-full cursor-default"
                          >
                            <BookmarkIcon size={16} className="shrink-0" />
                            <span>Bookmarks</span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem className="list-none w-full">
                        <SidebarMenuButton
                          asChild
                          className={cn(
                            "w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0",
                            historyMatch ? "bg-sidebar-accent" : ""
                          )}
                        >
                          <div
                            onClick={() => navigate({ to: '/history' })}
                            className="flex items-center gap-2 w-full cursor-default"
                          >
                            <History size={16} className="shrink-0" />
                            <span>History</span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem className="list-none w-full">
                        <SidebarMenuButton
                          asChild
                          className={cn(
                            "w-full text-left cursor-default hover:bg-sidebar-accent text-sidebar-foreground shrink-0",
                            latestMatch ? "bg-sidebar-accent" : ""
                          )}
                        >
                          <div
                            onClick={() => navigate({ to: '/latest' })}
                            onContextMenu={latestContextMenuHandler}
                            className="flex items-center gap-2 w-full cursor-default"
                          >
                            <Clock size={16} className="shrink-0" />
                            <span>Latest</span>
                          </div>
                        </SidebarMenuButton>
                        {latestUnreadCount > 0 && (
                          <SidebarMenuBadge className="bg-transparent text-sidebar-foreground/50 mr-0.5">
                            {latestUnreadCount}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>

                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator className="my-2" />

                <SidebarGroup className="p-0">
                  <SidebarGroupLabel
                    className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between"
                    onContextMenu={collectionsHeaderContextMenu}
                  >
                    Collections
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="pr-2">
                      {sidebarOrder.map((entry) => {
                        if (entry.type === 'folder') {
                          const folder = foldersMap.get(entry.id);
                          if (!folder) return null;
                          const folderUnread = entry.children.reduce((sum, child) => {
                            if (child.type === 'playlist') return sum + (playlistsMap.get(child.id)?.unreadCount ?? 0);
                            if (child.type === 'channel') return sum + (channelsMap.get(child.id)?.unreadCount ?? 0);
                            return sum;
                          }, 0);
                          return (
                            <FolderItem
                              key={`folder-${entry.id}`}
                              folder={folder}
                              unreadCount={folderUnread}
                              onContextMenu={folderContextMenuHandler}
                              onToggleCollapse={handleFolderToggleCollapse}
                              renamingFolderId={renamingFolderId}
                              onRenameCommit={handleFolderRenameCommit}
                              onRenameCancel={handleFolderRenameCancel}
                            >
                              {entry.children.map((child) => {
                                if (child.type === 'playlist') {
                                  const playlist = playlistsMap.get(child.id);
                                  if (!playlist) return null;
                                  return (
                                    <PlaylistItem
                                      key={playlist.id}
                                      playlist={playlist}
                                      isActive={playlistMatch?.params.playlistId === playlist.id}
                                      onPlaylistClick={handlePlaylistClick}
                                      onContextMenu={playlistClickHandler}
                                    />
                                  );
                                }
                                if (child.type === 'channel') {
                                  const channel = channelsMap.get(child.id);
                                  if (!channel) return null;
                                  return (
                                    <ChannelItem
                                      key={channel.id}
                                      channel={channel}
                                      isActive={channelMatch?.params.channelId === channel.id}
                                      onChannelClick={handleChannelClick}
                                      onContextMenu={channelClickHandler}
                                    />
                                  );
                                }
                                return null;
                              })}
                            </FolderItem>
                          );
                        }
                        if (entry.type === 'playlist') {
                          const playlist = playlistsMap.get(entry.id);
                          if (!playlist) return null;
                          return (
                            <PlaylistItem
                              key={playlist.id}
                              playlist={playlist}
                              isActive={playlistMatch?.params.playlistId === playlist.id}
                              onPlaylistClick={handlePlaylistClick}
                              onContextMenu={playlistClickHandler}
                            />
                          );
                        }
                        if (entry.type === 'channel') {
                          const channel = channelsMap.get(entry.id);
                          if (!channel) return null;
                          return (
                            <ChannelItem
                              key={channel.id}
                              channel={channel}
                              isActive={channelMatch?.params.channelId === channel.id}
                              onChannelClick={handleChannelClick}
                              onContextMenu={channelClickHandler}
                            />
                          );
                        }
                        return null;
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="flex-1 justify-start hover:bg-sidebar-accent text-sidebar-foreground">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" sideOffset={4} className="">
                  <DropdownMenuItem onClick={toggleAlwaysOnTop}>
                    {isAlwaysOnTop ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    <span>{isAlwaysOnTop ? "Unpin from Top" : "Pin to Top"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center">
                      <SunMoon className="h-4 w-4" />
                      <span>Switch theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Monitor className="h-4 w-4 mr-2" />
                            <span>System</span>
                          </div>
                          {theme === "system" && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Sun className="h-4 w-4 mr-2" />
                            <span>Light</span>
                          </div>
                          {theme === "light" && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Moon className="h-4 w-4 mr-2" />
                            <span>Dark</span>
                          </div>
                          {theme === "dark" && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportData()}>
                    <Download className="h-4 w-4" />
                    <span>Export Data</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    const ok = await importData();
                    if (ok) window.location.reload();
                  }}>
                    <Upload className="h-4 w-4" />
                    <span>Import Data</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <SidebarMenuButton
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 shrink-0 justify-center hover:bg-sidebar-accent text-sidebar-foreground"
              >
                <Search className="h-4 w-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
