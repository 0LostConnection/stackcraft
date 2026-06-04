import { useCallback } from "react";
import { useI18n } from "../i18n";
import type { StackBreakdown } from "../stacks-format";

export function useStackFormat() {
  const { t } = useI18n();

  return useCallback(
    (breakdown: StackBreakdown, opts?: { short?: boolean }) => {
      const { stacks, remainder, total, stackSize } = breakdown;
      if (total === 0) return "0";
      if (total === stackSize && stacks === 1 && remainder === 0) {
        return opts?.short ? "1p" : t("stackExact", { size: stackSize });
      }
      if (remainder === 0 && stacks > 0) {
        return opts?.short
          ? `${stacks}p`
          : t("stacksExact", { count: stacks, size: stackSize });
      }
      if (stacks === 0) {
        return opts?.short ? `${remainder}` : t("unitsOnly", { count: remainder });
      }
      return opts?.short
        ? `${stacks}p+${remainder}`
        : t("stacksPlus", { stacks, remainder });
    },
    [t],
  );
}
