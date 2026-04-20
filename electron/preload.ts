import { contextBridge, ipcRenderer } from "electron";
import type { ConfirmOptions, ContextMenuItem, FetchInit, FetchResult } from "./types";

const api = {
  store: {
    get: <T>(key: string) => ipcRenderer.invoke("store:get", key) as Promise<T | undefined>,
    getSync: <T>(key: string) => ipcRenderer.sendSync("store:get-sync", key) as T | undefined,
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
