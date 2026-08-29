export interface FetchInit {
  method?: string;
  headers?: Record<string, string> | HeadersInit;
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

export interface ElectronAPI {
  store: {
    get<T>(key: string): Promise<T | undefined>;
    getSync<T>(key: string): T | undefined;
    set(key: string, value: unknown): Promise<void>;
    save(): Promise<void>;
  };
  library: {
    sidebar(): Promise<SidebarData>;
    source<T>(kind: SourceKind, id: string): Promise<T | null>;
    reconcileSidebar(): Promise<boolean>;
  };
  descriptions: {
    get(videoId: string): Promise<string | null>;
    put(videoId: string, text: string): Promise<void>;
  };
  playback: {
    get(videoId: string): Promise<PlaybackPosition | null>;
    put(videoId: string, position: number, duration: number): Promise<void>;
    clear(videoId: string): Promise<void>;
  };
  youtubeCookie: {
    get(): Promise<string>;
    set(value: string): Promise<void>;
  };
  cacheAvatar(channelId: string, remoteUrl?: string, existing?: string): Promise<string | undefined>;
  fetch(url: string, init?: FetchInit): Promise<FetchResult>;
  fetchImageAsDataUrl(url: string): Promise<string | null>;
  openUrl(url: string): Promise<void>;
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  showContextMenu(items: ContextMenuItem[], position?: { x: number; y: number }): Promise<string | null>;
  setAlwaysOnTop(flag: boolean): Promise<void>;
  saveFile(content: string, defaultName: string): Promise<boolean>;
  openFile(): Promise<string | null>;
  updater: {
    install(): Promise<void>;
  };
  onWindowFocus(cb: () => void): () => void;
  onMenuEvent(cb: (eventName: string, payload?: string) => void): () => void;
  onUpdateReady(cb: (info: { version: string }) => void): () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
