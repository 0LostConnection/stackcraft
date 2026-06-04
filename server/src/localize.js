import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const SUPPORTED = new Set(["en_us", "pt_br", "es_es"]);

/** @type {Record<string, Record<string, string>>} */
let langMaps = null;

function parseLangJson(json) {
  /** @type {Record<string, string>} */
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
  return map;
}

export function loadLangMaps() {
  if (langMaps !== null) return langMaps;

  langMaps = {};
  const langDir = path.join(ROOT, "data", "vanilla", "lang");
  if (!fs.existsSync(langDir)) {
    return langMaps;
  }

  for (const file of fs.readdirSync(langDir)) {
    if (!file.endsWith(".json")) continue;
    const code = file.replace(".json", "");
    if (!SUPPORTED.has(code)) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(langDir, file), "utf8"));
    langMaps[code] =
      typeof raw === "object" && !Array.isArray(raw) && raw["minecraft:stone"]
        ? raw
        : parseLangJson(raw);
  }

  return langMaps;
}

/** @param {import('express').Request} req */
export function resolveLang(req) {
  const raw = String(req.query.lang ?? req.headers["x-lang"] ?? "en")
    .toLowerCase()
    .trim();
  if (raw === "pt" || raw === "pt_br" || raw === "pt-br") return "pt_br";
  if (raw === "es" || raw === "es_es" || raw === "es-es") return "es_es";
  return "en_us";
}

export function reloadLangMaps() {
  langMaps = null;
  return loadLangMaps();
}

export function localizeItem(item, langCode) {
  const maps = loadLangMaps();
  const names = maps[langCode];
  const localized = names?.[item.id] ?? maps.en_us?.[item.id] ?? item.name;
  return { ...item, name: localized };
}

export function getSupportedLocales() {
  return ["en_us", "pt_br", "es_es"];
}
