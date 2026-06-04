import { breakdownStacks } from "./stacks.js";
import type {
  CalculateOptions,
  CalculateResult,
  CalculateTarget,
  GameData,
  ItemId,
  MaterialLine,
  MaterialNode,
  RecipeDef,
  RecipeIngredient,
} from "./types.js";

const CRAFT_TYPES = new Set([
  "crafting_shaped",
  "crafting_shapeless",
  "smelting",
  "blasting",
  "smoking",
  "campfire_cooking",
  "stonecutting",
]);

export class MaterialCalculator {
  private recipesByResult = new Map<ItemId, RecipeDef[]>();
  private tags = new Map<string, ItemId[]>();
  private itemIds = new Set<ItemId>();

  constructor(data: GameData) {
    for (const item of data.items) {
      this.itemIds.add(item.id);
    }
    for (const tag of data.tags) {
      this.tags.set(tag.id, tag.values);
    }
    for (const recipe of data.recipes) {
      if (!CRAFT_TYPES.has(recipe.type)) continue;
      const list = this.recipesByResult.get(recipe.resultId) ?? [];
      list.push(recipe);
      this.recipesByResult.set(recipe.resultId, list);
    }
  }

  calculate(
    targets: CalculateTarget[],
    options: CalculateOptions,
  ): CalculateResult {
    const totals = new Map<ItemId, number>();
    const unresolved = new Set<ItemId>();
    const bases = new Set(options.baseMaterials);

    for (const target of targets) {
      if (target.count <= 0) continue;
      this.expand(
        target.id,
        target.count,
        totals,
        bases,
        options,
        new Set(),
        unresolved,
      );
    }

    const materials: MaterialLine[] = [...totals.entries()]
      .map(([id, count]) => ({
        id,
        count,
        stacks: breakdownStacks(count),
      }))
      .sort((a, b) => b.count - a.count);

    const tree: MaterialNode[] = [];
    for (const target of targets) {
      if (target.count <= 0) continue;
      tree.push(
        this.expandTree(
          target.id,
          target.count,
          bases,
          options,
          new Set(),
          unresolved,
        ),
      );
    }

    return {
      materials,
      tree,
      unresolved: [...unresolved],
    };
  }

  private expandTree(
    itemId: ItemId,
    count: number,
    bases: Set<ItemId>,
    options: CalculateOptions,
    visiting: Set<ItemId>,
    unresolved: Set<ItemId>,
  ): MaterialNode {
    const resolvedId = this.resolveItem(itemId, options);
    const stacks = breakdownStacks(count);

    if (bases.has(resolvedId)) {
      return { id: resolvedId, count, stacks, isBase: true };
    }

    if (visiting.has(resolvedId)) {
      return { id: resolvedId, count, stacks, isLeaf: true };
    }

    const recipes = this.recipesByResult.get(resolvedId);
    if (!recipes?.length) {
      if (!this.itemIds.has(resolvedId)) {
        unresolved.add(resolvedId);
      }
      return { id: resolvedId, count, stacks, isLeaf: true };
    }

    const recipe = this.pickRecipe(resolvedId, recipes, options);
    const batches = Math.ceil(count / recipe.resultCount);
    visiting.add(resolvedId);

    const children = recipe.ingredients.map((ing) => {
      const ingId = this.resolveItem(ing.id, options);
      return this.expandTree(
        ingId,
        ing.count * batches,
        bases,
        options,
        visiting,
        unresolved,
      );
    });

    visiting.delete(resolvedId);
    return { id: resolvedId, count, stacks, children };
  }

  private expand(
    itemId: ItemId,
    count: number,
    totals: Map<ItemId, number>,
    bases: Set<ItemId>,
    options: CalculateOptions,
    visiting: Set<ItemId>,
    unresolved: Set<ItemId>,
  ): void {
    const resolvedId = this.resolveItem(itemId, options);

    if (bases.has(resolvedId)) {
      this.add(totals, resolvedId, count);
      return;
    }

    if (visiting.has(resolvedId)) {
      this.add(totals, resolvedId, count);
      return;
    }

    const recipes = this.recipesByResult.get(resolvedId);
    if (!recipes?.length) {
      this.add(totals, resolvedId, count);
      if (!this.itemIds.has(resolvedId)) {
        unresolved.add(resolvedId);
      }
      return;
    }

    const recipe = this.pickRecipe(resolvedId, recipes, options);
    const batches = Math.ceil(count / recipe.resultCount);
    visiting.add(resolvedId);

    for (const ing of recipe.ingredients) {
      const ingId = this.resolveItem(ing.id, options);
      this.expand(
        ingId,
        ing.count * batches,
        totals,
        bases,
        options,
        visiting,
        unresolved,
      );
    }

    visiting.delete(resolvedId);
  }

  private pickRecipe(
    resultId: ItemId,
    recipes: RecipeDef[],
    options: CalculateOptions,
  ): RecipeDef {
    const preferred = options.recipeChoices[resultId];
    if (preferred) {
      const found = recipes.find((r) => r.id === preferred);
      if (found) return found;
    }
    const crafting = recipes.filter((r) =>
      r.type.startsWith("crafting"),
    );
    if (crafting.length) return crafting[0];
    return recipes[0];
  }

  private resolveItem(id: ItemId, options: CalculateOptions): ItemId {
    if (id.startsWith("#")) {
      const chosen = options.tagChoices[id];
      if (chosen) return chosen;
      const tagValues = this.tags.get(id);
      if (tagValues?.length) return tagValues[0];
      return id;
    }
    return id;
  }

  private add(totals: Map<ItemId, number>, id: ItemId, count: number): void {
    totals.set(id, (totals.get(id) ?? 0) + count);
  }

  getRecipesFor(itemId: ItemId): RecipeDef[] {
    return this.recipesByResult.get(itemId) ?? [];
  }

  getTagValues(tagId: string): ItemId[] {
    return this.tags.get(tagId) ?? [];
  }
}

export function flattenShapedIngredients(
  pattern: string[],
  key: Record<string, string | string[]>,
): RecipeIngredient[] {
  const counts = new Map<string, number>();
  for (const row of pattern) {
    for (const char of row) {
      if (char === " ") continue;
      const raw = key[char];
      const id = normalizeIngredientRef(raw);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([id, count]) => ({
    id,
    count,
    tag: id.startsWith("#") ? id : undefined,
  }));
}

export function normalizeIngredientRef(
  raw: string | string[] | { item?: string; tag?: string },
): ItemId {
  if (typeof raw === "string") {
    return raw.startsWith("#") ? raw : raw.includes(":") ? raw : `minecraft:${raw}`;
  }
  if (Array.isArray(raw)) {
    return normalizeIngredientRef(raw[0]);
  }
  if (raw.tag) return raw.tag.startsWith("#") ? raw.tag : `#minecraft:${raw.tag}`;
  if (raw.item) return normalizeIngredientRef(raw.item);
  return "minecraft:unknown";
}
