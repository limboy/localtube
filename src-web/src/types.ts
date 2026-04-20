export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
}

export interface VideoListInfo {
  lastUpdated: number;
  unreadCount: number;
  id: string;
  title: string;
  items: VideoItem[];
}

export interface PlaylistInfo extends VideoListInfo {
  type?: 'playlist';
}

export interface ChannelInfo extends VideoListInfo {
  type?: 'channel';
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
}

export interface EnrichedBookmark {
  id: string;
  title: string;
  type: 'playlist' | 'channel';
  bookmarkedAt: number;
  data?: PlaylistInfo | ChannelInfo;
}


export interface DividerInfo {
  id: string;
  type: 'divider';
  createdAt: number;
}

export type SidebarItem = PlaylistInfo | ChannelInfo | DividerInfo;
