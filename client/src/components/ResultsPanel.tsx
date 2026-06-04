import type { CalculateResult, TargetEntry } from "../api";
import { useI18n } from "../i18n";
import { MaterialListSection, type DisplayLine } from "./MaterialListSection";
import { MaterialTreeSection } from "./MaterialTreeSection";

interface Props {
  targets: TargetEntry[];
  result: CalculateResult | null;
  loading: boolean;
}

function targetToLine(t: TargetEntry): DisplayLine {
  const slug = t.id.replace("minecraft:", "");
  return {
    id: t.id,
    count: t.count,
    item:
      t.item ??
      {
        id: t.id,
        name: slug.replace(/_/g, " "),
        texture: `vanilla/items/${slug}.png`,
        hasTexture: true,
        source: "unknown",
      },
  };
}

export function ResultsPanel({ targets, result, loading }: Props) {
  const { t } = useI18n();
  const targetLines = targets.map(targetToLine);
  const hasTargets = targetLines.length > 0;
  const craftResult = hasTargets ? result : null;

  return (
    <section className="panel results-panel">
      <h2 className="panel-title">{t("resultsTitle")}</h2>

      <div
        className="legend panel-inset"
        dangerouslySetInnerHTML={{ __html: t("legend") }}
      />

      {hasTargets && (
        <MaterialListSection
          title={t("buildListTitle")}
          subtitle={t("buildListSub")}
          lines={targetLines}
        />
      )}

      {!hasTargets && !loading && (
        <p className="muted empty-hint">{t("emptyResults")}</p>
      )}

      {hasTargets && <div className="results-divider" aria-hidden />}

      {hasTargets && !loading && !craftResult && (
        <p
          className="muted results-craft-status"
          dangerouslySetInnerHTML={{ __html: t("craftPrompt") }}
        />
      )}

      {loading && (
        <p className="muted results-craft-status">{t("craftCalculating")}</p>
      )}

      {!loading && craftResult && craftResult.materials.length > 0 && (
        <MaterialTreeSection
          title={t("craftListTitle")}
          subtitle={t("craftListSub")}
          tree={craftResult.tree}
        />
      )}

      {!loading && hasTargets && craftResult && craftResult.materials.length === 0 && (
        <MaterialTreeSection
          title={t("craftListTitle")}
          subtitle={t("craftListSub")}
          tree={[]}
          emptyMessage={t("craftEmpty")}
        />
      )}

      {craftResult?.unresolved && craftResult.unresolved.length > 0 && (
        <p className="warning">
          {t("unresolved", { list: craftResult.unresolved.join(", ") })}
        </p>
      )}
    </section>
  );
}
