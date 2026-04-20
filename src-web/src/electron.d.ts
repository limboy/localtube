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
}

export interface ConfirmOptions {
  title?: string;
  kind?: "info" | "warning" | "error";
  okLabel?: string;
  cancelLabel?: string;
}

export interface ElectronAPI {
  store: {
    get<T>(key: string): Promise<T | undefined>;
    set(key: string, value: unknown): Promise<void>;
    save(): Promise<void>;
  };
  fetch(url: string, init?: FetchInit): Promise<FetchResult>;
  openUrl(url: string): Promise<void>;
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  showContextMenu(items: ContextMenuItem[]): Promise<string | null>;
  setAlwaysOnTop(flag: boolean): Promise<void>;
  updater: {
    check(): Promise<{ hasUpdate: boolean; version?: string }>;
    download(): Promise<void>;
    install(): Promise<void>;
  };
  onWindowFocus(cb: () => void): () => void;
  onMenuEvent(cb: (eventName: string, payload?: string) => void): () => void;
  onUpdateDownloaded(cb: () => void): () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
