const { contextBridge, ipcRenderer } = require("electron");

/** @type {Set<(payload: object) => void>} */
const progressListeners = new Set();
/** @type {object[]} */
const progressBuffer = [];
/** @type {Set<(health: object | null) => void>} */
const dataReadyListeners = new Set();
/** @type {object | null} */
let lastHealth = null;
let importInProgress = false;

function notifyProgress(payload) {
  progressBuffer.push(payload);
  if (progressBuffer.length > 200) progressBuffer.shift();

  if (payload.phase === "start" || payload.phase === "progress") {
    importInProgress = true;
  }
  if (payload.phase === "done" || payload.phase === "error") {
    importInProgress = false;
  }

  for (const listener of progressListeners) {
    listener(payload);
  }
}

function notifyDataReady(health) {
  importInProgress = false;
  lastHealth = health ?? null;
  progressBuffer.length = 0;
  for (const listener of dataReadyListeners) {
    listener(lastHealth);
  }
}

ipcRenderer.on("stackcraft-import-progress", (_event, payload) => {
  notifyProgress(payload);
});

ipcRenderer.on("stackcraft-data-ready", (_event, health) => {
  notifyDataReady(health ?? null);
});

contextBridge.exposeInMainWorld("stackcraft", {
  isDesktop: true,
  notifyReady: () => ipcRenderer.invoke("stackcraft-renderer-ready"),
  importJar: () => ipcRenderer.invoke("stackcraft-import-jar"),
  openUserDataFolder: () => ipcRenderer.invoke("stackcraft-open-user-data"),
  onImportProgress: (callback) => {
    progressListeners.add(callback);
    for (const payload of progressBuffer) {
      callback(payload);
    }
    return () => progressListeners.delete(callback);
  },
  onDataReady: (callback) => {
    dataReadyListeners.add(callback);
    if (lastHealth) callback(lastHealth);
    return () => dataReadyListeners.delete(callback);
  },
  getImportSnapshot: () => ({
    inProgress: importInProgress,
    lastProgress: progressBuffer.at(-1) ?? null,
  }),
});
