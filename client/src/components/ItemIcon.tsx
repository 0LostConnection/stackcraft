import { textureUrl, type ItemDef } from "../api";

const FALLBACK = "/textures/vanilla/items/_missing.png";

interface Props {
  item: Pick<ItemDef, "texture" | "name" | "hasTexture">;
  size?: "sm" | "md";
}

export function ItemIcon({ item, size = "md" }: Props) {
  const src =
    item.hasTexture === false ? FALLBACK : textureUrl(item.texture);

  return (
    <div
      className={`slot ${size === "sm" ? "slot-sm" : ""} ${item.hasTexture === false ? "slot-no-icon" : ""}`}
      title={
        item.hasTexture === false
          ? `${item.name} (sem ícone 2D — modelo 3D no jogo)`
          : item.name
      }
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
