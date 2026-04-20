import { BrowserWindow, Menu, MenuItem, dialog, ipcMain, net, shell } from "electron";
import Store from "electron-store";
import type { ConfirmOptions, ContextMenuItem, FetchInit, FetchResult } from "./types";

const store = new Store({ name: "app-data" });

export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle("store:get", (_e, key: string) => store.get(key));
  ipcMain.handle("store:set", (_e, key: string, value: unknown) => {
    store.set(key, value);
  });
  ipcMain.handle("store:save", () => {
    // electron-store persists on every set; no-op for API parity.
  });

  ipcMain.handle("net:fetch", async (_e, url: string, init?: FetchInit): Promise<FetchResult> => {
    const timeoutMs = init?.timeout ?? 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await net.fetch(url, {
        method: init?.method ?? "GET",
        headers: init?.headers,
        body: init?.body,
        signal: controller.signal,
        redirect: "follow",
      });

      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
      };
    } finally {
      clearTimeout(timer);
    }
  });

  ipcMain.handle("shell:openExternal", async (_e, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle("dialog:confirm", async (_e, message: string, options?: ConfirmOptions) => {
    const win = getWindow();
    const result = await dialog.showMessageBox(win ?? undefined!, {
      type: options?.kind ?? "info",
      title: options?.title,
      message,
      buttons: [options?.okLabel ?? "OK", options?.cancelLabel ?? "Cancel"],
      defaultId: 0,
      cancelId: 1,
    });
    return result.response === 0;
  });

  ipcMain.handle("menu:showContext", async (_e, items: ContextMenuItem[]) => {
    const win = getWindow();
    if (!win) return null;

    return new Promise<string | null>((resolve) => {
      let resolved = false;
      const menu = new Menu();
      for (const item of items) {
        if (item.type === "separator") {
          menu.append(new MenuItem({ type: "separator" }));
        } else {
          menu.append(
            new MenuItem({
              label: item.label ?? "",
              click: () => {
                resolved = true;
                if (item.id) {
                  win.webContents.send("menu:event", item.id);
                }
                resolve(item.id ?? null);
              },
            })
          );
        }
      }
      menu.popup({
        window: win,
        callback: () => {
          if (!resolved) resolve(null);
        },
      });
    });
  });

  ipcMain.handle("window:setAlwaysOnTop", (_e, flag: boolean) => {
    const win = getWindow();
    win?.setAlwaysOnTop(flag);
  });
}
