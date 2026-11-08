"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
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
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Edit template</h1>
        <Link href="/templates" className="k">← All templates</Link>
      </div>

      <div className="two-col">
        {/* Left: config */}
        <div className="col" style={{ gap: 18 }}>
          <label className="col" style={{ gap: 6 }}>
            <span className="k">Name</span>
            <input
              className="inp"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>

          <div className="col" style={{ gap: 6 }}>
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

          <div className="col" style={{ gap: 6 }}>
            <span className="k">Composition</span>
            <SegmentedControl
              value={draft.composition}
              options={COMPOSITION_OPTIONS}
              onChange={(v) => setDraft({ ...draft, composition: v })}
            />
            <span className="s">
              {draft.composition === "background" &&
                "Your image sits behind the product photo; product photo remains the star."}
              {draft.composition === "overlay" &&
                "Your image sits on top of the product photo. Use a PNG with transparency."}
              {draft.composition === "full" &&
                "Your image is the whole card. Product photo is skipped; only your design + programmatic text."}
            </span>
          </div>

          <div className="col" style={{ gap: 6 }}>
            <span className="k">Text zone</span>
            <TextZonePicker
              value={draft.textZone}
              onChange={(z) => setDraft({ ...draft, textZone: z })}
            />
            <span className="s">Tap where the app should anchor the programmatic text stack.</span>
          </div>

          <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
            <div className="col" style={{ gap: 6, flex: 1 }}>
              <span className="k">Text color</span>
              <input
                type="color"
                value={draft.textColor}
                onChange={(e) => setDraft({ ...draft, textColor: e.target.value })}
                style={{ width: 60, height: 32, border: "1px solid var(--stroke-soft)", padding: 0 }}
              />
            </div>
            <div className="col" style={{ gap: 6, flex: 1 }}>
              <span className="k">Accent (price)</span>
              <input
                type="color"
                value={draft.accentColor}
                onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
                style={{ width: 60, height: 32, border: "1px solid var(--stroke-soft)", padding: 0 }}
              />
            </div>
          </div>

          <div className="col" style={{ gap: 6 }}>
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

          {draft.composition !== "full" && (
            <div className="col" style={{ gap: 6 }}>
              <span className="k">Product image</span>
              <SegmentedControl
                value={draft.productImageMode}
                options={PIMG_OPTIONS}
                onChange={(v) => setDraft({ ...draft, productImageMode: v })}
              />
            </div>
          )}

          <div className="row" style={{ gap: 8 }}>
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : "Save template"}
            </Button>
            <Button variant="sec" onClick={del} disabled={isPending}>Delete</Button>
          </div>
        </div>

        {/* Right: preview + design instructions */}
        <div className="col" style={{ gap: 16 }}>
          <div>
            <div className="section-title">Live preview (sample: {sampleProduct.code} · {sampleProduct.title})</div>
            <div
              style={{
                background: "#f3f2f1",
                border: "1px solid var(--stroke-hair)",
                padding: 24,
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
              }}
            >
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
                <div className="ph" style={{ width: 220, height: 391 }}>
                  upload an image
                  <br />
                  to see preview
                </div>
              )}
            </div>

            {draft.composition !== "full" && draft.productImageMode !== "hidden" && (
              <>
                <div className="col" style={{ gap: 6, marginTop: 12 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="k">Product image scale</span>
                    <span className="s" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {(draft.productScale ?? 1).toFixed(2)}×
                    </span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <input
                      type="range"
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
                  <span className="s">
                    Baked into the template — product photos land at this scale from the centre, so
                    uploads of any size share the same crop.
                  </span>
                </div>

                <div className="col" style={{ gap: 6, marginTop: 12 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="k">Product image position</span>
                    <span className="s" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {((draft.productOffsetX ?? 0) * 100).toFixed(0)}%,{" "}
                      {((draft.productOffsetY ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span className="s" style={{ flex: 1 }}>
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
              </>
            )}
          </div>

          <DesignInstructions />
        </div>
      </div>
    </main>
  );
}

function DesignInstructions() {
  return (
    <div className="dinstr">
      <h3>How the app will lay out your design</h3>
      <dl>
        <dt>Aspect ratio</dt>
        <dd>9:16 vertical · recommended 1080 × 1920</dd>
        <dt>File format</dt>
        <dd>PNG (keep transparency for overlays) · JPG or PNG for backgrounds and full designs</dd>
      </dl>

      <h3 style={{ marginTop: 12 }}>Fields the app will render on top</h3>
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

      <h3 style={{ marginTop: 12 }}>Where the text goes</h3>
      <p style={{ margin: 0, font: "400 10.5px/1.5 'DM Sans', sans-serif" }}>
        Pick a zone in the 3×3 grid at left. The app anchors the text stack in a ~160-pixel-wide
        safe area at that corner. Leave that region uncluttered in your design.
      </p>

      <h3 style={{ marginTop: 12 }}>Product photo behaviour</h3>
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
    </div>
  );
}
