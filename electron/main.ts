import { app, BrowserWindow, shell, nativeTheme } from "electron";
import path from "node:path";
import { registerIpcHandlers, store } from "./ipc";
import { setupMenu } from "./menu";
import { setupAutoUpdater } from "./updater";

const isDev = !app.isPackaged;
const DEV_URL = "http://localhost:1422";

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const lastState: any = store.get("windowState") || {
    width: 1000,
    height: 800,
  };

  const theme = (store.get("theme") as string) || "light";
  let backgroundColor = "#ffffff";

  if (theme === "dark") {
    backgroundColor = "#29282b";
  } else if (theme === "system") {
    backgroundColor = nativeTheme.shouldUseDarkColors ? "#29282b" : "#ffffff";
  }

  mainWindow = new BrowserWindow({
    x: lastState.x,
    y: lastState.y,
    width: lastState.width,
    height: lastState.height,
    minWidth: 400,
    minHeight: 275,
    title: "LocalTube",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 14 },
    backgroundColor: backgroundColor,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    alwaysOnTop: store.get("alwaysOnTop") === true,
  });

  if (lastState.isMaximized) {
    mainWindow.maximize();
  }

  const saveState = () => {
    if (!mainWindow) return;
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized) {
      const bounds = mainWindow.getBounds();
      store.set("windowState", {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: false,
      });
    } else {
      store.set("windowState", {
        ...lastState,
        isMaximized: true,
      });
    }
  };

  mainWindow.on("resize", saveState);
  mainWindow.on("move", saveState);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("focus", () => {
    mainWindow?.webContents.send("window:focus");
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
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
