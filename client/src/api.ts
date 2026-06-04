export interface ItemDef {
  id: string;
  name: string;
  texture: string;
  hasTexture?: boolean;
  source: string;
}

export interface StackBreakdown {
  total: number;
  stacks: number;
  remainder: number;
  stackSize: number;
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

export async function searchItems(q: string): Promise<ItemDef[]> {
  const res = await fetch(`${API}/api/items?q=${encodeURIComponent(q)}&limit=50`);
  if (!res.ok) throw new Error("Falha ao buscar itens");
  return res.json();
}

export async function calculate(body: {
  targets: { id: string; count: number }[];
  baseMaterials: string[];
  tagChoices: Record<string, string>;
}): Promise<CalculateResult> {
  const res = await fetch(`${API}/api/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Falha no cálculo");
  }
  return res.json();
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

export const DEFAULT_STACK_SIZE = 64;

export function breakdownStacks(
  total: number,
  stackSize = DEFAULT_STACK_SIZE,
): StackBreakdown {
  const safe = Math.max(0, Math.ceil(total));
  const stacks = Math.floor(safe / stackSize);
  const remainder = safe % stackSize;
  return { total: safe, stacks, remainder, stackSize };
}

export function formatStacks(stacks: StackBreakdown): string {
  const { stacks: s, remainder, total, stackSize } = stacks;
  if (total === 0) return "0";
  if (remainder === 0 && s > 0) {
    return `${s} ${s === 1 ? "pacote" : "pacotes"} (${stackSize})`;
  }
  if (s === 0) return `${remainder} un.`;
  return `${s} ${s === 1 ? "pacote" : "pacotes"} + ${remainder}`;
}
