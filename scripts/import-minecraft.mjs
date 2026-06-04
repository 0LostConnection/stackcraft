#!/usr/bin/env node
/**
 * Imports vanilla Minecraft items, recipes, tags and item icons from the client JAR.
 * Icons: only inventory-style textures (textures/item), resolved via item models.
 * Block multipart textures (door_top, door_bottom, etc.) are never used as items.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DEFAULT_JAR =
  "/home/lost/.local/share/PrismLauncher/libraries/com/mojang/minecraft/26.1.2/minecraft-26.1.2-client.jar";

const JAR = process.env.MINECRAFT_JAR || DEFAULT_JAR;
const OUT_DATA = path.join(ROOT, "data", "vanilla");
const OUT_TEXTURES = path.join(ROOT, "client", "public", "textures", "vanilla", "items");
const MISSING_TEXTURE_JAR = "assets/minecraft/textures/misc/unknown_pack.png";

/** Block texture suffixes that are parts of a multi-state block, not inventory icons */
const BLOCK_PART_SUFFIX =
  /_(top|bottom|side|front|back|left|right|inner|outer|on|off|open|closed|lit|unlit|powered|stage\d*|north|south|east|west|up|down|single|double|line|cross|overlay|particle|\d+)$/;

const CRAFT_TYPES = new Set([
  "minecraft:crafting_shaped",
  "minecraft:crafting_shapeless",
  "minecraft:smelting",
  "minecraft:blasting",
  "minecraft:smoking",
  "minecraft:campfire_cooking",
  "minecraft:stonecutting",
]);

function unzipList(jar, prefix) {
  const out = execSync(`unzip -Z1 "${jar}" "${prefix}*"`, {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function unzipRead(jar, entry) {
  return execSync(`unzip -p "${jar}" "${entry}"`, {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function unzipJson(jar, entry) {
  return JSON.parse(unzipRead(jar, entry).toString("utf8"));
}

function jarHas(jar, entry) {
  try {
    execSync(`unzip -Z1 "${jar}" "${entry}"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function normalizeId(id) {
  if (!id) return null;
  if (typeof id === "object") {
    if (id.id) return normalizeId(id.id);
    if (id.item) return normalizeId(id.item);
    if (id.tag) return id.tag.startsWith("#") ? id.tag : `#minecraft:${id.tag}`;
  }
  if (typeof id !== "string") return null;
  if (id.startsWith("#")) return id;
  return id.includes(":") ? id : `minecraft:${id}`;
}

function textureRefToJarPath(ref) {
  if (!ref || typeof ref !== "string" || ref.startsWith("#")) return null;
  const clean = ref.includes(":") ? ref : `minecraft:${ref}`;
  const [namespace, rest] = clean.split(":");
  if (!rest) return null;
  return `assets/${namespace}/textures/${rest}.png`;
}

function modelIdToPath(modelId) {
  const clean = modelId.replace(/^minecraft:/, "");
  if (clean.startsWith("item/") || clean.startsWith("block/")) {
    return `assets/minecraft/models/${clean}.json`;
  }
  return null;
}

function loadAllModels(jar, kind) {
  const map = new Map();
  const files = unzipList(jar, `assets/minecraft/models/${kind}/`);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const json = unzipJson(jar, file);
      const id = `minecraft:${kind}/${path.basename(file, ".json")}`;
      map.set(id, json);
    } catch {
      /* skip */
    }
  }
  return map;
}

function resolveModelTextures(modelId, itemModels, blockModels, visited = new Set()) {
  if (!modelId || visited.has(modelId)) return {};
  visited.add(modelId);

  const json = itemModels.get(modelId) ?? blockModels.get(modelId);
  if (!json) return {};

  let textures = {};
  if (json.parent) {
    textures = resolveModelTextures(json.parent, itemModels, blockModels, visited);
  }
  if (json.textures) {
    textures = { ...textures, ...json.textures };
  }
  return textures;
}

function pickIconPathFromTextures(textures) {
  const priority = ["layer0", "layer1", "layer2", "particle", "all"];
  for (const key of priority) {
    const jarPath = textureRefToJarPath(textures[key]);
    if (jarPath && jarPath.includes("/textures/item/")) return jarPath;
  }
  for (const key of priority) {
    const jarPath = textureRefToJarPath(textures[key]);
    if (jarPath && jarPath.includes("/textures/block/")) {
      const base = path.basename(jarPath, ".png");
      if (!BLOCK_PART_SUFFIX.test(base)) return jarPath;
    }
  }
  return null;
}

function resolveIconForSlug(slug, jar, itemModels, blockModels, itemPngSet) {
  const directItem = `assets/minecraft/textures/item/${slug}.png`;
  if (itemPngSet.has(directItem)) return directItem;

  const itemModelId = `minecraft:item/${slug}`;
  let icon = pickIconPathFromTextures(
    resolveModelTextures(itemModelId, itemModels, blockModels),
  );
  if (icon && jarHas(jar, icon)) return icon;

  const blockModelId = `minecraft:block/${slug}`;
  icon = pickIconPathFromTextures(
    resolveModelTextures(blockModelId, itemModels, blockModels),
  );
  if (icon && jarHas(jar, icon)) return icon;

  const directBlock = `assets/minecraft/textures/block/${slug}.png`;
  if (jarHas(jar, directBlock)) {
    if (!BLOCK_PART_SUFFIX.test(slug)) return directBlock;
  }

  return null;
}

function parseRecipe(file, json) {
  const type = json.type?.replace("minecraft:", "");
  if (!CRAFT_TYPES.has(json.type)) return null;

  const resultId = normalizeId(json.result);
  const resultCount = json.result?.count ?? 1;
  if (!resultId) return null;

  let ingredients = [];

  if (type === "crafting_shaped") {
    const counts = new Map();
    for (const row of json.pattern ?? []) {
      for (const ch of row) {
        if (ch === " ") continue;
        const raw = json.key?.[ch];
        const id = normalizeId(raw);
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    ingredients = [...counts.entries()].map(([id, count]) => ({
      id,
      count,
      tag: id.startsWith("#") ? id : undefined,
    }));
  } else if (type === "crafting_shapeless") {
    for (const raw of json.ingredients ?? []) {
      const id = normalizeId(raw);
      if (id) {
        const existing = ingredients.find((i) => i.id === id);
        if (existing) existing.count += 1;
        else ingredients.push({ id, count: 1, tag: id.startsWith("#") ? id : undefined });
      }
    }
  } else {
    const ing = normalizeId(json.ingredient);
    if (ing) ingredients = [{ id: ing, count: 1, tag: ing.startsWith("#") ? ing : undefined }];
  }

  return {
    id: `minecraft:${path.basename(file, ".json")}`,
    type,
    group: json.group,
    resultId,
    resultCount,
    ingredients,
    source: "vanilla",
  };
}

function buildItemRegistry(lang) {
  const ids = new Set();
  for (const key of Object.keys(lang)) {
    if (key.startsWith("item.minecraft.")) {
      ids.add(`minecraft:${key.slice("item.minecraft.".length)}`);
    }
    if (key.startsWith("block.minecraft.")) {
      ids.add(`minecraft:${key.slice("block.minecraft.".length)}`);
    }
  }
  return ids;
}

async function main() {
  if (!fs.existsSync(JAR)) {
    console.error(`JAR not found: ${JAR}`);
    process.exit(1);
  }

  console.log(`Importing from ${JAR}`);

  fs.mkdirSync(OUT_DATA, { recursive: true });
  fs.rmSync(OUT_TEXTURES, { recursive: true, force: true });
  fs.mkdirSync(OUT_TEXTURES, { recursive: true });

  const lang = unzipJson(JAR, "assets/minecraft/lang/en_us.json");
  const names = new Map();
  for (const [key, value] of Object.entries(lang)) {
    if (key.startsWith("item.minecraft.")) {
      names.set(`minecraft:${key.slice("item.minecraft.".length)}`, value);
    }
    if (key.startsWith("block.minecraft.")) {
      names.set(`minecraft:${key.slice("block.minecraft.".length)}`, value);
    }
  }

  const registryIds = buildItemRegistry(lang);
  const itemPngList = unzipList(JAR, "assets/minecraft/textures/item/").filter((p) =>
    p.endsWith(".png"),
  );
  const itemPngSet = new Set(itemPngList);

  console.log("Loading models…");
  const itemModels = loadAllModels(JAR, "item");
  const blockModels = loadAllModels(JAR, "block");

  const tags = [];
  const tagFiles = unzipList(JAR, "data/minecraft/tags/item/");
  for (const file of tagFiles) {
    if (!file.endsWith(".json")) continue;
    const json = unzipJson(JAR, file);
    const tagName = path.basename(file, ".json");
    const values = (json.values ?? [])
      .map((v) => (typeof v === "string" ? normalizeId(v) : null))
      .filter(Boolean)
      .filter((id) => registryIds.has(id))
      .sort();
    if (values.length) {
      tags.push({ id: `#minecraft:${tagName}`, values, source: "vanilla" });
    }
  }

  const recipes = [];
  const recipeFiles = unzipList(JAR, "data/minecraft/recipe/");
  for (const file of recipeFiles) {
    if (!file.endsWith(".json")) continue;
    try {
      const json = unzipJson(JAR, file);
      const parsed = parseRecipe(file, json);
      if (parsed) recipes.push(parsed);
    } catch {
      /* skip */
    }
  }

  const knownIds = new Set(registryIds);
  for (const r of recipes) {
    knownIds.add(r.resultId);
    for (const ing of r.ingredients) {
      if (!ing.id.startsWith("#")) knownIds.add(ing.id);
    }
  }

  const missingDest = path.join(OUT_TEXTURES, "_missing.png");
  fs.writeFileSync(missingDest, unzipRead(JAR, MISSING_TEXTURE_JAR));

  let copied = 1;
  let withIcon = 0;
  const iconCache = new Map();

  const items = [...knownIds].sort().map((id) => {
    const slug = id.replace("minecraft:", "");
    let jarPath = iconCache.get(slug);
    if (jarPath === undefined) {
      jarPath = resolveIconForSlug(slug, JAR, itemModels, blockModels, itemPngSet);
      iconCache.set(slug, jarPath);
    }

    const hasTexture = Boolean(jarPath);
    if (hasTexture) {
      const dest = path.join(OUT_TEXTURES, `${slug}.png`);
      if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, unzipRead(JAR, jarPath));
        copied++;
      }
      withIcon++;
    }

    return {
      id,
      name: names.get(id) ?? slug.replace(/_/g, " "),
      texture: hasTexture ? `vanilla/items/${slug}.png` : "vanilla/items/_missing.png",
      hasTexture,
      source: "vanilla",
    };
  });

  const manifest = {
    version: "26.1.2",
    source: "vanilla",
    jar: JAR,
    importedAt: new Date().toISOString(),
    iconPolicy: "item-only",
    counts: {
      items: items.length,
      itemsWithIcon: withIcon,
      itemsMissingIcon: items.length - withIcon,
      recipes: recipes.length,
      tags: tags.length,
      texturesCopied: copied,
    },
  };

  const langDir = path.join(OUT_DATA, "lang");
  fs.mkdirSync(langDir, { recursive: true });

  const enMap = Object.fromEntries(names);
  fs.writeFileSync(path.join(langDir, "en_us.json"), JSON.stringify(enMap));

  const REMOTE_LANG = {
    pt_br:
      "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/lang/pt_br.json",
    es_es:
      "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/lang/es_es.json",
  };

  for (const [code, url] of Object.entries(REMOTE_LANG)) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const map = {};
      for (const [key, value] of Object.entries(json)) {
        if (typeof value !== "string") continue;
        if (key.startsWith("item.minecraft.")) {
          map[`minecraft:${key.slice("item.minecraft.".length)}`] = value;
        }
        if (key.startsWith("block.minecraft.")) {
          map[`minecraft:${key.slice("block.minecraft.".length)}`] = value;
        }
      }
      fs.writeFileSync(path.join(langDir, `${code}.json`), JSON.stringify(map));
      console.log(`Lang ${code}: ${Object.keys(map).length} names`);
    } catch (err) {
      console.warn(`Lang ${code} skipped:`, err.message);
    }
  }

  fs.writeFileSync(path.join(OUT_DATA, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT_DATA, "items.json"), JSON.stringify(items));
  fs.writeFileSync(path.join(OUT_DATA, "recipes.json"), JSON.stringify(recipes));
  fs.writeFileSync(path.join(OUT_DATA, "tags.json"), JSON.stringify(tags));

  const sourcesManifest = path.join(ROOT, "data", "sources.manifest.json");
  const sources = fs.existsSync(sourcesManifest)
    ? JSON.parse(fs.readFileSync(sourcesManifest, "utf8"))
    : { sources: [] };
  const entry = {
    id: "vanilla",
    label: "Minecraft (vanilla)",
    path: "data/vanilla",
    textures: "client/public/textures/vanilla/items",
    enabled: true,
  };
  const idx = sources.sources.findIndex((s) => s.id === "vanilla");
  if (idx >= 0) sources.sources[idx] = entry;
  else sources.sources.unshift(entry);
  fs.mkdirSync(path.dirname(sourcesManifest), { recursive: true });
  fs.writeFileSync(sourcesManifest, JSON.stringify(sources, null, 2));

  console.log(manifest.counts);
  console.log(`Data written to ${OUT_DATA}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
