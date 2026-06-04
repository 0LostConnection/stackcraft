import type { CalculateResult, ItemDef, TargetEntry } from "../api";
import { MaterialListSection, type DisplayLine } from "./MaterialListSection";

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
      ({
        id: t.id,
        name: slug.replace(/_/g, " "),
        texture: `vanilla/items/${slug}.png`,
        hasTexture: true,
        source: "unknown",
      } satisfies ItemDef),
  };
}

export function ResultsPanel({ targets, result, loading }: Props) {
  const targetLines = targets.map(targetToLine);
  const hasTargets = targetLines.length > 0;

  return (
    <section className="panel results-panel">
      <h2 className="panel-title">Resumo de materiais</h2>

      <div className="legend panel-inset">
        <strong>Legenda:</strong> um <em>pacote</em> = 64 unidades (pilha do inventário).
        Ex.: <code>2 pacotes + 5</code> = 133 unidades.
      </div>

      {hasTargets && (
        <MaterialListSection
          title="Lista para construir"
          subtitle="Itens que você pediu — quanto levar ou craftar direto"
          lines={targetLines}
        />
      )}

      {!hasTargets && !loading && (
        <p className="muted empty-hint">
          Adicione itens à lista e clique em Calcular para ver os materiais de craft.
        </p>
      )}

      {hasTargets && <div className="results-divider" aria-hidden />}

      {hasTargets && !loading && !result && (
        <p className="muted results-craft-status">
          Clique em <strong>Calcular materiais</strong> para ver os ingredientes de craft.
        </p>
      )}

      {loading && (
        <p className="muted results-craft-status">Calculando materiais de craft…</p>
      )}

      {!loading && result && result.materials.length > 0 && (
        <MaterialListSection
          title="Materiais para craftar"
          subtitle="Ingredientes base depois de expandir receitas (troncos, pedra, etc.)"
          lines={result.materials}
        />
      )}

      {!loading && hasTargets && result && result.materials.length === 0 && (
        <MaterialListSection
          title="Materiais para craftar"
          subtitle="Ingredientes base depois de expandir receitas"
          lines={[]}
          emptyMessage="Nenhum material base — talvez tudo já esteja na lista de materiais base."
        />
      )}

      {result?.unresolved && result.unresolved.length > 0 && (
        <p className="warning">
          Alguns itens não têm receita no banco de dados:{" "}
          {result.unresolved.join(", ")}
        </p>
      )}
    </section>
  );
}
