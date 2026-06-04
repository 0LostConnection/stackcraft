#!/usr/bin/env node
/**
 * Removes Minecraft data produced by import-minecraft.mjs (repo or STACKCRAFT_ROOT).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.STACKCRAFT_ROOT
  ? path.resolve(process.env.STACKCRAFT_ROOT)
  : path.resolve(__dirname, "..");

const VANILLA_DATA = path.join(ROOT, "data", "vanilla");
const VANILLA_LANG = path.join(VANILLA_DATA, "lang");
const VANILLA_TEXTURES = path.join(
  ROOT,
  "client",
  "public",
  "textures",
  "vanilla",
  "items",
);

const VANILLA_JSON = ["items.json", "recipes.json", "tags.json", "manifest.json"];

function removeFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  fs.rmSync(filePath, { force: true });
  return true;
}

/** @param {string} dir */
function cleanDirKeepingGitkeep(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".gitkeep") continue;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
    removed++;
  }
  return removed;
}

function main() {
  let count = 0;

  for (const file of VANILLA_JSON) {
    if (removeFile(path.join(VANILLA_DATA, file))) {
      console.log(`Removed ${path.relative(ROOT, path.join(VANILLA_DATA, file))}`);
      count++;
    }
  }

  const langRemoved = cleanDirKeepingGitkeep(VANILLA_LANG);
  if (langRemoved) {
    console.log(
      `Removed ${langRemoved} file(s) from ${path.relative(ROOT, VANILLA_LANG)}/`,
    );
    count += langRemoved;
  }

  const texRemoved = cleanDirKeepingGitkeep(VANILLA_TEXTURES);
  if (texRemoved) {
    console.log(
      `Removed ${texRemoved} file(s) from ${path.relative(ROOT, VANILLA_TEXTURES)}/`,
    );
    count += texRemoved;
  }

  if (count === 0) {
    console.log("Nothing to clean — no imported vanilla data found.");
    return;
  }

  console.log(`Done. Cleaned under ${ROOT}`);
  if (!process.env.STACKCRAFT_ROOT) {
    console.log(
      "Desktop app data lives in Electron userData; set STACKCRAFT_ROOT to that folder to clean it.",
    );
  }
}

main();
