import type { StackBreakdown } from "./types.js";

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

/** pt-BR: "3 pacotes + 12" or "64" when exact stack */
export function formatStacksPt(
  breakdown: StackBreakdown,
  opts?: { short?: boolean },
): string {
  const { stacks, remainder, total, stackSize } = breakdown;
  if (total === 0) return "0";
  if (total === stackSize && stacks === 1 && remainder === 0) {
    return opts?.short ? "1p" : `1 pacote (${stackSize})`;
  }
  if (remainder === 0 && stacks > 0) {
    return opts?.short
      ? `${stacks}p`
      : `${stacks} ${stacks === 1 ? "pacote" : "pacotes"} (${stackSize} cada)`;
  }
  if (stacks === 0) {
    return opts?.short ? `${remainder}` : `${remainder} un.`;
  }
  return opts?.short
    ? `${stacks}p + ${remainder}`
    : `${stacks} ${stacks === 1 ? "pacote" : "pacotes"} + ${remainder}`;
}
