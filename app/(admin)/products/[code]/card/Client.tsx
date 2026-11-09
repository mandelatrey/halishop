"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import Frame from "@/components/Frame";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import StatusCard from "@/components/StatusCard";
import ExportCard from "@/components/ExportCard";
import TemplatePicker from "@/components/TemplatePicker";
import { downloadCardAsPng } from "@/lib/render-card";
import type { BrandKit, CardConfig, CustomTemplate, Product, ResolvedTemplate } from "@/lib/types";
import { BUILTIN_TEMPLATES } from "@/lib/types";

export default function CardGeneratorClient({
  product,
  brand,
  customs,
}: {
  product: Product;
  brand: BrandKit;
  customs: CustomTemplate[];
}) {
  const [config, setConfig] = useState<CardConfig>({
    templateId: "builtin:bar",
    showPrice: true,
    codeFormat: "short",
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const wellRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  // The card fills its preview column (narrow on phones), capped at 200px.
  // Export always renders 1080×1920 regardless (see downloadCardAsPng).
  const [cardWidth, setCardWidth] = useState(200);
  useEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    const fit = () => {
      const cs = getComputedStyle(el);
      const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setCardWidth(Math.max(120, Math.min(200, Math.floor(inner))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const template = resolveTemplate(config.templateId, customs) ?? {
    kind: "builtin",
    id: "bar",
    label: "bar",
  };

  async function save() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      await downloadCardAsPng(cardRef.current, `${product.code}.png`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong exporting the card. Check the browser console.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="page ad-page">
      <PageHeader
        label={`Product · ${product.code}`}
        title="Card"
        soft="generator"
        subtitle={<>Make a status card for <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>{product.title}</strong>. The code is burned into the image so every order traces back.</>}
        actions={<Link href="/products" className="btn sec">← Products</Link>}
      />

      {/* Preview and settings sit side by side at every width (see .ad-cardgen) */}
      <div className="ad-split left-aside ad-cardgen">
        <div className="ad-aside" style={{ display: "flex", justifyContent: "center" }}>
          <Frame title="Status preview" width={340}>
            <div
              className="col"
              style={{
                alignItems: "center",
                padding: "16px 20px 28px",
              }}
            >
              <div className="ad-well" ref={wellRef} style={{ width: "100%" }}>
                <StatusCard
                  product={product}
                  brand={brand}
                  config={config}
                  template={template}
                  width={cardWidth}
                />
                <ExportCard ref={cardRef} product={product} brand={brand} config={config} template={template} />
              </div>
            </div>
          </Frame>
        </div>

        <section className="panel">
          <div className="ad-panel-head">
            <h2 className="section-title">Card · {product.title}</h2>
            <span className="tag">{product.code}</span>
          </div>

          <div className="ad-form">
            <div className="ad-field">
              <span className="k">Template</span>
              <TemplatePicker
                product={product}
                brand={brand}
                config={config}
                customs={customs}
                onSelect={(id) => setConfig((c) => ({ ...c, templateId: id }))}
              />
            </div>

            <div className="ad-grid-2">
              <div className="ad-field">
                <span className="k">Show price</span>
                <SegmentedControl
                  value={config.showPrice ? "Yes" : "No"}
                  options={[
                    { label: "Yes", value: "Yes" },
                    { label: "No", value: "No" },
                  ]}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, showPrice: v === "Yes" }))
                  }
                />
              </div>
              <div className="ad-field">
                <span className="k">Code</span>
                <SegmentedControl
                  value={config.codeFormat}
                  options={[
                    { label: product.code, value: "short" },
                    { label: "Full ref", value: "full" },
                  ]}
                  onChange={(v) => setConfig((c) => ({ ...c, codeFormat: v }))}
                />
              </div>
            </div>

            <hr className="ad-divider" />

            <div className="ad-field">
              <Button onClick={save} disabled={exporting}>
                {exporting ? "Rendering…" : "Save to gallery, then post"}
              </Button>
              <span className="ad-hint">
                Code burned into the image — survives screenshots and re-shares.
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function resolveTemplate(id: string, customs: CustomTemplate[]): ResolvedTemplate | null {
  if (id.startsWith("builtin:")) {
    const key = id.slice("builtin:".length);
    return BUILTIN_TEMPLATES.find((t) => t.id === key) ?? null;
  }
  if (id.startsWith("custom:")) {
    const uid = id.slice("custom:".length);
    const c = customs.find((t) => t.id === uid);
    return c ? { kind: "custom", ...c } : null;
  }
  return null;
}
