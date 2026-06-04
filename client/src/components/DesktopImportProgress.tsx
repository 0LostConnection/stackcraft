import { useCallback, useEffect, useState } from "react";
import { useStackcraftImportProgress } from "../hooks/useStackcraftDesktop";
import { useI18n } from "../i18n";

type ProgressState = {
  percent: number;
  label: string;
};

function labelFromPayload(
  t: (key: string, vars?: Record<string, string | number>) => string,
  payload: {
    phaseId?: string;
    message?: string;
    current?: number;
    total?: number;
  },
): string {
  if (payload.phaseId) {
    const vars: Record<string, string> = {};
    if (payload.current != null) vars.current = String(payload.current);
    if (payload.total != null) vars.total = String(payload.total);
    const key = `importPhase_${payload.phaseId}`;
    const translated = t(key, Object.keys(vars).length ? vars : undefined);
    if (translated !== key) return translated;
  }
  return payload.message ?? t("importing");
}

export function DesktopImportProgress() {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback(
    (payload: {
      phase: string;
      percent?: number;
      phaseId?: string;
      message?: string;
      current?: number;
      total?: number;
    }) => {
      if (payload.phase === "error") {
        setActive(true);
        setError(payload.message ?? t("importFailed"));
        return;
      }

      if (payload.phase === "done") {
        setProgress({ percent: 100, label: t("importSuccess") });
        setError(null);
        setActive(true);
        return;
      }

      if (payload.phase === "log") {
        setActive(true);
        setProgress((prev) => ({
          percent: prev?.percent ?? 0,
          label: prev?.label ?? t("importing"),
        }));
        return;
      }

      if (payload.phase === "start" || payload.phase === "progress") {
        setActive(true);
        setError(null);
        setProgress((prev) => ({
          percent:
            payload.percent ??
            (payload.phase === "start" ? 0 : (prev?.percent ?? 0)),
          label: labelFromPayload(t, payload),
        }));
      }
    },
    [t],
  );

  useStackcraftImportProgress(applyPayload);

  const syncFromSnapshot = useCallback(() => {
    const snap = window.stackcraft?.getImportSnapshot?.();
    if (!snap?.inProgress) return;
    if (snap.lastProgress) {
      applyPayload(snap.lastProgress);
      return;
    }
    setActive(true);
    setProgress({ percent: 0, label: t("importing") });
  }, [applyPayload, t]);

  useEffect(() => {
    syncFromSnapshot();
    void window.stackcraft?.notifyReady?.().then(() => syncFromSnapshot());
  }, [syncFromSnapshot]);

  useEffect(() => {
    if (!progress || progress.percent < 100) return;
    const id = window.setTimeout(() => {
      setActive(false);
      setProgress(null);
    }, 2000);
    return () => window.clearTimeout(id);
  }, [progress?.percent]);

  if (!active || (!progress && !error)) return null;

  const percent = progress?.percent ?? 0;

  return (
    <div
      className="import-progress"
      role="region"
      aria-label={t("importing")}
      aria-busy={percent < 100 && !error}
    >
      {progress && !error && (
        <>
          <div
            className="import-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={progress.label}
          >
            <div
              className="import-progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="import-progress-label" aria-live="polite">
            <span className="import-progress-percent">{percent}%</span>
            {progress.label}
          </p>
        </>
      )}
      {error && (
        <p className="error import-progress-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
