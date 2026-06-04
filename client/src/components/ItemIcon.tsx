import { textureUrl, type ItemDef } from "../api";
import { useI18n } from "../i18n";

/** Neutral placeholder — not a Minecraft asset */
const FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="#2d3b32"/><path d="M10 10h12v12H10z" fill="none" stroke="#5a7a62" stroke-width="2"/><text x="16" y="21" text-anchor="middle" fill="#9bb09a" font-size="12" font-family="sans-serif">?</text></svg>',
  );

interface Props {
  item: Pick<ItemDef, "texture" | "name" | "hasTexture">;
  size?: "sm" | "md";
}

export function ItemIcon({ item, size = "md" }: Props) {
  const { t } = useI18n();
  const src =
    item.hasTexture === false ? FALLBACK : textureUrl(item.texture);

  const title =
    item.hasTexture === false
      ? t("noIconTooltip", { name: item.name })
      : item.name;

  return (
    <div
      className={`slot ${size === "sm" ? "slot-sm" : ""} ${item.hasTexture === false ? "slot-no-icon" : ""}`}
      title={title}
    >
      <img
        src={src}
        alt={item.name}
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          if (img.src.startsWith("data:")) return;
          img.src = FALLBACK;
          img.classList.add("icon-missing");
        }}
      />
    </div>
  );
}
