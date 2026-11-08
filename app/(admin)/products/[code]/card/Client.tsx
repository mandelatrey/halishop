"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import Button from "@/components/Button";
import Frame from "@/components/Frame";
import SegmentedControl from "@/components/SegmentedControl";
import StatusCard from "@/components/StatusCard";
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
  const [exporting, setExporting] = useState(false);

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
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Card generator</h1>
        <Link href="/products" className="k">← Products</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 24px" }}>
        <Frame title="MAKE STATUS CARDS">
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              padding: "11px 12px",
              borderBottom: "1px solid var(--stroke-soft)",
            }}
          >
            <div className="t">CARD · {product.title.toUpperCase()}</div>
            <span className="tag">{product.code}</span>
          </div>

          <div
            className="col"
            style={{
              alignItems: "center",
              padding: 20,
              background: "#f3f2f1",
              borderBottom: "1px solid var(--stroke-hair)",
            }}
          >
            <StatusCard
              ref={cardRef}
              product={product}
              brand={brand}
              config={config}
              template={template}
              width={200}
            />
          </div>

          <div className="col" style={{ gap: 9, padding: 12 }}>
            <span className="k">Template</span>
            <TemplatePicker
              product={product}
              brand={brand}
              config={config}
              customs={customs}
              onSelect={(id) => setConfig((c) => ({ ...c, templateId: id }))}
            />

            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <div className="col" style={{ gap: 4, flex: 1 }}>
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
              <div className="col" style={{ gap: 4, flex: 1 }}>
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

            <Button onClick={save} disabled={exporting}>
              {exporting ? "Rendering…" : "Save to gallery, then post"}
            </Button>
            <div className="anno">
              code burned into the image — survives screenshots and re-shares
            </div>
          </div>
        </Frame>
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
