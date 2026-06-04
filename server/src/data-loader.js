import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MaterialCalculator } from "@minecraft-calc/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

export function loadSourcesManifest() {
  const manifestPath = path.join(ROOT, "data", "sources.manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return { sources: [] };
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

export function loadGameData() {
  const manifest = loadSourcesManifest();
  const enabled = manifest.sources.filter((s) => s.enabled !== false);

  const items = [];
  const recipes = [];
  const tags = [];
  let version = "unknown";

  for (const source of enabled) {
    const base = path.join(ROOT, source.path);
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

  const byId = new Map();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  const gameData = {
    version,
    source: enabled.map((s) => s.id).join("+"),
    items: [...byId.values()],
    recipes,
    tags,
  };

  return {
    gameData,
    calculator: new MaterialCalculator(gameData),
    itemsById: byId,
  };
}
