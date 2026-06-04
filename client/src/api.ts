import type { StackBreakdown } from "./stacks-format";

export type { StackBreakdown };
export { breakdownStacks, formatStacks } from "./stacks-format";

export interface ItemDef {
  id: string;
  name: string;
  texture: string;
  hasTexture?: boolean;
  source: string;
}

export interface MaterialLine {
  id: string;
  count: number;
  stacks: StackBreakdown;
  item: ItemDef;
}

export interface CalculateResult {
  materials: MaterialLine[];
  unresolved: string[];
}

export interface TargetEntry {
  id: string;
  count: number;
  item?: ItemDef;
}

const API = "";

let apiLang = "en_us";

export function setApiLang(lang: string) {
  apiLang = lang;
}

function withLang(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}lang=${encodeURIComponent(apiLang)}`;
}

export async function searchItems(q: string): Promise<ItemDef[]> {
  const res = await fetch(
    withLang(`${API}/api/items?q=${encodeURIComponent(q)}&limit=50`),
  );
  if (!res.ok) throw new Error("Failed to fetch items");
  return res.json();
}

export async function calculate(body: {
  targets: { id: string; count: number }[];
  baseMaterials: string[];
  tagChoices: Record<string, string>;
}): Promise<CalculateResult> {
  const res = await fetch(withLang(`${API}/api/calculate`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Calculation failed");
  }
  return res.json();
}

export async function fetchItem(id: string): Promise<ItemDef | null> {
  const res = await fetch(withLang(`${API}/api/items/${encodeURIComponent(id)}`));
  if (!res.ok) return null;
  const data = (await res.json()) as { item: ItemDef };
  return data.item;
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  version: string;
  items: number;
}> {
  const res = await fetch(`${API}/api/health`);
  return res.json();
}

export function textureUrl(texture: string): string {
  return `/textures/${texture}`;
}
