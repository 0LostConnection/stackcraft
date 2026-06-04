# StackCraft — Minecraft Material Calculator

Interactive web app (React + Node) that calculates how many base materials you need for a build by expanding crafting, furnace, and stonecutter recipes.

> [!IMPORTANT]
> This project was developed with assistance from [Cursor](https://cursor.com) (AI-assisted coding in the IDE).

**Technical documentation for AI agents:** see [AGENTS.md](./AGENTS.md).

## Features

- **Unified item catalog** (items + blocks) with one inventory icon per entry
- Icons from `textures/item` or item models only; block parts (door top/bottom) are not separate items
- Items that are 3D-only in-game use a placeholder (`unknown_pack`)
- **Stack legend**: `3 stacks + 12` = 3×64 + 12 units
- **Configurable base materials** (e.g. stop at planks if you already have them, not logs)
- **Tag preferences** (wood type, etc.)
- **UI languages**: English (default), Portuguese, Spanish
- **Modular architecture** for future mods

## Requirements

- Node.js 20+
- Minecraft client JAR (default: PrismLauncher `minecraft-26.1.2-client.jar`)

## Quick start

```bash
git clone https://github.com/0LostConnection/stackcraft.git
cd stackcraft
npm install
npm run import:vanilla   # extract items, recipes, textures (~1 min)
npm run build -w @minecraft-calc/core
npm run dev:server       # terminal 1 — http://localhost:3847
npm run dev:client       # terminal 2 — http://localhost:5173
```

Or point at another JAR:

```bash
MINECRAFT_JAR=/path/to/minecraft-client.jar npm run import:vanilla
```

## Project layout

```
data/vanilla/          # items.json, recipes.json, tags.json (generated)
client/public/textures/vanilla/items/
packages/core/         # calculation logic (@minecraft-calc/core)
server/                # Express API
client/                # React UI
scripts/import-minecraft.mjs
data/sources.manifest.json   # data sources (vanilla + mods)
```

## Adding mods (future)

1. Add or adapt an `import-jar.mjs` script for the mod JAR
2. Generate `data/mods/<modid>/items.json`, etc.
3. Register the source in `data/sources.manifest.json` with `"enabled": true`

## API

- `GET /api/items?q=oak&lang=en` — search items
- `POST /api/calculate` — `{ targets, baseMaterials, tagChoices }`

## License

Minecraft assets (textures, recipes, names) belong to Mojang/Microsoft. This tool is unofficial fan software.
