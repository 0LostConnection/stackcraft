export interface StackBreakdown {
  total: number;
  stacks: number;
  remainder: number;
  stackSize: number;
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

export type StackFormatter = (
  stacks: StackBreakdown,
  opts?: { short?: boolean },
) => string;

/** English default formatter */
export const formatStacksEn: StackFormatter = (breakdown, opts) => {
  const { stacks, remainder, total, stackSize } = breakdown;
  if (total === 0) return "0";
  if (total === stackSize && stacks === 1 && remainder === 0) {
    return opts?.short ? "1s" : `1 stack (${stackSize})`;
  }
  if (remainder === 0 && stacks > 0) {
    return opts?.short
      ? `${stacks}s`
      : `${stacks} ${stacks === 1 ? "stack" : "stacks"} (${stackSize} each)`;
  }
  if (stacks === 0) {
    return opts?.short ? `${remainder}` : `${remainder} units`;
  }
  return opts?.short
    ? `${stacks}s + ${remainder}`
    : `${stacks} ${stacks === 1 ? "stack" : "stacks"} + ${remainder}`;
};

/** @deprecated use formatStacks from context */
export const formatStacks = formatStacksEn;
