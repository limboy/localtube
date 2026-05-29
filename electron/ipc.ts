import { BrowserWindow, Menu, MenuItem, dialog, ipcMain, net, shell } from "electron";
import Store from "electron-store";
import * as fs from "fs";
import type { ConfirmOptions, ContextMenuItem, FetchInit, FetchResult } from "./types";

export const store = new Store({ name: "app-data" });

export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle("store:get", (_e, key: string) => store.get(key));
  ipcMain.handle("store:set", (_e, key: string, value: unknown) => {
    store.set(key, value);
  });
  ipcMain.handle("store:save", () => {
    // electron-store persists on every set; no-op for API parity.
  });

  ipcMain.on("store:get-sync", (event, key: string) => {
    event.returnValue = store.get(key);
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

  ipcMain.handle("net:fetchImageAsDataUrl", async (_e, url: string): Promise<string | null> => {
    try {
      const response = await net.fetch(url, { redirect: "follow" });
      if (!response.ok) return null;

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
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

  ipcMain.handle("menu:showContext", async (_e, items: ContextMenuItem[], position?: { x: number; y: number }) => {
    const win = getWindow();
    if (!win) return null;

    const w = win;
    return new Promise<string | null>((resolve) => {
      let resolved = false;

      function buildMenuItems(entries: ContextMenuItem[], menu: Menu) {
        for (const item of entries) {
          if (item.type === "separator") {
            menu.append(new MenuItem({ type: "separator" }));
          } else if (item.submenu && item.submenu.length > 0) {
            const sub = new Menu();
            buildMenuItems(item.submenu, sub);
            menu.append(new MenuItem({ label: item.label ?? "", submenu: sub }));
          } else {
            menu.append(
              new MenuItem({
                label: item.label ?? "",
                click: () => {
                  resolved = true;
                  if (item.id) {
                    w.webContents.send("menu:event", item.id);
                  }
                  resolve(item.id ?? null);
                },
              })
            );
          }
        }
      }

      const menu = new Menu();
      buildMenuItems(items, menu);
      menu.popup({
        window: w,
        ...(position ? { x: Math.round(position.x), y: Math.round(position.y) } : {}),
        callback: () => {
          if (!resolved) resolve(null);
        },
      });
    });
  });

  ipcMain.handle("window:setAlwaysOnTop", (_e, flag: boolean) => {
    const win = getWindow();
    win?.setAlwaysOnTop(flag);
    store.set("alwaysOnTop", flag);
  });

  ipcMain.handle("dialog:saveFile", async (_e, content: string, defaultName: string) => {
    const win = getWindow();
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      defaultPath: defaultName,
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, content, "utf-8");
    return true;
  });

  ipcMain.handle("dialog:openFile", async () => {
    const win = getWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return fs.readFileSync(result.filePaths[0], "utf-8");
  });
}
