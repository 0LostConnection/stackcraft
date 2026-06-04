import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
} from "electron";
import { ensureUserData } from "./user-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('node:http').Server | null} */
let httpServer = null;
/** @type {number | null} */
let serverPort = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;
let importInProgress = false;
let promptedImportThisSession = false;
let rendererReady = false;
/** @type {(() => void) | null} */
let resolveRendererReady = null;
const rendererReadyPromise = new Promise((resolve) => {
  resolveRendererReady = resolve;
});
/** @type {object[]} */
const pendingProgress = [];
/** @type {object | null} */
let pendingDataReady = null;

const STACKCRAFT_DEBUG = process.env.STACKCRAFT_DEBUG === "1";

function debugLog(...args) {
  if (STACKCRAFT_DEBUG) console.log("[stackcraft]", ...args);
}

function getBundleRoot() {
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return path.resolve(__dirname, "..");
}

function getUserDataRoot() {
  if (app.isPackaged) {
    return app.getPath("userData");
  }
  return path.resolve(__dirname, "..");
}

function getNodeExecutable() {
  const npmNode = process.env.npm_node_execpath;
  if (npmNode && fs.existsSync(npmNode)) return npmNode;
  return process.execPath;
}

function spawnImportProcess(scriptPath, env) {
  const nodeBin = getNodeExecutable();
  const useElectronAsNode = nodeBin === process.execPath;
  const childEnv = {
    ...env,
    ...(useElectronAsNode ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
  };
  return spawn(nodeBin, [scriptPath], {
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function getImportScriptPath(bundleRoot) {
  const unpacked = bundleRoot.endsWith(".asar")
    ? path.join(`${bundleRoot}.unpacked`, "scripts", "import-minecraft.mjs")
    : path.join(bundleRoot, "scripts", "import-minecraft.mjs");
  if (fs.existsSync(unpacked)) return unpacked;
  return path.join(bundleRoot, "scripts", "import-minecraft.mjs");
}

const PROGRESS_PREFIX = "STACKCRAFT_PROGRESS:";

function markRendererReady(source) {
  if (!rendererReady) {
    rendererReady = true;
    resolveRendererReady?.();
    resolveRendererReady = null;
    debugLog("renderer ready", source);
  }
  flushPendingRendererEvents();
}

function flushPendingRendererEvents() {
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) return;
  for (const payload of pendingProgress) {
    debugLog("flush progress", payload.phase);
    mainWindow.webContents.send("stackcraft-import-progress", payload);
  }
  pendingProgress.length = 0;
  if (pendingDataReady) {
    debugLog("flush data-ready", pendingDataReady);
    mainWindow.webContents.send("stackcraft-data-ready", pendingDataReady);
    pendingDataReady = null;
  }
}

const PRELOAD_PATH = path.join(__dirname, "preload.cjs");

const BROWSER_WINDOW_PREFS = {
  preload: PRELOAD_PATH,
  contextIsolation: true,
  nodeIntegration: false,
};

/** @type {ReturnType<typeof setTimeout> | null} */
let rendererLoadFallbackTimer = null;

function scheduleRendererLoadFallback() {
  if (rendererLoadFallbackTimer) clearTimeout(rendererLoadFallbackTimer);
  rendererLoadFallbackTimer = setTimeout(() => {
    rendererLoadFallbackTimer = null;
    markRendererReady("load-timeout");
  }, 750);
}

function attachWebContentsReadyHandlers(webContents) {
  webContents.on("preload-error", (_event, scriptPath, error) => {
    console.error("[stackcraft] preload failed:", scriptPath, error);
  });

  webContents.on("dom-ready", () => {
    markRendererReady("dom-ready");
  });

  webContents.on("did-finish-load", () => {
    markRendererReady("did-finish-load");
    scheduleRendererLoadFallback();
    void onRendererReady();
  });
}

function deliverImportProgress(payload) {
  if (!rendererReady) {
    pendingProgress.push(payload);
    if (pendingProgress.length > 200) pendingProgress.shift();
    debugLog("buffer progress (renderer not ready)", payload.phase);
    return;
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingProgress.push(payload);
    if (pendingProgress.length > 200) pendingProgress.shift();
    debugLog("buffer progress (no window)", payload.phase);
    return;
  }
  mainWindow.webContents.send("stackcraft-import-progress", payload);
}

function sendImportProgress(payload) {
  deliverImportProgress(payload);
}

function handleImportOutputLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (trimmed.startsWith(PROGRESS_PREFIX)) {
    try {
      const data = JSON.parse(trimmed.slice(PROGRESS_PREFIX.length));
      sendImportProgress({
        phase: "progress",
        percent: data.percent,
        phaseId: data.phaseId,
        current: data.current,
        total: data.total,
      });
      return;
    } catch {
      /* fall through to log */
    }
  }

  sendImportProgress({ phase: "log", message: trimmed });
}

function attachImportStream(stream, options = {}) {
  const { logsOnly = false } = options;
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (logsOnly) {
        const trimmed = line.trim();
        if (trimmed) sendImportProgress({ phase: "log", message: trimmed });
        continue;
      }
      handleImportOutputLine(line);
    }
  });
  return () => {
    if (buffer.trim()) {
      if (logsOnly) {
        sendImportProgress({ phase: "log", message: buffer.trim() });
      } else {
        handleImportOutputLine(buffer);
      }
      buffer = "";
    }
  };
}

function healthSnapshotFromState(state) {
  return {
    dataReady: state.dataStatus.ready,
    version: state.gameData.version,
    items: state.gameData.items.length,
  };
}

function broadcastDataReady(state) {
  const health = healthSnapshotFromState(state);
  if (!rendererReady) {
    pendingDataReady = health;
    debugLog("buffer data-ready (renderer not ready)", health);
    return;
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingDataReady = health;
    debugLog("buffer data-ready (no window)", health);
    return;
  }
  debugLog("send data-ready", health);
  mainWindow.webContents.send("stackcraft-data-ready", health);
}

async function loadServerModules() {
  const bundleRoot = getBundleRoot();
  const appRoot = getUserDataRoot();
  process.env.STACKCRAFT_ROOT = appRoot;
  process.env.STACKCRAFT_BUNDLE_ROOT = bundleRoot;
  process.env.NODE_ENV = "production";

  const appModulePath = path.join(bundleRoot, "server", "src", "app.js");
  return import(pathToFileURL(appModulePath).href);
}

async function startHttpServer() {
  const { startServer } = await loadServerModules();
  const { server, port } = await startServer({ port: 0 });
  httpServer = server;
  serverPort = port;
  return port;
}

async function reloadGameData() {
  const { reloadGameData: reload } = await loadServerModules();
  return reload();
}

function stopHttpServer() {
  return new Promise((resolve) => {
    if (!httpServer) {
      resolve();
      return;
    }
    httpServer.close(() => {
      httpServer = null;
      serverPort = null;
      resolve();
    });
  });
}

function pickJarFile() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
  const result = dialog.showOpenDialogSync(mainWindow ?? undefined, {
    title: "Choose Minecraft client JAR",
    properties: ["openFile"],
    filters: [{ name: "JAR", extensions: ["jar"] }],
  });
  if (!result?.[0]) return null;
  return result[0];
}

function runImport(jarPath) {
  const bundleRoot = getBundleRoot();
  const userDataRoot = getUserDataRoot();
  const scriptPath = getImportScriptPath(bundleRoot);

  return new Promise((resolve, reject) => {
    sendImportProgress({ phase: "start", percent: 0, phaseId: "jar" });

    const env = {
      ...process.env,
      MINECRAFT_JAR: jarPath,
      STACKCRAFT_ROOT: userDataRoot,
      NODE_ENV: "production",
    };

    const child = spawnImportProcess(scriptPath, env);

    const flushStdout = attachImportStream(child.stdout);
    // Parse STACKCRAFT_PROGRESS on stderr too (older packaged import scripts used console.error).
    const flushStderr = attachImportStream(child.stderr);

    child.on("error", reject);
    child.on("close", (code) => {
      flushStdout();
      flushStderr();
      if (code === 0) {
        sendImportProgress({ phase: "done", percent: 100, phaseId: "done" });
        resolve();
      } else {
        reject(new Error(`Import failed (exit ${code})`));
      }
    });
  });
}

async function handleImportJar() {
  if (importInProgress) {
    return { ok: false, error: "Import already in progress" };
  }

  const jarPath = pickJarFile();
  if (!jarPath) {
    return { ok: false, cancelled: true };
  }

  importInProgress = true;
  try {
    await runImport(jarPath);
    const state = await reloadGameData();
    await new Promise((r) => setTimeout(r, 150));
    broadcastDataReady(state);
    return { ok: true, health: healthSnapshotFromState(state) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    sendImportProgress({ phase: "error", message });
    return { ok: false, error: message };
  } finally {
    importInProgress = false;
  }
}

async function waitForRendererReady() {
  if (rendererReady) return;
  await rendererReadyPromise;
}

async function onRendererReady() {
  await waitForRendererReady();
  promptedImportThisSession = true;
}

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Choose Minecraft JAR…",
          click: () => {
            if (importInProgress) return;
            void handleImportJar();
          },
        },
        {
          label: "Open data folder",
          click: () => {
            shell.openPath(getUserDataRoot());
          },
        },
        { type: "separator" },
        process.platform === "darwin"
          ? { role: "close" }
          : { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
      ],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  const port = await startHttpServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "StackCraft",
    webPreferences: BROWSER_WINDOW_PREFS,
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  attachWebContentsReadyHandlers(mainWindow.webContents);
  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(async () => {
  const bundleRoot = getBundleRoot();
  const userDataRoot = getUserDataRoot();
  ensureUserData(userDataRoot, bundleRoot);

  buildMenu();

  ipcMain.handle("stackcraft-renderer-ready", () => {
    markRendererReady("ipc");
    return { importInProgress };
  });
  ipcMain.handle("stackcraft-import-jar", handleImportJar);
  ipcMain.handle("stackcraft-open-user-data", () => {
    shell.openPath(getUserDataRoot());
  });

  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (!serverPort) {
        await createWindow();
        return;
      }
      mainWindow = new BrowserWindow({
        width: 1280,
        height: 840,
        minWidth: 900,
        minHeight: 600,
        title: "StackCraft",
        webPreferences: BROWSER_WINDOW_PREFS,
      });
      mainWindow.on("closed", () => {
        mainWindow = null;
      });
      attachWebContentsReadyHandlers(mainWindow.webContents);
      await mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
    }
  });
}).catch((err) => {
  console.error("[stackcraft] Failed to start:", err);
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void stopHttpServer();
});
