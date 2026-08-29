import { contextBridge, ipcRenderer } from "electron";
import type {
  ConfirmOptions,
  ContextMenuItem,
  FetchInit,
  FetchResult,
  PlaybackPosition,
  SidebarData,
  SourceKind,
  StoredSource,
} from "./types";

const api = {
  store: {
    get: <T>(key: string) => ipcRenderer.invoke("store:get", key) as Promise<T | undefined>,
    getSync: <T>(key: string) => ipcRenderer.sendSync("store:get-sync", key) as T | undefined,
    set: (key: string, value: unknown) => ipcRenderer.invoke("store:set", key, value) as Promise<void>,
    save: () => ipcRenderer.invoke("store:save") as Promise<void>,
  },

  library: {
    sidebar: () => ipcRenderer.invoke("library:sidebar") as Promise<SidebarData>,
    source: (kind: SourceKind, id: string) =>
      ipcRenderer.invoke("library:source", kind, id) as Promise<StoredSource | null>,
    reconcileSidebar: () => ipcRenderer.invoke("library:reconcileSidebar") as Promise<boolean>,
  },

  descriptions: {
    get: (videoId: string) => ipcRenderer.invoke("description:get", videoId) as Promise<string | null>,
    put: (videoId: string, text: string) =>
      ipcRenderer.invoke("description:put", videoId, text) as Promise<void>,
  },

  playback: {
    get: (videoId: string) =>
      ipcRenderer.invoke("playback:get", videoId) as Promise<PlaybackPosition | null>,
    put: (videoId: string, position: number, duration: number) =>
      ipcRenderer.invoke("playback:put", videoId, position, duration) as Promise<void>,
    clear: (videoId: string) => ipcRenderer.invoke("playback:clear", videoId) as Promise<void>,
  },

  youtubeCookie: {
    get: () => ipcRenderer.invoke("cookie:get") as Promise<string>,
    set: (value: string) => ipcRenderer.invoke("cookie:set", value) as Promise<void>,
  },

  cacheAvatar: (channelId: string, remoteUrl?: string, existing?: string) =>
    ipcRenderer.invoke("avatar:ensure", channelId, remoteUrl, existing) as Promise<string | undefined>,

  fetch: (url: string, init?: FetchInit) =>
    ipcRenderer.invoke("net:fetch", url, init) as Promise<FetchResult>,

  fetchImageAsDataUrl: (url: string) =>
    ipcRenderer.invoke("net:fetchImageAsDataUrl", url) as Promise<string | null>,

  openUrl: (url: string) => ipcRenderer.invoke("shell:openExternal", url) as Promise<void>,

  confirm: (message: string, options?: ConfirmOptions) =>
    ipcRenderer.invoke("dialog:confirm", message, options) as Promise<boolean>,

  showContextMenu: (items: ContextMenuItem[], position?: { x: number; y: number }) =>
    ipcRenderer.invoke("menu:showContext", items, position) as Promise<string | null>,

  setAlwaysOnTop: (flag: boolean) =>
    ipcRenderer.invoke("window:setAlwaysOnTop", flag) as Promise<void>,

  saveFile: (content: string, defaultName: string) =>
    ipcRenderer.invoke("dialog:saveFile", content, defaultName) as Promise<boolean>,

  openFile: () =>
    ipcRenderer.invoke("dialog:openFile") as Promise<string | null>,

  updater: {
    install: () => ipcRenderer.invoke("updater:install") as Promise<void>,
  },

  onWindowFocus: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("window:focus", handler);
    return () => ipcRenderer.removeListener("window:focus", handler);
  },

  onMenuEvent: (cb: (eventName: string, payload?: string) => void) => {
    const handler = (_: unknown, eventName: string, payload?: string) => cb(eventName, payload);
    ipcRenderer.on("menu:event", handler);
    return () => ipcRenderer.removeListener("menu:event", handler);
  },

  onUpdateReady: (cb: (info: { version: string }) => void) => {
    const handler = (_: unknown, info: { version: string }) => cb(info);
    ipcRenderer.on("updater:ready", handler);
    return () => ipcRenderer.removeListener("updater:ready", handler);
  },
};



contextBridge.exposeInMainWorld("electron", api);

export type ElectronAPI = typeof api;
