"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
import StatusCard from "@/components/StatusCard";
import { downloadCardAsPng } from "@/lib/render-card";
import { updateDropItems } from "@/lib/actions/drops";
import { captionTokensFor, renderCaption, trackedLinkFor } from "@/lib/captions";
import { BUILTIN_TEMPLATES } from "@/lib/types";
import type {
  CaptionVariantKind,
  CustomTemplate,
  Drop,
  DropItem,
  Product,
  ResolvedTemplate,
  Shop,
} from "@/lib/types";

const VARIANTS: CaptionVariantKind[] = ["default", "scarcity", "restock"];
const VARIANT_LABEL: Record<CaptionVariantKind, string> = {
  default: "Default",
  scarcity: "Scarcity",
  restock: "Restock",
};

function resolveTemplate(id: string, customs: CustomTemplate[]): ResolvedTemplate {
  if (id.startsWith("custom:")) {
    const uid = id.slice("custom:".length);
    const c = customs.find((t) => t.id === uid);
    if (c) return { kind: "custom", ...c };
  }
  const key = id.startsWith("builtin:") ? id.slice("builtin:".length) : id;
  return BUILTIN_TEMPLATES.find((t) => t.id === key) ?? BUILTIN_TEMPLATES[0];
}

function expiryLine(drop: Drop): string {
  const posted = new Date(drop.postedAt);
  const hh = String(posted.getHours()).padStart(2, "0");
  const mm = String(posted.getMinutes()).padStart(2, "0");
  const base = `Posted ${hh}:${mm}`;
  if (drop.expiry.kind === "eod") return `${base} · off the page at 23:59`;
  if (drop.expiry.kind === "hours") return `${base} · off the page in 24h`;
  return `${base} · does not expire`;
}

export default function DropOutputClient({
  shop,
  drop,
  products,
  customs,
}: {
  shop: Shop;
  drop: Drop;
  products: Product[];
  customs: CustomTemplate[];
}) {
  const template = useMemo(() => resolveTemplate(drop.templateId, customs), [drop.templateId, customs]);
  const [items, setItems] = useState<DropItem[]>(drop.items);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const productByCode = useMemo(
    () => new Map(products.map((p) => [p.code, p])),
    [products]
  );

  const setActiveVariant = useCallback(
    (code: string, variant: CaptionVariantKind) => {
      setItems((prev) => {
        const next = prev.map((it) => (it.code === code ? { ...it, activeCaption: variant } : it));
        startTransition(async () => {
          await updateDropItems(drop.id, next);
        });
        return next;
      });
    },
    [drop.id]
  );

  async function saveOne(code: string) {
    const node = cardRefs.current[code];
    if (!node) return;
    await downloadCardAsPng(node, `${code}.png`);
  }

  async function saveAll() {
    setSavingAll(true);
    try {
      for (const it of items) {
        const node = cardRefs.current[it.code];
        if (!node) continue;
        await downloadCardAsPng(node, `${it.code}.png`);
        await new Promise((r) => setTimeout(r, 60));
      }
    } finally {
      setSavingAll(false);
    }
  }

  async function copyCaption(code: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1600);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>{drop.name}</h1>
        <Link href="/drops/new" className="k">+ Another drop</Link>
      </div>

      <div
        className="col"
        style={{
          gap: 4,
          padding: "12px 14px",
          background: "var(--color-accent)",
          color: "#fff",
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        <div style={{ font: "700 15px/1.1 'DM Sans', sans-serif", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
          {items.length} card{items.length === 1 ? "" : "s"} ready
        </div>
        <div style={{ font: "600 10px/1.4 ui-monospace, Menlo, monospace", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.9 }}>
          {expiryLine(drop)}
        </div>
      </div>

      <div className="drop-grid">
        {items.map((it) => {
          const product = productByCode.get(it.code);
          if (!product) return null;
          const tokens = captionTokensFor(shop, product);
          const captionMap = new Map(it.captions.map((c) => [c.variant, c.text]));
          const activeTemplate = captionMap.get(it.activeCaption) ?? "";
          const rendered = renderCaption(activeTemplate, tokens);
          const trackedLink = trackedLinkFor(it.code);
          const copied = copiedCode === it.code;
          return (
            <div
              key={it.code}
              className="col"
              style={{
                gap: 10,
                padding: 14,
                background: "#fff",
                border: "1px solid var(--stroke-soft)",
                borderRadius: 12,
              }}
            >
              <div className="row" style={{ justifyContent: "center" }}>
                <div ref={(el) => { cardRefs.current[it.code] = el; }}>
                  <StatusCard
                    product={product}
                    brand={shop.brandKit}
                    config={{
                      templateId: drop.templateId,
                      showPrice: drop.cardConfig.showPrice,
                      codeFormat: drop.cardConfig.codeFormat,
                    }}
                    template={template}
                    width={180}
                  />
                </div>
              </div>

              <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="mono" style={{ fontSize: 10 }}>{trackedLink}</span>
                <button
                  type="button"
                  className="btn gh"
                  onClick={() => saveOne(it.code)}
                >
                  Save PNG
                </button>
              </div>

              <div className="col" style={{ gap: 6 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="k">Caption</span>
                  <div className="row" style={{ gap: 6 }}>
                    {VARIANTS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`btn gh${it.activeCaption === v ? " on" : ""}`}
                        onClick={() => setActiveVariant(it.code, v)}
                        aria-pressed={it.activeCaption === v}
                        style={{ padding: "4px 8px", fontSize: 10 }}
                      >
                        {VARIANT_LABEL[v]}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className="inp"
                  rows={3}
                  value={rendered}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <span className="s">
                    {rendered.length} chars · WhatsApp allows ~300 in a status caption
                  </span>
                  <button
                    type="button"
                    className={`btn sm${copied ? "" : " sec"}`}
                    onClick={() => copyCaption(it.code, rendered)}
                    disabled={isPending}
                  >
                    {copied ? "Copied ✓" : "Copy caption"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="col"
        style={{
          gap: 10,
          padding: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--stroke-soft)",
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button onClick={saveAll} disabled={savingAll || items.length === 0}>
            {savingAll ? "Saving all…" : `Save all ${items.length} to gallery`}
          </Button>
          <Button variant="sec" disabled title="Coming soon">
            Share cards to another reseller
          </Button>
        </div>
        <div className="anno">
          shared copies will point at THEIR shop link, not yours — coming soon
        </div>
      </div>

      <style jsx>{`
        .drop-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          margin-top: 20px;
        }
      `}</style>
    </main>
  );
}
