import { breakdownStacks, formatStacks, type ItemDef, type MaterialLine } from "../api";
import { ItemIcon } from "./ItemIcon";

export interface DisplayLine {
  id: string;
  count: number;
  item: ItemDef;
}

interface Props {
  title: string;
  subtitle?: string;
  lines: DisplayLine[] | MaterialLine[];
  emptyMessage?: string;
}

function toDisplayLine(line: DisplayLine | MaterialLine): DisplayLine {
  if ("stacks" in line && line.item) {
    return { id: line.id, count: line.count, item: line.item };
  }
  return line as DisplayLine;
}

export function MaterialListSection({
  title,
  subtitle,
  lines,
  emptyMessage,
}: Props) {
  if (lines.length === 0 && emptyMessage) {
    return (
      <div className="results-section">
        <h3 className="results-section-title">{title}</h3>
        {subtitle && <p className="results-section-sub">{subtitle}</p>}
        <p className="muted">{emptyMessage}</p>
      </div>
    );
  }

  if (lines.length === 0) return null;

  return (
    <div className="results-section">
      <h3 className="results-section-title">{title}</h3>
      {subtitle && <p className="results-section-sub">{subtitle}</p>}
      <ul className="results-list">
        {lines.map((raw) => {
          const line = toDisplayLine(raw);
          const stacks =
            "stacks" in raw && raw.stacks
              ? raw.stacks
              : breakdownStacks(line.count);
          return (
            <li key={line.id} className="results-row">
              <ItemIcon item={line.item} />
              <div className="results-info">
                <span className="results-name">{line.item.name}</span>
                <span className="results-total">
                  {line.count.toLocaleString("pt-BR")} un.
                </span>
              </div>
              <div className="results-stacks">
                <span className="stacks-badge">{formatStacks(stacks)}</span>
                {stacks.remainder > 0 && stacks.stacks > 0 && (
                  <span className="stacks-detail">
                    ({stacks.stacks}×64 + {stacks.remainder})
                  </span>
                )}
                {stacks.remainder === 0 && stacks.stacks > 0 && (
                  <span className="stacks-detail">
                    ({stacks.stacks}×64)
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
