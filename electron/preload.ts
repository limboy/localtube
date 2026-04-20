import { contextBridge, ipcRenderer } from "electron";
import type { ConfirmOptions, ContextMenuItem, FetchInit, FetchResult } from "./types";

const api = {
  store: {
    get: <T>(key: string) => ipcRenderer.invoke("store:get", key) as Promise<T | undefined>,
    set: (key: string, value: unknown) => ipcRenderer.invoke("store:set", key, value) as Promise<void>,
    save: () => ipcRenderer.invoke("store:save") as Promise<void>,
  },

  fetch: (url: string, init?: FetchInit) =>
    ipcRenderer.invoke("net:fetch", url, init) as Promise<FetchResult>,

  openUrl: (url: string) => ipcRenderer.invoke("shell:openExternal", url) as Promise<void>,

  confirm: (message: string, options?: ConfirmOptions) =>
    ipcRenderer.invoke("dialog:confirm", message, options) as Promise<boolean>,

  showContextMenu: (items: ContextMenuItem[]) =>
    ipcRenderer.invoke("menu:showContext", items) as Promise<string | null>,

  setAlwaysOnTop: (flag: boolean) =>
    ipcRenderer.invoke("window:setAlwaysOnTop", flag) as Promise<void>,

  updater: {
    check: () => ipcRenderer.invoke("updater:check") as Promise<{ hasUpdate: boolean; version?: string }>,
    download: () => ipcRenderer.invoke("updater:download") as Promise<void>,
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

  onUpdateDownloaded: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("updater:downloaded", handler);
    return () => ipcRenderer.removeListener("updater:downloaded", handler);
  },
};

contextBridge.exposeInMainWorld("electron", api);

export type ElectronAPI = typeof api;
