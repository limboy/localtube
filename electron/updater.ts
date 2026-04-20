import { BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-downloaded", () => {
    getWindow()?.webContents.send("updater:downloaded");
  });

  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
  });

  ipcMain.handle("updater:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result && result.updateInfo.version !== autoUpdater.currentVersion.version) {
        return { hasUpdate: true, version: result.updateInfo.version };
      }
      return { hasUpdate: false };
    } catch (err) {
      console.error("checkForUpdates failed:", err);
      return { hasUpdate: false };
    }
  });

  ipcMain.handle("updater:download", async () => {
    await autoUpdater.downloadUpdate();
  });

  ipcMain.handle("updater:install", () => {
    autoUpdater.quitAndInstall();
  });
}
