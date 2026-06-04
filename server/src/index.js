import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGameData, loadSourcesManifest } from "./data-loader.js";
import {
  getSupportedLocales,
  localizeItem,
  loadLangMaps,
  resolveLang,
} from "./localize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PORT = Number(process.env.PORT) || 3847;

const { gameData, calculator, itemsById } = loadGameData();
loadLangMaps();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    version: gameData.version,
    items: gameData.items.length,
    recipes: gameData.recipes.length,
    locales: getSupportedLocales(),
  });
});

app.get("/api/locales", (_req, res) => {
  res.json({ locales: getSupportedLocales() });
});

app.get("/api/sources", (_req, res) => {
  res.json(loadSourcesManifest());
});

app.get("/api/items", (req, res) => {
  const q = String(req.query.q ?? "")
    .toLowerCase()
    .trim();
  const limit = Math.min(Number(req.query.limit) || 40, 100);

  let list = gameData.items;
  if (q) {
    list = list.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q),
    );
  }
  const lang = resolveLang(req);
  res.json(
    list.slice(0, limit).map((item) => localizeItem(item, lang)),
  );
});

app.get("/api/items/:id", (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const item = itemsById.get(id);
  if (!item) {
    res.status(404).json({ error: "Item não encontrado" });
    return;
  }
  const lang = resolveLang(req);
  const recipes = calculator.getRecipesFor(id);
  res.json({ item: localizeItem(item, lang), recipes });
});

app.get("/api/tags/:id", (req, res) => {
  const tagId = decodeURIComponent(req.params.id);
  const values = calculator.getTagValues(tagId);
  const lang = resolveLang(req);
  const items = values
    .map((id) => itemsById.get(id))
    .filter(Boolean)
    .map((item) => localizeItem(item, lang));
  res.json({ id: tagId, values, items });
});

app.get("/api/tags", (_req, res) => {
  res.json(gameData.tags);
});

app.post("/api/calculate", (req, res) => {
  const {
    targets = [],
    baseMaterials = [],
    tagChoices = {},
    recipeChoices = {},
  } = req.body ?? {};

  if (!Array.isArray(targets) || targets.length === 0) {
    res.status(400).json({ error: "Informe ao menos um item desejado" });
    return;
  }

  const result = calculator.calculate(
    targets.map((t) => ({
      id: t.id,
      count: Math.max(1, Number(t.count) || 1),
    })),
    {
      baseMaterials,
      tagChoices,
      recipeChoices,
    },
  );

  const lang = resolveLang(req);
  const enriched = {
    ...result,
    materials: result.materials.map((line) => {
      const base =
        itemsById.get(line.id) ?? {
          id: line.id,
          name: line.id.replace("minecraft:", ""),
          texture: `vanilla/items/${line.id.replace("minecraft:", "")}.png`,
          hasTexture: false,
          source: "unknown",
        };
      return {
        ...line,
        item: localizeItem(base, lang),
      };
    }),
  };

  res.json(enriched);
});

app.use(
  "/textures",
  express.static(path.join(ROOT, "client", "public", "textures")),
);

const clientDist = path.join(ROOT, "client", "dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(
    `Minecraft Material Calc — http://localhost:${PORT} (${gameData.items.length} itens)`,
  );
});
