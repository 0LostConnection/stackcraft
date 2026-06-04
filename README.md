# StackCraft — Calculadora de Materiais Minecraft

App interativo (React + Node) que calcula quantos materiais base você precisa para uma construção, expandindo receitas de crafting, fornalha e stonecutter.

## Recursos

- **Catálogo unificado de itens** (itens + blocos do jogo) com ícone de inventário por entrada
- Ícones só de `textures/item` ou modelos de item; partes de bloco (porta cima/baixo) não viram itens separados
- Itens só 3D no jogo usam placeholder (`unknown_pack`)
- **Legenda em pacotes**: `3 pacotes + 12` = 3×64 + 12 unidades
- **Materiais base** configuráveis (para quando você já tem tábuas, não troncos)
- **Preferências de tags** (tipo de madeira, etc.)
- **Arquitetura modular** para mods futuros

## Requisitos

- Node.js 20+
- JAR do Minecraft (padrão: PrismLauncher `minecraft-26.1.2-client.jar`)

## Uso rápido

```bash
cd /home/lost/Projects/minecraft-material-calc
npm install
npm run import:vanilla   # extrai itens, receitas, texturas (~1 min)
npm run build -w @minecraft-calc/core
npm run dev:server       # terminal 1 — http://localhost:3847
npm run dev:client       # terminal 2 — http://localhost:5173
```

Ou use outro JAR:

```bash
MINECRAFT_JAR=/caminho/para/minecraft-client.jar npm run import:vanilla
```

## Estrutura

```
data/vanilla/          # items.json, recipes.json, tags.json (gerado)
client/public/textures/vanilla/items/
packages/core/         # lógica de cálculo (@minecraft-calc/core)
server/                # API Express
client/                # UI React
scripts/import-minecraft.mjs
data/sources.manifest.json   # lista de fontes (vanilla + mods)
```

## Adicionar mods (futuro)

1. Copie/adicione um script `import-jar.mjs` apontando para o JAR do mod
2. Gere `data/mods/<modid>/items.json` etc.
3. Registre em `data/sources.manifest.json` com `"enabled": true`

## API

- `GET /api/items?q=oak` — busca itens
- `POST /api/calculate` — `{ targets, baseMaterials, tagChoices }`
