import { useCallback, useEffect, useRef, useState } from "react";
import { searchItems, type ItemDef } from "../api";
import { ItemIcon } from "./ItemIcon";

interface Props {
  onSelect: (item: ItemDef) => void;
  placeholder?: string;
}

export function ItemSearch({ onSelect, placeholder }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ItemDef[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (query: string) => {
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
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 200);
    return () => clearTimeout(t);
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
        placeholder={placeholder ?? "Buscar item do Minecraft…"}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (q.trim() || results.length > 0) && (
        <ul className="item-search-dropdown panel">
          {loading && <li className="muted">Buscando…</li>}
          {!loading && results.length === 0 && q.trim() && (
            <li className="muted">Nenhum item encontrado</li>
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
