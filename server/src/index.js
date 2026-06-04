import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./app.js";

const isMainModule =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
