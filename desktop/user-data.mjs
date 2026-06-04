import fs from "node:fs";
import path from "node:path";

export function ensureUserData(userDataRoot, bundleRoot) {
  const dirs = [
    path.join(userDataRoot, "data", "vanilla"),
    path.join(userDataRoot, "data", "vanilla", "lang"),
    path.join(userDataRoot, "client", "public", "textures", "vanilla", "items"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const manifestDest = path.join(userDataRoot, "data", "sources.manifest.json");
  if (!fs.existsSync(manifestDest)) {
    const manifestSrc = path.join(bundleRoot, "data", "sources.manifest.json");
    if (fs.existsSync(manifestSrc)) {
      fs.copyFileSync(manifestSrc, manifestDest);
    }
  }
}
