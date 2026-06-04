import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculate,
  fetchHealth,
  fetchItem,
  setApiLang,
  type CalculateResult,
  type ItemDef,
  type TargetEntry,
} from "./api";
import { ItemSearch } from "./components/ItemSearch";
import { ItemIcon } from "./components/ItemIcon";
import { LanguageSelector } from "./components/LanguageSelector";
import { ResultsPanel } from "./components/ResultsPanel";
import { useI18n } from "./i18n";
import "./styles/app.css";

const DEFAULT_BASES: string[] = [
  "minecraft:oak_log",
  "minecraft:cobblestone",
  "minecraft:iron_ingot",
  "minecraft:glass",
  "minecraft:clay_ball",
];

export default function App() {
  const { t, locale, localeTag } = useI18n();
  const [targets, setTargets] = useState<TargetEntry[]>([]);
  const [baseMaterials, setBaseMaterials] = useState<string[]>(DEFAULT_BASES);
  const [tagChoices, setTagChoices] = useState<Record<string, string>>({
    "#minecraft:planks": "minecraft:oak_planks",
    "#minecraft:logs": "minecraft:oak_log",
    "#minecraft:oak_logs": "minecraft:oak_log",
  });
  const [result, setResult] = useState<CalculateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<{
    version: string;
    items: number;
    dataReady?: boolean;
    dataHint?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiLang(localeTag);
  }, [localeTag]);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  useEffect(() => {
    setResult(null);
  }, [targets, baseMaterials, tagChoices]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prev = targetsRef.current;
      if (!prev.length) return;
      const next = await Promise.all(
        prev.map(async (t) => {
          const item = await fetchItem(t.id);
          return item ? { ...t, item } : t;
        }),
      );
      if (!cancelled) setTargets(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [localeTag]);

  const addTarget = useCallback((item: ItemDef) => {
    setTargets((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) {
        return prev.map((x) =>
          x.id === item.id ? { ...x, count: x.count + 1, item } : x,
        );
      }
      return [...prev, { id: item.id, count: 1, item }];
    });
  }, []);

  const removeTarget = useCallback((id: string) => {
    setTargets((prev) => prev.filter((x) => x.id !== id));
    setResult(null);
  }, []);

  const clearTargets = useCallback(() => {
    setTargets([]);
    setResult(null);
    setError(null);
  }, []);

  const updateTargetCount = useCallback((id: string, delta: number) => {
    setTargets((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, count: Math.max(1, x.count + delta) } : x,
      ),
    );
  }, []);

  const addBase = useCallback((item: ItemDef) => {
    setBaseMaterials((prev) =>
      prev.includes(item.id) ? prev : [...prev, item.id],
    );
  }, []);

  const runCalculate = useCallback(async () => {
    if (targets.length === 0) {
      setError(t("errorNoTargets"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await calculate({
        targets: targets.map((x) => ({ id: x.id, count: x.count })),
        baseMaterials,
        tagChoices,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [targets, baseMaterials, tagChoices, t]);

  const TAG_PREFS = [
    { id: "#minecraft:planks", labelKey: "tagPlanks" as const },
    { id: "#minecraft:logs", labelKey: "tagLogs" as const },
    { id: "#minecraft:oak_logs", labelKey: "tagOakLogs" as const },
  ];

  const numberLocale =
    locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US";

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <h1 className="logo">StackCraft</h1>
          <p className="tagline">{t("tagline")}</p>
        </div>
        <div className="header-actions">
          <LanguageSelector />
          {health && (
            <div className="health-badge panel-inset">
              MC {health.version} ·{" "}
              {t("healthItems", {
                count: health.items.toLocaleString(numberLocale),
              })}
            </div>
          )}
        </div>
      </header>

      {health && health.dataReady === false && (
        <div className="data-banner" role="status">
          <p className="data-banner-title">{t("dataNotImported")}</p>
          <p className="data-banner-hint">
            <code>{health.dataHint ?? t("dataImportCommand")}</code>
          </p>
        </div>
      )}

      <main className="app-grid">
        <div className="col-left">
          <section className="panel panel--emphasis">
            <h2 className="panel-title">
              <span className="panel-step" aria-hidden>
                1
              </span>
              {t("needTitle")}
            </h2>
            <p className="hint">{t("needHint")}</p>
            <ItemSearch onSelect={addTarget} />

            {targets.length > 0 && (
              <>
                <div className="target-list-header">
                  <span className="target-count">
                    {t("targetCount", { count: String(targets.length) })}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={clearTargets}
                  >
                    {t("clearAll")}
                  </button>
                </div>
                <ul className="target-list">
                  {targets.map((target) => (
                    <li key={target.id} className="target-row">
                      {target.item && <ItemIcon item={target.item} size="sm" />}
                      <span className="target-name">
                        {target.item?.name ??
                          target.id.replace("minecraft:", "")}
                      </span>
                      <div className="qty-control">
                        <button
                          type="button"
                          className="qty-btn"
                          aria-label={t("decreaseQty")}
                          onClick={() => updateTargetCount(target.id, -1)}
                          disabled={target.count <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className="qty-input"
                          min={1}
                          aria-label={t("quantity")}
                          value={target.count}
                          onChange={(e) => {
                            const n = Math.max(
                              1,
                              parseInt(e.target.value, 10) || 1,
                            );
                            setTargets((prev) =>
                              prev.map((x) =>
                                x.id === target.id ? { ...x, count: n } : x,
                              ),
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          aria-label={t("increaseQty")}
                          onClick={() => updateTargetCount(target.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        aria-label={t("remove")}
                        onClick={() => removeTarget(target.id)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="calc-actions">
              <button
                type="button"
                className={`btn btn-primary calc-btn${loading ? " is-loading" : ""}`}
                onClick={runCalculate}
                disabled={loading || targets.length === 0}
                aria-busy={loading}
              >
                {loading ? t("calculating") : t("calculate")}
              </button>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">
              <span className="panel-step" aria-hidden>
                2
              </span>
              {t("baseTitle")}
            </h2>
            <p className="hint">{t("baseHint")}</p>
            <ItemSearch
              onSelect={addBase}
              placeholder={t("baseSearchPlaceholder")}
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
              <h2 className="panel-title">
                <span className="panel-step" aria-hidden>
                  3
                </span>
                {t("tagsTitle")}
              </h2>
              <p className="hint">{t("tagsHint")}</p>
              {TAG_PREFS.map((tag) => (
                <TagChoiceEditor
                  key={tag.id}
                  tagId={tag.id}
                  label={t(tag.labelKey)}
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
        {t("footer")} <code>npm run import:vanilla</code>
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
  const { localeTag } = useI18n();
  const [options, setOptions] = useState<ItemDef[]>([]);

  useEffect(() => {
    fetch(`/api/tags/${encodeURIComponent(tagId)}?lang=${localeTag}`)
      .then((r) => r.json())
      .then((data: { items?: ItemDef[] }) => setOptions(data.items ?? []))
      .catch(() => setOptions([]));
  }, [tagId, localeTag]);

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
