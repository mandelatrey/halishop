"use client";

import ProductPhoto from "@/components/ProductPhoto";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import TemplatePicker from "@/components/TemplatePicker";
import { createDrop } from "@/lib/actions/drops";
import { formatPrice } from "@/lib/format";
import { BUILTIN_TEMPLATES } from "@/lib/types";
import type {
  BrandKit,
  BuiltinTemplateId,
  CardConfig,
  CustomTemplate,
  DropExpiry,
  Product,
} from "@/lib/types";

const EXPIRY_OPTIONS: { label: string; value: DropExpiry["kind"] }[] = [
  { label: "23:59", value: "eod" },
  { label: "24h", value: "hours" },
  { label: "Never", value: "never" },
];

function toExpiry(kind: DropExpiry["kind"]): DropExpiry {
  if (kind === "hours") return { kind: "hours", hours: 24 };
  if (kind === "never") return { kind: "never" };
  return { kind: "eod" };
}

export default function NewDropClient({
  brand,
  products,
  customs,
}: {
  brand: BrandKit;
  products: Product[];
  customs: CustomTemplate[];
}) {
  const router = useRouter();
  const [name, setName] = useState("Today's drop");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiryKind, setExpiryKind] = useState<DropExpiry["kind"]>("eod");
  const [templateId, setTemplateId] = useState<string>("builtin:bar");
  const [showPrice, setShowPrice] = useState(true);
  const [codeFormat, setCodeFormat] = useState<"short" | "full">("short");
  const [isPending, startTransition] = useTransition();

  const previewProduct = useMemo(
    () => products.find((p) => !p.soldOut) ?? products[0],
    [products]
  );

  const previewConfig: CardConfig = { templateId, showPrice, codeFormat };

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function generate() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const drop = await createDrop({
        name,
        productCodes: Array.from(selected),
        expiry: toExpiry(expiryKind),
        templateId,
        showPrice,
        codeFormat,
      });
      router.push(`/drops/${drop.id}`);
    });
  }

  const eligible = products.filter((p) => !p.soldOut);
  const soldOut = products.filter((p) => p.soldOut);
  const dropSlugPreview = `${brand.shopUrl}/d/…`;

  return (
    <main className="page ad-page">
      <PageHeader
        label="Drops"
        title="New"
        soft="drop"
        subtitle={<>Pick the items you&rsquo;re posting today. The app generates a card and caption for each, all sharing one tracked drop link.</>}
        actions={<Link href="/products" className="btn sec">← Products</Link>}
      />

      <div className="ad-split">
        {/* LEFT: product multi-select + name */}
        <div className="ad-stack">
          <section className="panel">
            <h2 className="section-title">Drop details</h2>
            <label className="ad-field">
              <span className="k">Drop name</span>
              <input
                className="inp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Today's drop"
              />
            </label>
          </section>

          <section className="panel ad-list">
            <div className="ad-list-head">
              <h2 className="section-title">Pick what you&rsquo;re posting</h2>
              <span className={`tag${selected.size > 0 ? " acc" : ""}`}>{selected.size} selected</span>
            </div>
            <div>
              {eligible.map((p) => {
                const on = selected.has(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => toggle(p.code)}
                    aria-pressed={on}
                    className={`ad-pick${on ? " on" : ""}`}
                  >
                    <span aria-hidden className="ad-check">{on ? "✓" : ""}</span>
                    <div className="ad-thumb">
                      <ProductPhoto src={p.image} meta={p.imageMeta} fit={p.imageFit} label={p.code} padding={0.06} />
                    </div>
                    <div className="ad-pick-body">
                      <span className="t2">{p.title}</span>
                      <span className="s">{formatPrice(p.price, p.currency)} · {p.stock ?? 0} in stock</span>
                    </div>
                    <span className="tag" style={{ flex: "none" }}>{p.code}</span>
                  </button>
                );
              })}
              {soldOut.map((p) => (
                <div key={p.code} className="ad-pick off">
                  <span aria-hidden className="ad-check" />
                  <div className="ad-thumb" />
                  <div className="ad-pick-body">
                    <span className="t2">{p.title}</span>
                    <span className="s">Sold out</span>
                  </div>
                  <span className="tag" style={{ flex: "none" }}>{p.code}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Card style</h2>
            <div className="ad-form">
              <div className="ad-field">
                <span className="k">Template · applies to every card in the drop</span>
                {previewProduct && (
                  <TemplatePicker
                    product={previewProduct}
                    brand={brand}
                    config={previewConfig}
                    customs={customs}
                    onSelect={setTemplateId}
                  />
                )}
              </div>

              <div className="ad-grid-2">
                <div className="ad-field">
                  <span className="k">Show price</span>
                  <SegmentedControl
                    value={showPrice ? "Yes" : "No"}
                    options={[
                      { label: "Yes", value: "Yes" },
                      { label: "No", value: "No" },
                    ]}
                    onChange={(v) => setShowPrice(v === "Yes")}
                  />
                </div>
                <div className="ad-field">
                  <span className="k">Code</span>
                  <SegmentedControl
                    value={codeFormat}
                    options={[
                      { label: "Short", value: "short" },
                      { label: "Full ref", value: "full" },
                    ]}
                    onChange={(v) => setCodeFormat(v)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT: drop meta + generate button */}
        <aside className="ad-aside panel-dark ad-summary">
          <div>
            <span className="pill dark">Summary</span>
            <div className="stat-v">
              {selected.size}
              <span className="soft"> / {eligible.length}</span>
            </div>
            <div className="stat-l">item{selected.size === 1 ? "" : "s"} in this drop</div>
          </div>
          <div className="ad-field">
            <span className="k">Drop link</span>
            <span className="mono">{dropSlugPreview}</span>
          </div>
          <div className="ad-field">
            <span className="k">Expires</span>
            <SegmentedControl
              value={expiryKind}
              options={EXPIRY_OPTIONS}
              onChange={(v) => setExpiryKind(v)}
            />
          </div>
          <div className="ad-field">
            <Button
              onClick={generate}
              disabled={selected.size === 0 || isPending}
            >
              {isPending
                ? "Generating…"
                : selected.size === 0
                ? "Pick at least one item"
                : `Generate ${selected.size} card${selected.size === 1 ? "" : "s"} + caption${selected.size === 1 ? "" : "s"}`}
            </Button>
            <div className="anno">
              Drop link, card and caption travel together — you never assemble a post by hand.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
