export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  publishedAt?: number;
  unseen?: boolean;
  sourceTitle?: string;
}

export interface SourceMeta {
  id: string;
  title: string;
  thumbnail?: string;
  unreadCount: number;
  lastUpdated: number;
}

export interface VideoListInfo extends SourceMeta {
  items: VideoItem[];
}

export interface PlaylistInfo extends VideoListInfo {
  type?: 'playlist';
}

export interface ChannelInfo extends VideoListInfo {
  type?: 'channel';
}

export interface RefreshFailure {
  type: 'playlist' | 'channel';
  id: string;
  title: string;
  error: unknown;
}

export interface PlayerState {
  isPlaying: boolean;
  currentVideoIndex: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

export type PlayerControls = {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
};

export type PlaylistStatus = "idle" | "loading" | "ready" | "error";

export interface BookmarkData {
  createdAt: number;
  videoDetails?: VideoItem;
}

export interface FolderInfo {
  id: string;
  name: string;
  isCollapsed: boolean;
}

export interface WatchHistoryEntry {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  watchedAt: number;
}

export type SidebarChildEntry = { type: 'playlist' | 'channel'; id: string };

export type SidebarItem =
  | { type: 'playlist'; id: string }
  | { type: 'channel'; id: string }
  | { type: 'folder'; id: string; children: SidebarChildEntry[] };


