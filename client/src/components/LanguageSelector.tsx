import { useEffect, useId, useRef, useState } from "react";
import { LOCALE_LABELS, useI18n, type Locale } from "../i18n";

const LOCALES: Locale[] = ["en", "pt", "es"];

const LOCALE_META: Record<Locale, { flag: string; label: string }> = {
  en: { flag: "🇺🇸", label: LOCALE_LABELS.en },
  pt: { flag: "🇧🇷", label: LOCALE_LABELS.pt },
  es: { flag: "🇪🇸", label: LOCALE_LABELS.es },
};

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const groupId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleSelect(code: Locale) {
    if (!open) {
      setOpen(true);
      return;
    }
    setLocale(code);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`lang-switcher${open ? " is-open" : ""}`}
    >
      <div
        className="lang-pill"
        role="group"
        aria-label={t("language")}
        id={groupId}
      >
        {LOCALES.map((code) => {
          const isSelected = locale === code;
          const meta = LOCALE_META[code];
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={meta.label}
              aria-expanded={open}
              className={`lang-option${isSelected ? " is-selected" : ""}${open ? " is-visible" : ""}`}
              tabIndex={open || isSelected ? 0 : -1}
              onClick={() => handleSelect(code)}
            >
              <span className="lang-flag" aria-hidden>
                {meta.flag}
              </span>
              <span className="lang-tooltip" role="tooltip">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
