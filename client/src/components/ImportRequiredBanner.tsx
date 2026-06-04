import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "../api";
import {
  useStackcraftDataReady,
  useStackcraftImportProgress,
  type StackcraftHealthSnapshot,
} from "../hooks/useStackcraftDesktop";
import { useI18n } from "../i18n";

function applyHealthSnapshot(
  health: StackcraftHealthSnapshot,
  setDataReady: (v: boolean) => void,
) {
  setDataReady(health.dataReady);
}

export function ImportRequiredBanner() {
  const { t } = useI18n();
  const [dataReady, setDataReady] = useState<boolean | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const refreshHealth = useCallback(() => {
    fetchHealth()
      .then((h) => setDataReady(h.dataReady ?? false))
      .catch(() => setDataReady(false));
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const onImportProgress = useCallback(
    (payload: { phase: string; message?: string }) => {
      if (payload.phase === "error") {
        setImporting(false);
        setImportError(payload.message ?? null);
        return;
      }
      if (
        payload.phase === "start" ||
        payload.phase === "progress" ||
        payload.phase === "log"
      ) {
        setImporting(true);
        setImportError(null);
      }
    },
    [],
  );

  const onDataReady = useCallback(
    (health: StackcraftHealthSnapshot | null) => {
      setImporting(false);
      setImportError(null);
      if (health) {
        applyHealthSnapshot(health, setDataReady);
      }
      refreshHealth();
    },
    [refreshHealth],
  );

  useStackcraftImportProgress(onImportProgress);
  useStackcraftDataReady(onDataReady);

  const runImport = async () => {
    if (!window.stackcraft?.importJar) return;
    setImporting(true);
    setImportError(null);
    const result = await window.stackcraft.importJar();
    if (result.cancelled) {
      setImporting(false);
      return;
    }
    if (!result.ok) {
      setImporting(false);
      setImportError(result.error ?? t("importFailed"));
      return;
    }
    setImporting(false);
    if (result.health) {
      applyHealthSnapshot(result.health, setDataReady);
    } else {
      refreshHealth();
    }
  };

  if (dataReady !== false) return null;

  return (
    <div className="data-banner data-banner--desktop" role="status">
      <p className="data-banner-title">{t("importRequired")}</p>
      <p className="data-banner-hint">{t("importRequiredHint")}</p>
      <div className="data-banner-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void runImport()}
          disabled={importing}
          aria-busy={importing}
        >
          {importing ? t("importing") : t("importJar")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => window.stackcraft?.openUserDataFolder?.()}
        >
          {t("openDataFolder")}
        </button>
      </div>
      {importError && (
        <p className="error data-banner-error" role="alert">
          {importError}
        </p>
      )}
    </div>
  );
}
