import fs from "node:fs";
import path from "node:path";
import { MaterialCalculator } from "@minecraft-calc/core";
import { getAppRoot } from "./paths.js";

export function loadSourcesManifest(root = getAppRoot()) {
  const manifestPath = path.join(root, "data", "sources.manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return { sources: [] };
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

/** @param {{ sources: Array<{ id: string, path: string, enabled?: boolean }> }} manifest */
export function inspectDataFiles(manifest, root = getAppRoot()) {
  const enabled = manifest.sources.filter((s) => s.enabled !== false);
  const missing = [];

  for (const source of enabled) {
    const base = path.join(root, source.path);
    const required = ["items.json", "recipes.json", "tags.json"];
    for (const file of required) {
      const filePath = path.join(base, file);
      if (!fs.existsSync(filePath)) {
        missing.push({ sourceId: source.id, file: path.join(source.path, file) });
      }
    }
  }

  return {
    ready: missing.length === 0,
    missing,
    importCommand: "MINECRAFT_JAR=/path/to/minecraft-client.jar npm run import:vanilla",
  };
}

export function loadGameData(root = getAppRoot()) {
  const manifest = loadSourcesManifest(root);
  const dataStatus = inspectDataFiles(manifest, root);
  const enabled = manifest.sources.filter((s) => s.enabled !== false);

  const items = [];
  const recipes = [];
  const tags = [];
  let version = "unknown";

  if (dataStatus.ready) {
    for (const source of enabled) {
      const base = path.join(root, source.path);
      const mPath = path.join(base, "manifest.json");
      if (fs.existsSync(mPath)) {
        const m = JSON.parse(fs.readFileSync(mPath, "utf8"));
        version = m.version ?? version;
      }
      if (fs.existsSync(path.join(base, "items.json"))) {
        items.push(...JSON.parse(fs.readFileSync(path.join(base, "items.json"), "utf8")));
      }
      if (fs.existsSync(path.join(base, "recipes.json"))) {
        recipes.push(
          ...JSON.parse(fs.readFileSync(path.join(base, "recipes.json"), "utf8")),
        );
      }
      if (fs.existsSync(path.join(base, "tags.json"))) {
        tags.push(...JSON.parse(fs.readFileSync(path.join(base, "tags.json"), "utf8")));
      }
    }
  } else if (enabled.length > 0) {
    console.warn(
      "[stackcraft] Game data not imported. Run:",
      dataStatus.importCommand,
    );
    if (dataStatus.missing.length > 0) {
      console.warn(
        "[stackcraft] Missing:",
        dataStatus.missing.map((m) => m.file).join(", "),
      );
    }
  }

  const byId = new Map();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  const gameData = {
    version,
    source: enabled.map((s) => s.id).join("+") || "none",
    items: [...byId.values()],
    recipes,
    tags,
  };

  return {
    gameData,
    calculator: new MaterialCalculator(gameData),
    itemsById: byId,
    dataStatus,
  };
}

export function texturesDirExists(root = getAppRoot()) {
  const dir = path.join(root, "client", "public", "textures", "vanilla", "items");
  if (!fs.existsSync(dir)) return false;
  try {
    const entries = fs.readdirSync(dir).filter((n) => n !== ".gitkeep");
    return entries.length > 0;
  } catch {
    return false;
  }
}

export function vanillaDataImported(root = getAppRoot()) {
  return fs.existsSync(path.join(root, "data", "vanilla", "items.json"));
}
