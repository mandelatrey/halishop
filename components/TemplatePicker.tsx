"use client";

import Link from "next/link";
import { useShop } from "./ShopContext";
import type {
  BrandKit,
  BuiltinTemplate,
  CardConfig,
  CustomTemplate,
  Product,
  ResolvedTemplate,
} from "@/lib/types";
import { BUILTIN_TEMPLATES } from "@/lib/types";
import StatusCard from "./StatusCard";

type Props = {
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  customs: CustomTemplate[];
  onSelect: (templateId: string) => void;
  showUploadTile?: boolean;
};

const TILE_W = 72;
const TILE_H = 128;

export default function TemplatePicker({
  product,
  brand,
  config,
  customs,
  onSelect,
  showUploadTile = true,
}: Props) {
  const { dash } = useShop();
  return (
    <div className="tpick">
      {BUILTIN_TEMPLATES.map((b) => (
        <TemplateTile
          key={b.id}
          template={b}
          product={product}
          brand={brand}
          config={config}
          selected={config.templateId === `builtin:${b.id}`}
          onClick={() => onSelect(`builtin:${b.id}`)}
        />
      ))}
      {customs.map((c) => (
        <TemplateTile
          key={c.id}
          template={{ kind: "custom", ...c }}
          product={product}
          brand={brand}
          config={config}
          selected={config.templateId === `custom:${c.id}`}
          onClick={() => onSelect(`custom:${c.id}`)}
          labelOverride={c.name}
          editHref={dash(`/templates/${c.id}`)}
        />
      ))}
      {showUploadTile && (
        <Link href={dash("/templates")} className="upload-tile" title="Upload your own">
          + Upload
        </Link>
      )}
    </div>
  );
}

function TemplateTile({
  template,
  product,
  brand,
  config,
  selected,
  onClick,
  labelOverride,
  editHref,
}: {
  template: ResolvedTemplate;
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  selected: boolean;
  onClick: () => void;
  labelOverride?: string;
  editHref?: string;
}) {
  const label =
    labelOverride ??
    (template.kind === "builtin" ? (template as BuiltinTemplate).label : "custom");
  return (
    <div className="tile-wrap" style={{ width: TILE_W, height: TILE_H }}>
      <button
        type="button"
        className={`tile${selected ? " on" : ""}`}
        style={{ width: TILE_W, height: TILE_H }}
        onClick={onClick}
        aria-label={`Template ${label}`}
        aria-pressed={selected}
      >
        <div style={{ pointerEvents: "none" }}>
          <StatusCard
            product={product}
            brand={brand}
            config={config}
            template={template}
            width={TILE_W - 4}
          />
        </div>
        <span className="tlabel">{label}</span>
      </button>
      {editHref && (
        <Link
          href={editHref}
          className="tile-edit"
          aria-label={`Edit template ${label}`}
          title="Edit template"
          onClick={(e) => e.stopPropagation()}
        >
          ✎
        </Link>
      )}

      <style jsx>{`
        .tile-wrap {
          position: relative;
          flex: none;
        }
        .tile-edit {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: color-mix(in srgb, #ffffff 92%, transparent);
          color: var(--color-text);
          display: grid;
          place-items: center;
          font: 600 12px/1 "DM Sans", sans-serif;
          text-decoration: none;
          border: 1px solid var(--stroke-soft);
          transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;
        }
        .tile-edit:hover {
          background: var(--color-accent);
          color: #fff;
          transform: scale(1.06);
        }
      `}</style>
    </div>
  );
}
