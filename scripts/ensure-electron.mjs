#!/usr/bin/env node
/**
 * Ensures the Electron binary is present under node_modules/electron/dist.
 * npm may skip electron's postinstall (allowScripts); extract-zip can also fail
 * on some setups — we fall back to system unzip when needed.
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveElectronDir() {
  return path.dirname(require.resolve("electron/package.json", { paths: [root] }));
}

function platformExecutable() {
  if (process.platform === "win32") return "electron.exe";
  if (process.platform === "darwin") {
    return "Electron.app/Contents/MacOS/Electron";
  }
  return "electron";
}

function isReady(electronDir) {
  const exe = path.join(electronDir, "dist", platformExecutable());
  const pathFile = path.join(electronDir, "path.txt");
  return fs.existsSync(exe) && fs.existsSync(pathFile);
}

function extractWithUnzip(zipPath, distPath) {
  fs.mkdirSync(distPath, { recursive: true });
  const result = spawnSync("unzip", ["-q", "-o", zipPath, "-d", distPath], {
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(
      `unzip failed: ${result.error.message}. Install unzip (Linux/macOS).`,
    );
  }
  if (result.status !== 0) {
    throw new Error(`unzip exited with code ${result.status}`);
  }
}

async function main() {
  if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD) {
    console.warn(
      "[ensure-electron] ELECTRON_SKIP_BINARY_DOWNLOAD is set — skipping download.",
    );
    return;
  }

  const electronDir = resolveElectronDir();
  if (isReady(electronDir)) {
    return;
  }

  console.log("[ensure-electron] Downloading Electron binary…");

  const { downloadArtifact } = require("@electron/get");
  const { version } = require(path.join(electronDir, "package.json"));

  const zipPath = await downloadArtifact({
    version,
    artifactName: "electron",
    platform: process.env.npm_config_platform || process.platform,
    arch: process.env.npm_config_arch || process.arch,
    checksums: require(path.join(electronDir, "checksums.json")),
  });

  const distPath = path.join(electronDir, "dist");
  fs.rmSync(distPath, { recursive: true, force: true });
  extractWithUnzip(zipPath, distPath);

  const exeRel = platformExecutable();
  const exePath = path.join(distPath, exeRel);
  if (!fs.existsSync(exePath)) {
    throw new Error(
      `[ensure-electron] Expected binary missing after extract: ${exePath}`,
    );
  }

  fs.writeFileSync(path.join(electronDir, "path.txt"), exeRel);
  fs.writeFileSync(path.join(distPath, "version"), `v${version}`);
  console.log(`[ensure-electron] Ready (Electron ${version})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
