import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", (info) => {
    getWindow()?.webContents.send("updater:ready", { version: info.version });
  });

  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
  });

  // Initial check
  autoUpdater.checkForUpdates().catch(() => {});

  // Periodic check every 6 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 6 * 60 * 60 * 1000);

  ipcMain.handle("updater:install", () => {
    if (!app.isPackaged) return;
    autoUpdater.quitAndInstall();
  });
}

