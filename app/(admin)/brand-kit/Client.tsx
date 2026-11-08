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
import PageHeader from "@/components/PageHeader";
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
    <main className="page ad-page">
      <PageHeader
        label="Brand"
        title="Brand"
        soft="kit"
        subtitle="Pick a brand colour. Save to push the palette to every template."
        actions={
          <>
            {flash === "saved" && <span className="ad-flash" role="status">Saved ✓</span>}
            {dirty && (
              <Button variant="sec" onClick={revert}>Revert</Button>
            )}
            <Button onClick={save} disabled={!dirty || isPending} style={{ minWidth: 148 }}>
              {isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
          </>
        }
      />

      <div className="ad-split">
        <div className="ad-stack">
          <section className="panel">
            <h2 className="section-title">Shop details</h2>
            <div className="ad-form">
              <ImageSlot
                value={draft.logo}
                onChange={(v) => setDraft({ ...draft, logo: v })}
                label="Logo"
                width={80}
                height={80}
              />

              <div className="ad-grid-2">
                <label className="ad-field">
                  <span className="k">Shop name</span>
                  <input
                    className="inp"
                    value={draft.shopName}
                    onChange={(e) => setDraft({ ...draft, shopName: e.target.value })}
                    placeholder="SHANIA COLLECTIONS"
                  />
                </label>

                <label className="ad-field">
                  <span className="k">Shop URL</span>
                  <input
                    className="inp"
                    value={draft.shopUrl}
                    onChange={(e) => setDraft({ ...draft, shopUrl: e.target.value })}
                    placeholder="shop.app/shania"
                  />
                </label>
              </div>

              <div className="ad-field">
                <span className="k">WhatsApp number</span>
                <PhoneInput
                  value={draft.whatsapp ?? ""}
                  onChange={(next) => setDraft({ ...draft, whatsapp: next || undefined })}
                  placeholder="772 000 000"
                />
                <span className="ad-hint">
                  Used for buyer &ldquo;Order on WhatsApp&rdquo; links. Pick a country then type the number.
                </span>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Palette maker</h2>
            <PaletteMaker
              value={draft.palette}
              onChange={(p) => setDraft({ ...draft, palette: p })}
            />
          </section>

          <section className="panel">
            <h2 className="section-title">Card layout</h2>
            <div className="ad-form">
              <div className="ad-field">
                <span className="k">Frame style</span>
                <SegmentedControl
                  value={draft.frame}
                  options={FRAME_OPTIONS}
                  onChange={(v) => setDraft({ ...draft, frame: v })}
                />
              </div>

              <div className="ad-field">
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
          </section>
        </div>

        <aside className="ad-aside panel" aria-label="Status card preview">
          <h2 className="section-title">Live preview</h2>
          <div className="ad-well">
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
          <p className="ad-hint" style={{ margin: "14px 0 0", textAlign: "center" }}>
            Updates as you edit — save to apply to every card.
          </p>
        </aside>
      </div>

      {/* Phones: the header's Save scrolls out of reach, so pin one to the bottom
          whenever there's something to save. */}
      {(dirty || isPending) && (
        <div className="ad-savebar" role="region" aria-label="Unsaved changes">
          <span className="ad-savebar-note">Unsaved changes</span>
          <Button variant="sec" onClick={revert} disabled={isPending}>Revert</Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </main>
  );
}
