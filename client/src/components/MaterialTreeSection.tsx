import { useState } from "react";
import type { MaterialNode } from "../api";
import { useI18n } from "../i18n";
import { useStackFormat } from "../hooks/useStackFormat";
import { ItemIcon } from "./ItemIcon";

interface Props {
  title: string;
  subtitle?: string;
  tree: MaterialNode[];
  emptyMessage?: string;
}

interface TreeNodeProps {
  node: MaterialNode;
  depth: number;
  path: string;
}

function TreeNode({ node, depth, path }: TreeNodeProps) {
  const { t, locale } = useI18n();
  const formatStacks = useStackFormat();
  const hasChildren = Boolean(node.children?.length);
  const [expanded, setExpanded] = useState(depth === 0);
  const numberLocale =
    locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US";

  const rowClass = [
    "material-tree-row",
    node.isBase ? "material-tree-row-base" : "",
    node.isLeaf && !node.isBase ? "material-tree-row-leaf" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="material-tree-node" data-depth={depth}>
      <div className={rowClass}>
        {hasChildren ? (
          <button
            type="button"
            className="material-tree-toggle"
            aria-expanded={expanded}
            aria-label={expanded ? t("treeCollapse") : t("treeExpand")}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="material-tree-toggle material-tree-toggle-spacer" aria-hidden />
        )}
        <ItemIcon item={node.item} size={depth > 0 ? "sm" : "md"} />
        <div className="results-info">
          <span className="results-name">{node.item.name}</span>
          <span className="results-total">
            {t("units", { count: node.count.toLocaleString(numberLocale) })}
          </span>
        </div>
        <div className="results-stacks">
          <span className="stacks-badge">{formatStacks(node.stacks)}</span>
          {node.stacks.remainder > 0 && node.stacks.stacks > 0 && (
            <span className="stacks-detail">
              {t("stackDetail", {
                stacks: node.stacks.stacks,
                remainder: node.stacks.remainder,
              })}
            </span>
          )}
          {node.stacks.remainder === 0 && node.stacks.stacks > 0 && (
            <span className="stacks-detail">
              {t("stackDetailFull", { stacks: node.stacks.stacks })}
            </span>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <ul className="material-tree-children">
          {node.children!.map((child, index) => (
            <TreeNode
              key={`${path}/${child.id}-${index}`}
              node={child}
              depth={depth + 1}
              path={`${path}/${child.id}-${index}`}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function MaterialTreeSection({
  title,
  subtitle,
  tree,
  emptyMessage,
}: Props) {
  if (tree.length === 0 && emptyMessage) {
    return (
      <div className="results-section">
        <h3 className="results-section-title">{title}</h3>
        {subtitle && <p className="results-section-sub">{subtitle}</p>}
        <p className="muted">{emptyMessage}</p>
      </div>
    );
  }

  if (tree.length === 0) return null;

  return (
    <div className="results-section">
      <h3 className="results-section-title">{title}</h3>
      {subtitle && <p className="results-section-sub">{subtitle}</p>}
      <ul className="material-tree">
        {tree.map((node, index) => (
          <TreeNode
            key={`${node.id}-${index}`}
            node={node}
            depth={0}
            path={`${node.id}-${index}`}
          />
        ))}
      </ul>
    </div>
  );
}
