import { app, BrowserWindow, net, session, shell, nativeTheme } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";
import { setupMenu } from "./menu";
import { setupAutoUpdater } from "./updater";
import { startStaticServer } from "./server";
import { appGet, migrateAppStore, windowStore } from "./store";
import { handleAvatarProtocol, registerAvatarScheme } from "./avatars";
import { migrateLibrary, reconcileSidebarOrder } from "./library";

const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
const DEV_URL = "http://localhost:1422";

let mainWindow: BrowserWindow | null = null;
let prodURL: string | null = null;

function createMainWindow() {
  const lastState: any = windowStore.get("windowState") || {
    width: 1000,
    height: 800,
  };

  const theme = appGet<string>("theme") || "light";
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
    alwaysOnTop: appGet<boolean>("alwaysOnTop") === true,
  });

  if (lastState.isMaximized) {
    mainWindow.maximize();
  }

  let normalBounds = {
    x: lastState.x,
    y: lastState.y,
    width: lastState.width,
    height: lastState.height,
  };
  let pendingState: Record<string, unknown> | null = null;
  let saveTimer: NodeJS.Timeout | null = null;

  const flushState = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!pendingState) return;
    windowStore.set("windowState", pendingState);
    pendingState = null;
  };

  // "resize" and "move" fire on every frame of a drag, and electron-store
  // rewrites its whole file synchronously per set. Writing inline stalled the
  // main process for the length of the drag; collect the state cheaply and
  // write once the window settles.
  const saveState = () => {
    if (!mainWindow) return;
    if (!mainWindow.isMaximized()) normalBounds = mainWindow.getBounds();
    pendingState = { ...normalBounds, isMaximized: mainWindow.isMaximized() };
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushState, 400);
  };

  mainWindow.on("resize", saveState);
  mainWindow.on("move", saveState);
  mainWindow.on("close", flushState);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    // Preview mode (npm run preview): not packaged but NODE_ENV=production.
    // Auto-open DevTools so errors are visible while simulating production.
    if (!app.isPackaged && process.env.NODE_ENV === "production") {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
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
  } else if (prodURL) {
    mainWindow.loadURL(prodURL);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// A cold install has no youtube.com cookies at all, which is exactly the
// profile YouTube's "confirm you're not a bot" check targets. One request
// through the shared session seeds VISITOR_INFO1_LIVE so the embedded player
// has a visitor session to present on its first load.
async function warmYouTubeSession() {
  try {
    await net.fetch("https://www.youtube.com/", { credentials: "include" });
  } catch (err) {
    console.warn("[youtube] visitor session warm-up failed:", err);
  }

  const cookies = await session.defaultSession.cookies.get({ domain: ".youtube.com" });
  console.log(
    "[youtube] visitor cookies:",
    cookies.length
      ? cookies.map((c) => c.name).join(", ")
      : "none — the embed will likely hit the bot check"
  );
}

app.name = "LocalTube";

// Must run before the app is ready: the renderer loads cached channel avatars
// through this scheme.
registerAvatarScheme();

// Strip "Electron/<version>" from the default UA — YouTube's embed checks
// treat that token as a non-browser client and refuse playback (Error 152-4).
app.userAgentFallback = app.userAgentFallback.replace(/ Electron\/\S+/, "");

// A second instance would write the same store files with last-write-wins
// full-file rewrites, and could not bind the fixed port the YouTube embed
// relies on for a stable origin.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    handleAvatarProtocol();
    migrateAppStore();
    migrateLibrary();
    reconcileSidebarOrder();

    if (!isDev) {
      const distDir = path.join(__dirname, "../../src-web/dist");
      const port = await startStaticServer(distDir);
      prodURL = `http://localhost:${port}`;
    }

    // Not awaited: the iframe API only loads once a video is opened, and
    // blocking startup on a network call would stall launch when offline.
    void warmYouTubeSession();

    registerIpcHandlers(() => mainWindow);
    setupMenu(() => mainWindow);
    createMainWindow();
    setupAutoUpdater(() => mainWindow);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
