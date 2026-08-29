export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface ContextMenuItem {
  id?: string;
  label?: string;
  type?: "normal" | "separator";
  submenu?: ContextMenuItem[];
}

export interface ConfirmOptions {
  title?: string;
  kind?: "info" | "warning" | "error";
  okLabel?: string;
  cancelLabel?: string;
}

export interface PlaybackPosition {
  position: number;
  duration: number;
  updatedAt: number;
}

export interface StoredVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  publishedAt?: number;
  sourceTitle?: string;
}

export interface StoredSource {
  id: string;
  title: string;
  thumbnail?: string;
  lastUpdated: number;
  items: StoredVideo[];
}

export interface SourceMeta {
  id: string;
  title: string;
  thumbnail?: string;
  lastUpdated: number;
}

export interface SidebarData {
  playlists: SourceMeta[];
  channels: SourceMeta[];
}

export type SourceKind = "playlist" | "channel";

export interface StoredFolder {
  id: string;
  name: string;
  isCollapsed: boolean;
}

export type SidebarChildEntry = { type: SourceKind; id: string };

export type SidebarItem =
  | { type: "playlist"; id: string }
  | { type: "channel"; id: string }
  | { type: "folder"; id: string; children: SidebarChildEntry[] };
