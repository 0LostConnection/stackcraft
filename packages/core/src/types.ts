export type ItemId = string;

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Inventory-style icon path (always under items/) */
  texture: string;
  hasTexture?: boolean;
  source: string;
}

export interface RecipeIngredient {
  id: ItemId;
  count: number;
  /** Tag reference when ingredient came from a tag */
  tag?: string;
}

export interface RecipeDef {
  id: string;
  type: "crafting_shaped" | "crafting_shapeless" | "smelting" | "blasting" | "smoking" | "campfire_cooking" | "stonecutting";
  group?: string;
  resultId: ItemId;
  resultCount: number;
  ingredients: RecipeIngredient[];
  source: string;
}

export interface TagDef {
  id: string;
  values: ItemId[];
  source: string;
}

export interface GameData {
  version: string;
  source: string;
  items: ItemDef[];
  recipes: RecipeDef[];
  tags: TagDef[];
}

export interface StackBreakdown {
  total: number;
  stacks: number;
  remainder: number;
  stackSize: number;
}

export interface CalculateTarget {
  id: ItemId;
  count: number;
}

export interface CalculateOptions {
  /** Items that should not be broken down further */
  baseMaterials: ItemId[];
  /** Map tag id -> chosen item id (e.g. #minecraft:planks -> minecraft:oak_planks) */
  tagChoices: Record<string, ItemId>;
  /** Prefer a specific recipe id when multiple exist */
  recipeChoices: Record<ItemId, string>;
}

export interface MaterialLine {
  id: ItemId;
  count: number;
  stacks: StackBreakdown;
}

export interface CalculateResult {
  materials: MaterialLine[];
  unresolved: ItemId[];
}
