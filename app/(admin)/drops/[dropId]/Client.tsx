"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
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
      // Compute `next` from the current render's items rather than inside a
      // setState updater: updaters run during React's render phase and must be
      // pure, so starting a transition / server action from one throws
      // "Cannot call startTransition while rendering" (and double-fires the
      // save under StrictMode).
      const next = items.map((it) => (it.code === code ? { ...it, activeCaption: variant } : it));
      setItems(next);
      startTransition(async () => {
        await updateDropItems(drop.id, next);
      });
    },
    [drop.id, items]
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

  const posted = new Date(drop.postedAt);
  const postedAt = `${String(posted.getHours()).padStart(2, "0")}:${String(posted.getMinutes()).padStart(2, "0")}`;
  const expiryValue =
    drop.expiry.kind === "eod" ? "23:59" : drop.expiry.kind === "hours" ? "24h" : "Never";
  const expiryLabel =
    drop.expiry.kind === "eod"
      ? "off the page tonight"
      : drop.expiry.kind === "hours"
      ? "off the page in 24 hours"
      : "does not expire";
  const templateName = template.kind === "custom" ? template.name : template.label;

  return (
    <main className="page ad-page">
      <PageHeader
        label="Drop"
        title={drop.name}
        soft="is ready"
        subtitle={expiryLine(drop)}
        actions={<Link href="/drops/new" className="btn sec">+ Another drop</Link>}
      />

      <section className="panel-dark ad-hero">
        <div className="ad-hero-top">
          <span className="pill dark">Drop summary</span>
        </div>
        <div className="stat-row">
          <div>
            <div className="stat-v">{items.length}</div>
            <div className="stat-l">card{items.length === 1 ? "" : "s"} ready</div>
          </div>
          <div>
            <div className="stat-v">{postedAt}</div>
            <div className="stat-l">posted</div>
          </div>
          <div>
            <div className="stat-v">{expiryValue}</div>
            <div className="stat-l">{expiryLabel}</div>
          </div>
          <div>
            <div className="stat-v text">{templateName}</div>
            <div className="stat-l">template</div>
          </div>
        </div>
        <div className="ad-hero-foot">
          <div className="ad-actions">
            <Button onClick={saveAll} disabled={savingAll || items.length === 0}>
              {savingAll ? "Saving all…" : `Save all ${items.length} to gallery`}
            </Button>
            <Button variant="sec" disabled title="Coming soon">
              Share cards to another reseller
            </Button>
          </div>
          <div className="anno">
            Shared copies will point at their shop link, not yours — coming soon.
          </div>
        </div>
      </section>

      <div className="ad-drop-grid">
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
            <section key={it.code} className="panel ad-drop-card">
              <div className="ad-well">
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

              <div className="ad-drop-card-body">
                <div className="ad-drop-card-row">
                  <span className="mono">{trackedLink}</span>
                  <button
                    type="button"
                    className="btn gh"
                    onClick={() => saveOne(it.code)}
                  >
                    Save PNG
                  </button>
                </div>

                <hr className="ad-divider" />

                <div className="ad-drop-card-row">
                  <span className="k">Caption</span>
                  <div className="ad-chips" style={{ gap: 6 }}>
                    {VARIANTS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`ad-chip sm${it.activeCaption === v ? " on" : ""}`}
                        onClick={() => setActiveVariant(it.code, v)}
                        aria-pressed={it.activeCaption === v}
                      >
                        {VARIANT_LABEL[v]}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className="inp"
                  rows={4}
                  value={rendered}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="ad-drop-card-row">
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
            </section>
          );
        })}
      </div>
    </main>
  );
}
