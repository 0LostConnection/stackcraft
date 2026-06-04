/// <reference types="vite/client" />

interface StackcraftImportProgress {
  phase: string;
  message?: string;
  percent?: number;
  phaseId?: string;
  current?: number;
  total?: number;
}

interface StackcraftRendererReadyResult {
  importInProgress: boolean;
}

interface StackcraftImportSnapshot {
  inProgress: boolean;
  lastProgress: StackcraftImportProgress | null;
}

interface StackcraftImportResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
  health?: {
    dataReady: boolean;
    version: string;
    items: number;
  };
}

interface StackcraftDesktopApi {
  isDesktop: true;
  notifyReady: () => Promise<StackcraftRendererReadyResult>;
  importJar: () => Promise<StackcraftImportResult>;
  openUserDataFolder: () => Promise<void>;
  onImportProgress: (
    callback: (payload: StackcraftImportProgress) => void,
  ) => () => void;
  onDataReady: (
    callback: (health: StackcraftImportResult["health"] | null) => void,
  ) => () => void;
  getImportSnapshot: () => StackcraftImportSnapshot;
}

interface Window {
  stackcraft?: StackcraftDesktopApi;
}
