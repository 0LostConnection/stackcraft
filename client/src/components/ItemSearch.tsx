import { useCallback, useEffect, useRef, useState } from "react";
import { searchItems, type ItemDef } from "../api";
import { useI18n } from "../i18n";
import { ItemIcon } from "./ItemIcon";

interface Props {
  onSelect: (item: ItemDef) => void;
  placeholder?: string;
}

export function ItemSearch({ onSelect, placeholder }: Props) {
  const { t, localeTag } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ItemDef[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const items = await searchItems(query);
        setResults(items);
      } finally {
        setLoading(false);
      }
    },
    [localeTag],
  );

  useEffect(() => {
    const timer = setTimeout(() => search(q), 200);
    return () => clearTimeout(timer);
  }, [q, search]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="item-search" ref={wrapRef}>
      <input
        className="input"
        type="search"
        role="combobox"
        aria-expanded={open && !!q.trim()}
        aria-autocomplete="list"
        placeholder={placeholder ?? t("searchPlaceholder")}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (q.trim() || results.length > 0) && (
        <ul className="item-search-dropdown panel" role="listbox">
          {loading && <li className="muted">{t("searching")}</li>}
          {!loading && results.length === 0 && q.trim() && (
            <li className="muted">{t("searchEmpty")}</li>
          )}
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="item-search-row"
                onClick={() => {
                  onSelect(item);
                  setQ("");
                  setOpen(false);
                }}
              >
                <ItemIcon item={item} size="sm" />
                <span className="item-search-name">{item.name}</span>
                <span className="item-search-id">{item.id.replace("minecraft:", "")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
