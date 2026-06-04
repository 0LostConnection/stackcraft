import { textureUrl, type ItemDef } from "../api";
import { useI18n } from "../i18n";

const FALLBACK = "/textures/vanilla/items/_missing.png";

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
          if (img.src.endsWith("_missing.png")) return;
          img.src = FALLBACK;
          img.classList.add("icon-missing");
        }}
      />
    </div>
  );
}
