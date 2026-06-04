# StackCraft — Documentação técnica para agentes de IA

Este arquivo descreve a arquitetura, convenções e pontos de extensão do projeto **StackCraft** (`minecraft-material-calc`). Use-o como contexto principal em novas iterações com IA antes de alterar código.

## Propósito do produto

Calculadora web de materiais para construções no Minecraft. O usuário informa **itens desejados** (quantidades) e o sistema expande **receitas** até **materiais base** configuráveis, exibindo totais em unidades e em **pacotes de 64** (pilha do inventário).

Duas listas no painel direito (sempre separadas):

1. **Lista para construir** — itens pedidos pelo usuário (atualiza em tempo real; pacotes + resto).
2. **Materiais para craftar** — ingredientes base após expansão de receitas (só após clicar em Calcular; some quando a lista de pedidos muda ou fica vazia).

## Stack

| Camada | Tecnologia |
|--------|------------|
| Runtime | Node.js ≥ 20 |
| Monorepo | npm workspaces |
| Lógica | `@minecraft-calc/core` (TypeScript → `dist/`) |
| API | Express 4 (`server/`, porta **3847**) |
| UI | React 19 + Vite 6 (`client/`, porta **5173**, proxy `/api` e `/textures`) |
| Dados | JSON gerado em `data/` + PNG em `client/public/textures/` |
| Versão Minecraft importada | **26.1.2** (vanilla JAR) |
| Tag Git release | **v1.0.0** |

## Estrutura do repositório

```
minecraft-material-calc/
├── AGENTS.md                 ← este arquivo
├── README.md                 ← guia do usuário
├── package.json              ← workspaces + scripts raiz
├── packages/core/            ← calculadora (sem I/O)
│   └── src/{types,calculator,stacks,index}.ts
├── server/
│   └── src/{index.js,data-loader.js,localize.js}
├── client/
│   ├── src/
│   │   ├── App.tsx           ← estado principal
│   │   ├── api.ts            ← fetch + setApiLang
│   │   ├── i18n/             ← UI: en (default), pt, es
│   │   ├── components/       ← UI (LanguageSelector, ResultsPanel, …)
│   │   └── hooks/useStackFormat.ts
│   └── public/textures/vanilla/items/*.png
├── data/
│   ├── sources.manifest.json ← fontes habilitadas (vanilla + mods futuros)
│   └── vanilla/
│       ├── items.json, recipes.json, tags.json, manifest.json
│       └── lang/{en_us,pt_br,es_es}.json  ← nomes de itens por idioma
└── scripts/import-minecraft.mjs
```

## Fluxo de arquitetura

```mermaid
flowchart LR
  JAR[Minecraft client JAR]
  Import[import-minecraft.mjs]
  Data[data/vanilla/*.json]
  Tex[public/textures/vanilla/items]
  Core[@minecraft-calc/core]
  API[Express server]
  UI[React client]

  JAR --> Import --> Data
  Import --> Tex
  Data --> API
  Core --> API
  API --> UI
  Tex --> UI
```

## Pipeline de dados (`npm run import:vanilla`)

**Entrada:** `MINECRAFT_JAR` ou padrão PrismLauncher:
`/home/lost/.local/share/PrismLauncher/libraries/com/mojang/minecraft/26.1.2/minecraft-26.1.2-client.jar`

**O que o import faz:**

1. **Registro de itens** — apenas chaves `item.minecraft.*` e `block.minecraft.*` do `en_us.json` (catálogo unificado; não cria itens fantasmas a partir de cada PNG de bloco).
2. **Receitas** — `data/minecraft/recipe/*.json`: shaped, shapeless, smelting, blasting, smoking, campfire_cooking, stonecutting.
3. **Tags** — `data/minecraft/tags/item/*.json`; valores filtrados ao registro.
4. **Ícones (`iconPolicy: item-only`)** — uma PNG por item em `client/public/textures/vanilla/items/<slug>.png`:
   - Prioridade: `textures/item/<slug>.png` → modelos `assets/minecraft/models/item|block/<slug>.json` (layer0, etc.) → bloco único `textures/block/<slug>.png` se não for parte multipart (`_top`, `_bottom`, …).
   - Sem ícone: `hasTexture: false`, UI usa `_missing.png` (extraído de `unknown_pack` do JAR).
5. **Traduções de nomes** — `data/vanilla/lang/en_us.json` do JAR; `pt_br` e `es_es` baixados de [minecraft-assets 1.21.4](https://github.com/InventivetalentDev/minecraft-assets) (mapa `minecraft:<id>` → nome).

**Saída:** atualiza `data/sources.manifest.json` com entrada `vanilla`.

## Modelo de dados

### `ItemDef` (`packages/core/src/types.ts`)

```ts
{
  id: "minecraft:oak_planks",
  name: "Oak Planks",           // inglês em items.json; API sobrescreve via lang
  texture: "vanilla/items/oak_planks.png",
  hasTexture?: boolean,
  source: "vanilla"
}
```

### `RecipeDef`

- `resultId`, `resultCount`, `ingredients: { id, count, tag? }`
- `id` ingrediente pode ser tag: `#minecraft:planks`

### `CalculateOptions`

- `baseMaterials: ItemId[]` — parar expansão nesses itens.
- `tagChoices: Record<tagId, ItemId>` — resolver tags (ex. tábuas de carvalho).
- `recipeChoices: Record<resultId, recipeId>` — preferência de receita (pouco usado na UI).

### Expansão (`MaterialCalculator`)

- Greedy: para cada item necessário, escolhe receita (crafting preferida; senão primeira disponível).
- `batches = ceil(count / resultCount)`; ingredientes multiplicados.
- Ciclo de receita → trata como material final (evita loop infinito).
- Sem receita → acumula em `unresolved` e no total.

## API HTTP (`server/src/index.js`)

Base: `http://localhost:3847`

| Método | Rota | Query/body | Notas |
|--------|------|------------|-------|
| GET | `/api/health` | — | `version`, `items`, `recipes`, `locales` |
| GET | `/api/items` | `q`, `limit`, **`lang`** | Busca por id/nome |
| GET | `/api/items/:id` | **`lang`** | Item + receitas |
| GET | `/api/tags/:id` | **`lang`** | `values` + `items` localizados |
| POST | `/api/calculate` | body + **`lang`** (query) | Ver abaixo |
| — | `/textures/*` | — | Static de `client/public/textures` |

**`lang`:** `en` / `en_us` (default), `pt` / `pt_br`, `es` / `es_es`. Implementação em `server/src/localize.js`.

**Cache de idiomas:** `langMaps` inicia como `null`; não usar `{}` vazio como “já carregado” (bug corrigido: `langMaps !== null`).

**POST `/api/calculate` body:**

```json
{
  "targets": [{ "id": "minecraft:oak_fence", "count": 30 }],
  "baseMaterials": ["minecraft:oak_log"],
  "tagChoices": { "#minecraft:planks": "minecraft:oak_planks" },
  "recipeChoices": {}
}
```

## Cliente React — regras de estado (`App.tsx`)

**Invalidar resultado de craft** (`setResult(null)`) quando mudam:

- `targets` (adicionar, remover, quantidade)
- `baseMaterials`
- `tagChoices`

**Ao remover todos os targets:** `ResultsPanel` usa `craftResult = hasTargets ? result : null` — nunca mostra craft órfão.

**Idioma UI:** `I18nProvider` → `locale`: `en` | `pt` | `es` (default **en**), `localStorage` key `stackcraft-locale`.

**Idioma API:** `setApiLang(LOCALE_API[locale])` em `useEffect`; todas as chamadas em `api.ts` usam `?lang=`.

**Ao trocar `localeTag`:** re-busca nomes dos itens em `targets` via `fetchItem`.

**Componentes principais:**

| Componente | Responsabilidade |
|------------|------------------|
| `LanguageSelector` | Bandeiras; fechado = círculo; aberto = pill; clique fechado abre, aberto seleciona |
| `ItemSearch` | Autocomplete itens |
| `ResultsPanel` | Duas seções + legenda HTML via `t("legend")` |
| `MaterialListSection` | Lista com `useStackFormat()` |
| `ItemIcon` | Textura ou `_missing.png` |

## Internacionalização

### UI (`client/src/i18n/locales/{en,pt,es}.json`)

Chaves usadas em `t("chave", { vars })`. Inglês é fallback se chave faltar.

### Nomes de itens (`data/vanilla/lang/*.json`)

Servidor mescla em `localizeItem`. Não duplicar nomes em `items.json` para outros idiomas — só atualizar JSON de lang após reimport.

## Comandos de desenvolvimento

```bash
cd /home/lost/Projects/minecraft-material-calc
npm install
npm run import:vanilla          # após mudar JAR ou política de ícones
npm run build -w @minecraft-calc/core   # obrigatório antes do server se core mudou
npm run dev:server              # :3847
npm run dev:client              # :5173
npm run build                   # produção: core + client; server serve client/dist se NODE_ENV=production
```

## Extensão para mods (planejado, não implementado end-to-end)

1. Gerar `data/mods/<modid>/` com o mesmo formato que `data/vanilla/` (`items.json`, `recipes.json`, `tags.json`, opcional `lang/`).
2. Copiar texturas para `client/public/textures/mods/<modid>/items/`.
3. Registrar em `data/sources.manifest.json` com `"enabled": true`.
4. `server/src/data-loader.js` já faz merge de todas as fontes habilitadas; último `itemsById` ganha em duplicata de id.

Generalizar `scripts/import-minecraft.mjs` ou criar `import-jar.mjs` parametrizado por caminho JAR + `sourceId`.

## Limitações conhecidas

- **~1440 itens** sem ícone 2D (modelos 3D only no jogo, ex. cercas).
- **Traduções pt/es** vêm de assets 1.21.4 — nomes de itens novos do 26.1.2 podem faltar (fallback: `en_us` → `item.name`).
- **Uma receita por expansão** — não otimiza custo mínimo global; múltiplas receitas para o mesmo resultado usam heurística (crafting primeiro).
- **Sem crafting table 3×3 grid UI** — só matemática de ingredientes.
- Receitas de modded com formatos NeoForge custom podem não parsear se o JSON divergir do vanilla.

## Convenções para alterações (IA)

1. **Escopo mínimo** — não refatorar fora do pedido.
2. **Lógica de cálculo** só em `packages/core`; rebuild core após mudança TS.
3. **Novos campos em itens/receitas** — atualizar `types.ts`, import script, `data-loader`, API enrichment e tipos em `client/src/api.ts`.
4. **UI** — manter tema Minecraft (variáveis CSS em `global.css` / `app.css`); texturas `image-rendering: pixelated`.
5. **Textos visíveis** — adicionar chaves nos três JSON de `i18n/locales/`; inglês default.
6. **Não commitar** `node_modules/`, `.env`; dados gerados (`data/vanilla`, texturas) já estão no repo v1.0.0.
7. **Testar manualmente:** 30 `oak_fence` + base `oak_log` + tag planks → **13 oak_log**; remover targets → craft some; trocar idioma → nomes da API mudam.

## Instância do usuário (referência)

PrismLauncher: `Intermediate Version` — NeoForge **26.1.2.71**, MC **26.1.2**. JAR vanilla usado no import coincide com essa versão.

## Histórico relevante de decisões

| Decisão | Motivo |
|---------|--------|
| Catálogo só item+block do lang | Evitar `oak_door_top` como item separado |
| Pasta única `vanilla/items/` | Um ícone por entrada de inventário |
| `en` default na UI | Pedido do usuário; MC JAR só traz `en_us` nativo |
| Invalidar `result` ao mudar lista | Bug: craft permanecia após remover itens |
| LanguageSelector sem overlay hitarea | Overlay impedia reabrir após seleção |

---

**Última revisão:** alinhado ao estado pós-v1.0.0 (i18n, ícones item-only, listas separadas construir/craft).
