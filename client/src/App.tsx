import { useCallback, useEffect, useState } from "react";
import {
  calculate,
  fetchHealth,
  type CalculateResult,
  type ItemDef,
  type TargetEntry,
} from "./api";
import { ItemSearch } from "./components/ItemSearch";
import { ItemIcon } from "./components/ItemIcon";
import { ResultsPanel } from "./components/ResultsPanel";
import "./styles/app.css";

const DEFAULT_BASES: string[] = [
  "minecraft:oak_log",
  "minecraft:cobblestone",
  "minecraft:iron_ingot",
  "minecraft:glass",
  "minecraft:clay_ball",
];

export default function App() {
  const [targets, setTargets] = useState<TargetEntry[]>([]);
  const [baseMaterials, setBaseMaterials] = useState<string[]>(DEFAULT_BASES);
  const [tagChoices, setTagChoices] = useState<Record<string, string>>({
    "#minecraft:planks": "minecraft:oak_planks",
    "#minecraft:logs": "minecraft:oak_log",
    "#minecraft:oak_logs": "minecraft:oak_log",
  });
  const [result, setResult] = useState<CalculateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<{ version: string; items: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const addTarget = useCallback((item: ItemDef) => {
    setTargets((prev) => {
      const existing = prev.find((t) => t.id === item.id);
      if (existing) {
        return prev.map((t) =>
          t.id === item.id ? { ...t, count: t.count + 1 } : t,
        );
      }
      return [...prev, { id: item.id, count: 1, item }];
    });
    setResult(null);
  }, []);

  const addBase = useCallback((item: ItemDef) => {
    setBaseMaterials((prev) =>
      prev.includes(item.id) ? prev : [...prev, item.id],
    );
  }, []);

  const runCalculate = useCallback(async () => {
    if (targets.length === 0) {
      setError("Adicione pelo menos um item à lista.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await calculate({
        targets: targets.map((t) => ({ id: t.id, count: t.count })),
        baseMaterials,
        tagChoices,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao calcular");
    } finally {
      setLoading(false);
    }
  }, [targets, baseMaterials, tagChoices]);

  const TAG_PREFS = [
    { id: "#minecraft:planks", label: "Tábuas (tipo de madeira)" },
    { id: "#minecraft:logs", label: "Troncos (qualquer)" },
    { id: "#minecraft:oak_logs", label: "Troncos de carvalho" },
  ] as const;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="logo">StackCraft</h1>
          <p className="tagline">Calculadora de materiais para sua construção</p>
        </div>
        {health && (
          <div className="health-badge panel-inset">
            MC {health.version} · {health.items.toLocaleString("pt-BR")} itens
          </div>
        )}
      </header>

      <main className="app-grid">
        <div className="col-left">
          <section className="panel">
            <h2 className="panel-title">O que você precisa?</h2>
            <p className="hint">
              Itens do vídeo / da sua casa — ex.: cercas, escadas, vidro.
            </p>
            <ItemSearch onSelect={addTarget} />

            {targets.length > 0 && (
              <ul className="target-list">
                {targets.map((t) => (
                  <li key={t.id} className="target-row">
                    {t.item && <ItemIcon item={t.item} size="sm" />}
                    <span className="target-name">
                      {t.item?.name ?? t.id.replace("minecraft:", "")}
                    </span>
                    <input
                      type="number"
                      className="qty-input"
                      min={1}
                      value={t.count}
                      onChange={(e) => {
                        const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setTargets((prev) =>
                          prev.map((x) =>
                            x.id === t.id ? { ...x, count: n } : x,
                          ),
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label="Remover"
                      onClick={() =>
                        setTargets((prev) => prev.filter((x) => x.id !== t.id))
                      }
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="btn btn-primary calc-btn"
              onClick={runCalculate}
              disabled={loading || targets.length === 0}
            >
              {loading ? "Calculando…" : "Calcular materiais"}
            </button>
            {error && <p className="error">{error}</p>}
          </section>

          <section className="panel">
            <h2 className="panel-title">Materiais base</h2>
            <p className="hint">
              O cálculo para aqui — ex.: se você já tem tábuas, adicione{" "}
              <em>oak planks</em> em vez de madeira.
            </p>
            <ItemSearch
              onSelect={addBase}
              placeholder="Adicionar material base…"
            />
            <div className="chips-wrap">
              {baseMaterials.map((id) => (
                <span key={id} className="chip">
                  <span>{id.replace("minecraft:", "").replace(/_/g, " ")}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() =>
                      setBaseMaterials((prev) => prev.filter((b) => b !== id))
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </section>

          {targets.length > 0 && (
            <section className="panel">
              <h2 className="panel-title">Preferências (tags)</h2>
              <p className="hint">
                Escolha qual tipo de madeira / variante usar quando a receita aceita
                várias opções.
              </p>
              {TAG_PREFS.map((tag) => (
                <TagChoiceEditor
                  key={tag.id}
                  tagId={tag.id}
                  label={tag.label}
                  value={tagChoices[tag.id]}
                  onChange={(v) =>
                    setTagChoices((p) => ({ ...p, [tag.id]: v }))
                  }
                />
              ))}
            </section>
          )}
        </div>

        <div className="col-right">
          <ResultsPanel
            targets={targets}
            result={result}
            loading={loading}
          />
        </div>
      </main>

      <footer className="app-footer">
        Dados do Minecraft 26.1.2 · modular para mods futuros ·{" "}
        <code>npm run import:vanilla</code> para atualizar
      </footer>
    </div>
  );
}

function TagChoiceEditor({
  tagId,
  label,
  value,
  onChange,
}: {
  tagId: string;
  label: string;
  value?: string;
  onChange: (id: string) => void;
}) {
  const [options, setOptions] = useState<ItemDef[]>([]);

  useEffect(() => {
    fetch(`/api/tags/${encodeURIComponent(tagId)}`)
      .then((r) => r.json())
      .then((data: { items?: ItemDef[] }) => setOptions(data.items ?? []))
      .catch(() => setOptions([]));
  }, [tagId]);

  if (options.length === 0) return null;

  return (
    <label className="tag-choice">
      <span>{label}</span>
      <select
        className="input"
        value={value ?? options[0]?.id ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
