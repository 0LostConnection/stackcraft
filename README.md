# StackCraft — Minecraft Material Calculator

Interactive web app (React + Node) that calculates how many base materials you need for a build by expanding crafting, furnace, and stonecutter recipes.

> [!IMPORTANT]
> This project was developed with assistance from [Cursor](https://cursor.com) (AI-assisted coding in the IDE).

**Technical documentation for AI agents:** see [AGENTS.md](./AGENTS.md).

## Features

- **Unified item catalog** (items + blocks) with one inventory icon per entry
- Icons from `textures/item` or item models only; block parts (door top/bottom) are not separate items
- Items that are 3D-only in-game use an in-app placeholder (no shipped textures)
- **Stack legend**: `3 stacks + 12` = 3×64 + 12 units
- **Recipe tree** for craft materials — expandable breakdown from each build item down to base ingredients
- **Configurable base materials** (e.g. stop at planks if you already have them, not logs)
- **Tag preferences** (wood type, etc.)
- **UI languages**: English (default), Portuguese, Spanish
- **Modular architecture** for future mods

## Requirements

- Node.js 20+
- A **Minecraft client JAR** on your machine (from the official launcher, PrismLauncher, etc.)

## Quick start

This repo does **not** include extracted Minecraft data or textures. You must import them locally:

```bash
npm install
MINECRAFT_JAR=/path/to/minecraft-client.jar npm run import:vanilla
npm run build -w @minecraft-calc/core
npm run dev:server       # terminal 1 — http://localhost:3847
npm run dev:client       # terminal 2 — http://localhost:5173
```

`MINECRAFT_JAR` is **required** for import (there is no default path).

Generated output (gitignored):

- `data/vanilla/` — `items.json`, `recipes.json`, `tags.json`, `lang/`
- `client/public/textures/vanilla/items/` — PNG icons

## Project layout

```
data/vanilla/          # generated JSON + lang (not in git)
data/sources.manifest.json
client/public/textures/vanilla/items/   # generated PNGs (not in git)
packages/core/         # calculation logic (@minecraft-calc/core)
server/                # Express API
client/                # React UI
scripts/import-minecraft.mjs
```

## Adding mods (future)

1. Add or adapt an `import-jar.mjs` script for the mod JAR
2. Generate `data/mods/<modid>/items.json`, etc.
3. Register the source in `data/sources.manifest.json` with `"enabled": true`

## API

- `GET /api/health` — includes `dataReady` and import hint when data is missing
- `GET /api/items?q=oak&lang=en` — search items (503 until import)
- `POST /api/calculate` — `{ targets, baseMaterials, tagChoices }`

## License

StackCraft source code is licensed under the [MIT License](./LICENSE) (Copyright © 2026 Geovane Saraiva da Silva).

Minecraft assets (textures, recipes, names) belong to Mojang/Microsoft. This tool is unofficial fan software. Do not redistribute imported game files.
