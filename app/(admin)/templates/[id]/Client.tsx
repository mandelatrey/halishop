"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import TextZonePicker from "@/components/TextZonePicker";
import StatusCard from "@/components/StatusCard";
import { fileToDataUrl, imageDimensions } from "@/lib/render-card";
import { removeCustomTemplate, upsertCustomTemplate } from "@/lib/actions/templates";
import type {
  BrandKit,
  CustomTemplate,
  CustomTemplateComposition,
  Product,
  ProductImageMode,
} from "@/lib/types";

const COMPOSITION_OPTIONS: { label: string; value: CustomTemplateComposition }[] = [
  { label: "Background", value: "background" },
  { label: "Overlay", value: "overlay" },
  { label: "Full", value: "full" },
];

const PIMG_OPTIONS: { label: string; value: ProductImageMode }[] = [
  { label: "Grayscale", value: "grayscale" },
  { label: "Color", value: "color" },
  { label: "Hidden", value: "hidden" },
];

const FIELD_KEYS = [
  { key: "shopName", label: "Shop name" },
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "code", label: "Code" },
  { key: "shopUrl", label: "Shop URL" },
] as const;

export default function TemplateEditorClient({
  initial,
  brand,
  products,
}: {
  initial: CustomTemplate;
  brand: BrandKit;
  products: Product[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CustomTemplate>(initial);
  const [aspectWarn, setAspectWarn] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const posDragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const [isPositioning, setIsPositioning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sampleProduct = products.find((p) => p.code === "B3") ?? products[0];

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setAspectWarn(null);
    const url = await fileToDataUrl(f);
    try {
      const { width, height } = await imageDimensions(url);
      const target = 9 / 16;
      const actual = width / height;
      const diff = Math.abs(actual - target) / target;
      if (diff > 0.05) {
        setAspectWarn(
          `This image is ${width}×${height} (${actual.toFixed(2)}:1). Cards render at 9:16 (0.5625:1) so parts may be cropped or stretched. Recommended: 1080×1920.`
        );
      }
    } catch {
      setAspectWarn("Couldn't decode the image dimensions. Try a different file.");
    }
    setDraft({ ...draft, image: url });
  }

  function save() {
    startTransition(async () => {
      await upsertCustomTemplate(draft);
      router.push("/templates");
    });
  }

  function del() {
    if (!confirm(`Delete "${draft.name}"?`)) return;
    startTransition(async () => {
      await removeCustomTemplate(draft.id);
      router.push("/templates");
    });
  }

  return (
    <main className="page ad-page">
      <PageHeader
        label="Templates"
        title="Edit"
        soft="template"
        subtitle="Upload a 9:16 design, pick where the text sits, and check the live preview before you save."
        actions={
          <>
            <Link href="/templates" className="ad-back">← All templates</Link>
            <Button variant="sec" onClick={del} disabled={isPending}>Delete</Button>
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : "Save template"}
            </Button>
          </>
        }
      />

      <div className="ad-split wide-aside">
        {/* Left: config */}
        <div className="ad-stack">
          <section className="panel">
            <h2 className="section-title">Design</h2>
            <div className="ad-form">
              <label className="ad-field">
                <span className="k">Name</span>
                <input
                  className="inp"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>

              <div className="ad-field">
                <span className="k">Image</span>
                <div
                  ref={dropRef}
                  className={`drop${dragging ? " on" : ""}`}
                  onClick={() => document.getElementById("tpl-file")?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  {draft.image ? (
                    <>
                      <span>Click or drop to replace</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="thumb" src={draft.image} alt="preview" />
                    </>
                  ) : (
                    <span>
                      Drop a 9:16 PNG or JPG here — or click to choose a file.
                    </span>
                  )}
                  <input
                    id="tpl-file"
                    type="file"
                    accept="image/png,image/jpeg"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
                {aspectWarn && <div className="dinstr warn">{aspectWarn}</div>}
              </div>

              <div className="ad-field">
                <span className="k">Composition</span>
                <SegmentedControl
                  value={draft.composition}
                  options={COMPOSITION_OPTIONS}
                  onChange={(v) => setDraft({ ...draft, composition: v })}
                />
                <span className="ad-hint">
                  {draft.composition === "background" &&
                    "Your image sits behind the product photo; product photo remains the star."}
                  {draft.composition === "overlay" &&
                    "Your image sits on top of the product photo. Use a PNG with transparency."}
                  {draft.composition === "full" &&
                    "Your image is the whole card. Product photo is skipped; only your design + programmatic text."}
                </span>
              </div>

              {draft.composition !== "full" && (
                <div className="ad-field">
                  <span className="k">Product image</span>
                  <SegmentedControl
                    value={draft.productImageMode}
                    options={PIMG_OPTIONS}
                    onChange={(v) => setDraft({ ...draft, productImageMode: v })}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Text</h2>
            <div className="ad-form">
              <div className="ad-row" style={{ gap: 20 }}>
                <TextZonePicker
                  value={draft.textZone}
                  onChange={(z) => setDraft({ ...draft, textZone: z })}
                />
                <div className="ad-field" style={{ flex: "1 1 180px" }}>
                  <span className="k">Text zone</span>
                  <span className="ad-hint">Tap where the app should anchor the programmatic text stack.</span>
                </div>
              </div>

              <div className="ad-row" style={{ gap: 16 }}>
                <div className="ad-field" style={{ flex: "1 1 140px" }}>
                  <span className="k">Text color</span>
                  <label className="ad-color">
                    <input
                      type="color"
                      value={draft.textColor}
                      onChange={(e) => setDraft({ ...draft, textColor: e.target.value })}
                    />
                    <span>{draft.textColor}</span>
                  </label>
                </div>
                <div className="ad-field" style={{ flex: "1 1 140px" }}>
                  <span className="k">Accent (price)</span>
                  <label className="ad-color">
                    <input
                      type="color"
                      value={draft.accentColor}
                      onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
                    />
                    <span>{draft.accentColor}</span>
                  </label>
                </div>
              </div>

              <div className="ad-field">
                <span className="k">Fields to render</span>
                <div className="fields">
                  {FIELD_KEYS.map(({ key, label }) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={draft.fields[key]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            fields: { ...draft.fields, [key]: e.target.checked },
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

        {/* Right: preview + design instructions */}
        <div className="ad-stack">
          <section className="panel">
            <div className="ad-panel-head">
              <h2 className="section-title">Live preview</h2>
              <span className="s">Sample: {sampleProduct.code} · {sampleProduct.title}</span>
            </div>
            <div className="ad-well">
              {draft.image ? (
                <div
                  onDragStart={(e) => e.preventDefault()}
                  onPointerDown={(e) => {
                    if (
                      draft.composition === "full" ||
                      draft.productImageMode === "hidden"
                    )
                      return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    posDragRef.current = {
                      startX: e.clientX,
                      startY: e.clientY,
                      baseX: draft.productOffsetX ?? 0,
                      baseY: draft.productOffsetY ?? 0,
                    };
                    setIsPositioning(true);
                  }}
                  onPointerMove={(e) => {
                    const d = posDragRef.current;
                    if (!d) return;
                    const cardW = 220;
                    const cardH = (220 / 9) * 16;
                    const nx = d.baseX + (e.clientX - d.startX) / cardW;
                    const ny = d.baseY + (e.clientY - d.startY) / cardH;
                    setDraft((prev) => ({
                      ...prev,
                      productOffsetX: Math.max(-1, Math.min(1, nx)),
                      productOffsetY: Math.max(-1, Math.min(1, ny)),
                    }));
                  }}
                  onPointerUp={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    posDragRef.current = null;
                    setIsPositioning(false);
                  }}
                  onPointerCancel={() => {
                    posDragRef.current = null;
                    setIsPositioning(false);
                  }}
                  style={{
                    cursor:
                      draft.composition === "full" ||
                      draft.productImageMode === "hidden"
                        ? "default"
                        : isPositioning
                        ? "grabbing"
                        : "grab",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                >
                  <StatusCard
                    product={sampleProduct}
                    brand={brand}
                    config={{
                      templateId: `custom:${draft.id}`,
                      showPrice: true,
                      codeFormat: "short",
                    }}
                    template={{ kind: "custom", ...draft }}
                    width={220}
                  />
                </div>
              ) : (
                <div className="ad-empty-ph" style={{ width: 220, height: 391, borderRadius: 10, border: "1px dashed var(--stroke-strong)", textAlign: "center" }}>
                  Upload an image
                  <br />
                  to see the preview
                </div>
              )}
            </div>

            {draft.composition !== "full" && draft.productImageMode !== "hidden" && (
              <div className="ad-form" style={{ marginTop: 24 }}>
                <div className="ad-field">
                  <div className="ad-meter">
                    <span className="k">Product image scale</span>
                    <span className="s">{(draft.productScale ?? 1).toFixed(2)}×</span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <input
                      type="range"
                      className="ad-range"
                      min={0.5}
                      max={2}
                      step={0.01}
                      value={draft.productScale ?? 1}
                      onChange={(e) =>
                        setDraft({ ...draft, productScale: parseFloat(e.target.value) })
                      }
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn gh"
                      onClick={() => setDraft({ ...draft, productScale: 1 })}
                      disabled={(draft.productScale ?? 1) === 1}
                    >
                      Reset
                    </button>
                  </div>
                  <span className="ad-hint">
                    Baked into the template — product photos land at this scale from the centre, so
                    uploads of any size share the same crop.
                  </span>
                </div>

                <div className="ad-field">
                  <div className="ad-meter">
                    <span className="k">Product image position</span>
                    <span className="s">
                      {((draft.productOffsetX ?? 0) * 100).toFixed(0)}%,{" "}
                      {((draft.productOffsetY ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span className="ad-hint" style={{ flex: 1 }}>
                      Drag the preview to reposition the product photo.
                    </span>
                    <button
                      type="button"
                      className="btn gh"
                      onClick={() =>
                        setDraft({ ...draft, productOffsetX: 0, productOffsetY: 0 })
                      }
                      disabled={
                        (draft.productOffsetX ?? 0) === 0 &&
                        (draft.productOffsetY ?? 0) === 0
                      }
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <DesignInstructions />
        </div>
      </div>
    </main>
  );
}

function DesignInstructions() {
  return (
    <section className="panel ad-guide">
      <h2 className="section-title">Design guide</h2>
      <h3>How the app will lay out your design</h3>
      <dl>
        <dt>Aspect ratio</dt>
        <dd>9:16 vertical · recommended 1080 × 1920</dd>
        <dt>File format</dt>
        <dd>PNG (keep transparency for overlays) · JPG or PNG for backgrounds and full designs</dd>
      </dl>

      <h3>Fields the app will render on top</h3>
      <ul>
        <li>
          <strong>SHOP NAME</strong> — small monospace caps
        </li>
        <li>
          <strong>TITLE</strong> — bold, ~15px on preview / ~72px on export
        </li>
        <li>
          <strong>PRICE</strong> — bold, accent colour you pick
        </li>
        <li>
          <strong>CODE</strong> — monospace, 12px preview / 58px export. This is the tracking code —
          do not obscure it or resellers can&rsquo;t track orders.
        </li>
        <li>
          <strong>SHOP URL</strong> — small monospace caps
        </li>
      </ul>

      <h3>Where the text goes</h3>
      <p>
        Pick a zone in the 3×3 grid at left. The app anchors the text stack in a ~160-pixel-wide
        safe area at that corner. Leave that region uncluttered in your design.
      </p>

      <h3>Product photo behaviour</h3>
      <ul>
        <li>
          <strong>Background</strong> — your image sits behind the product photo, which stays centred.
        </li>
        <li>
          <strong>Overlay</strong> — your image sits on top of the product photo. Use PNG transparency.
        </li>
        <li>
          <strong>Full</strong> — the app skips the product photo; only your design + text render.
        </li>
      </ul>

      <div className="warn">
        The tracking code is burned into the exported PNG. Don&rsquo;t cover it with your design.
      </div>
    </section>
  );
}
