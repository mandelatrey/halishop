"use client";

import { useMemo, useState, useTransition } from "react";
import { saveBrandKit } from "@/lib/actions/brand-kit";
import type {
  BrandKit,
  BuiltinTemplateId,
  CardConfig,
  FrameStyle,
  Product,
} from "@/lib/types";
import Button from "@/components/Button";
import ImageSlot from "@/components/ImageSlot";
import PaletteMaker from "@/components/PaletteMaker";
import PhoneInput from "@/components/PhoneInput";
import SegmentedControl from "@/components/SegmentedControl";
import StatusCard from "@/components/StatusCard";

const FRAME_OPTIONS: { label: string; value: FrameStyle }[] = [
  { label: "Bar", value: "Bar" },
  { label: "Block", value: "Block" },
  { label: "Border", value: "Border" },
  { label: "None", value: "None" },
];

const FRAME_TO_TEMPLATE_ID: Record<FrameStyle, BuiltinTemplateId> = {
  Bar: "bar",
  Block: "block",
  Border: "frame",
  None: "clean",
};

const PREVIEW_PRODUCT: Product = {
  code: "B3",
  title: "T-shirt black",
  price: 35000,
  currency: "UGX",
  image: "/test-images/outfit1.jpeg",
  category: "clothing",
  variantLabel: "Sizes",
  variants: ["S", "M", "L", "XL"],
};

const PREVIEW_CONFIG: CardConfig = {
  templateId: "builtin:bar",
  showPrice: true,
  codeFormat: "short",
};

const ALWAYS_SHOW_KEYS = [
  { key: "price", label: "Price" },
  { key: "code", label: "Code" },
  { key: "shopLink", label: "Shop link" },
  { key: "variants", label: "Variants (sizes / storage / shades / …)" },
  { key: "whatsapp", label: "WhatsApp number" },
] as const;

export default function BrandKitClient({ initialBrand }: { initialBrand: BrandKit }) {
  const [saved, setSaved] = useState<BrandKit>(initialBrand);
  const [draft, setDraft] = useState<BrandKit>(initialBrand);
  const [flash, setFlash] = useState<"idle" | "saved">("idle");
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved]
  );

  function save() {
    startTransition(async () => {
      await saveBrandKit(draft);
      setSaved(draft);
      setFlash("saved");
      setTimeout(() => setFlash("idle"), 1600);
    });
  }

  function revert() {
    setDraft(saved);
  }

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Brand Kit</h1>
          <p className="subtitle">
            Pick a brand colour. Save to push the palette to every template.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {flash === "saved" && <span className="k saved-flash">Saved</span>}
          {dirty && (
            <Button variant="sec" onClick={revert}>Revert</Button>
          )}
          <Button onClick={save} disabled={!dirty || isPending} style={{ minWidth: 140 }}>
            {isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="brand-kit-layout">
        <div className="col brand-kit-form" style={{ gap: 22 }}>
        <ImageSlot
          value={draft.logo}
          onChange={(v) => setDraft({ ...draft, logo: v })}
          label="Logo"
          width={72}
          height={72}
        />

        <label className="col" style={{ gap: 6 }}>
          <span className="k">Shop name</span>
          <input
            className="inp"
            value={draft.shopName}
            onChange={(e) => setDraft({ ...draft, shopName: e.target.value })}
            placeholder="SHANIA COLLECTIONS"
          />
        </label>

        <label className="col" style={{ gap: 6 }}>
          <span className="k">Shop URL</span>
          <input
            className="inp"
            value={draft.shopUrl}
            onChange={(e) => setDraft({ ...draft, shopUrl: e.target.value })}
            placeholder="shop.app/shania"
          />
        </label>

        <div className="col" style={{ gap: 6 }}>
          <span className="k">WhatsApp number</span>
          <PhoneInput
            value={draft.whatsapp ?? ""}
            onChange={(next) => setDraft({ ...draft, whatsapp: next || undefined })}
            placeholder="772 000 000"
          />
          <span className="s">
            Used for buyer &ldquo;Order on WhatsApp&rdquo; links. Pick a country then type the number.
          </span>
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="k">Palette maker</span>
          <PaletteMaker
            value={draft.palette}
            onChange={(p) => setDraft({ ...draft, palette: p })}
          />
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="k">Frame style</span>
          <SegmentedControl
            value={draft.frame}
            options={FRAME_OPTIONS}
            onChange={(v) => setDraft({ ...draft, frame: v })}
          />
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="k">Always show</span>
          <div className="fields">
            {ALWAYS_SHOW_KEYS.map(({ key, label }) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={draft.alwaysShow[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      alwaysShow: { ...draft.alwaysShow, [key]: e.target.checked },
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        </div>

        <aside className="brand-kit-preview" aria-label="Status card preview">
          <div className="brand-kit-preview-inner">
            <span className="k preview-label">Live preview</span>
            <div className="preview-card-well">
              <StatusCard
                product={PREVIEW_PRODUCT}
                brand={draft}
                config={PREVIEW_CONFIG}
                template={{
                  kind: "builtin",
                  id: FRAME_TO_TEMPLATE_ID[draft.frame],
                  label: FRAME_TO_TEMPLATE_ID[draft.frame],
                }}
                width={200}
              />
            </div>
            <span className="anno preview-anno">
              Updates as you edit — save to apply to every card.
            </span>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .saved-flash {
          background: rgba(19, 90, 237, 0.12);
          color: #004fda;
          padding: 6px 10px;
          border-radius: 999px;
          font: 700 10px/1 ui-monospace, Menlo, monospace;
          letter-spacing: 0.14em;
          animation: pop 0.24s ease;
        }
        @keyframes pop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .brand-kit-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 32px;
          margin-top: 16px;
          align-items: start;
        }
        .brand-kit-form {
          max-width: 640px;
          min-width: 0;
        }
        .brand-kit-preview {
          position: sticky;
          top: 24px;
          width: 232px;
        }
        .brand-kit-preview-inner {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .preview-label {
          padding-left: 2px;
        }
        .preview-card-well {
          display: flex;
          justify-content: center;
          padding: 16px;
          background: var(--color-surface);
          border: 1px solid var(--stroke-soft);
          border-radius: var(--radius);
        }
        .preview-anno {
          text-align: center;
        }
        @media (max-width: 860px) {
          .brand-kit-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .brand-kit-preview {
            position: static;
            width: 100%;
            justify-self: start;
          }
        }
      `}</style>
    </main>
  );
}
