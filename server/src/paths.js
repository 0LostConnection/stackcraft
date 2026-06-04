import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Writable root: game data and imported textures (userData in Electron). */
export function getAppRoot() {
  if (process.env.STACKCRAFT_ROOT) {
    return path.resolve(process.env.STACKCRAFT_ROOT);
  }
  return path.resolve(__dirname, "../..");
}

/** Read-only bundle root: built client UI (repo root in dev, resources in Electron). */
export function getBundleRoot() {
  if (process.env.STACKCRAFT_BUNDLE_ROOT) {
    return path.resolve(process.env.STACKCRAFT_BUNDLE_ROOT);
  }
  return getAppRoot();
}
