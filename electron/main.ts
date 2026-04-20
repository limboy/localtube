import { app, BrowserWindow, shell, nativeTheme } from "electron";
import path from "node:path";
import windowStateKeeper from "electron-window-state";
import { registerIpcHandlers, store } from "./ipc";
import { setupMenu } from "./menu";
import { setupAutoUpdater } from "./updater";

const isDev = !app.isPackaged;
const DEV_URL = "http://localhost:1422";

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const windowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 600,
  });

  const theme = store.get("theme") || "light";
  let backgroundColor = "#ffffff";

  if (theme === "dark") {
    backgroundColor = "#29282b";
  } else if (theme === "system") {
    backgroundColor = nativeTheme.shouldUseDarkColors ? "#29282b" : "#ffffff";
  }

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 400,
    minHeight: 275,
    title: "LocalTube",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 14 },
    backgroundColor: backgroundColor,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  windowState.manage(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("focus", () => {
    mainWindow?.webContents.send("window:focus");
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    // mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../src-web/dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers(() => mainWindow);
  setupMenu(() => mainWindow);
  createMainWindow();
  if (!isDev) {
    setupAutoUpdater(() => mainWindow);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
