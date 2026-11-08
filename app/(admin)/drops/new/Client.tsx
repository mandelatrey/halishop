"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Button from "@/components/Button";
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
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>New drop</h1>
        <Link href="/products" className="k">← Products</Link>
      </div>
      <p className="subtitle">
        Pick the items you&rsquo;re posting today. The app generates a card and caption for each,
        all sharing one tracked drop link.
      </p>

      <div className="drops-new-layout">
        {/* LEFT: product multi-select + name */}
        <div className="col drops-new-main" style={{ gap: 16 }}>
          <label className="col" style={{ gap: 6 }}>
            <span className="k">Drop name</span>
            <input
              className="inp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Today's drop"
            />
          </label>

          <div className="col" style={{ gap: 6 }}>
            <span className="k">Pick what you&rsquo;re posting · {selected.size} selected</span>
            <div
              className="col"
              style={{
                border: "1px solid var(--stroke-soft)",
                borderRadius: 8,
                background: "#fff",
                overflow: "hidden",
              }}
            >
              {eligible.map((p, idx) => {
                const on = selected.has(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => toggle(p.code)}
                    aria-pressed={on}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: on ? "var(--color-accent-soft)" : "#fff",
                      border: 0,
                      borderBottom: idx === eligible.length - 1 ? 0 : "1px solid var(--stroke-hair)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        flex: "none",
                        borderRadius: 3,
                        border: on ? "1px solid var(--color-accent)" : "1px solid var(--stroke-strong)",
                        background: on ? "var(--color-accent)" : "#fff",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        font: "700 10px/1 ui-monospace, Menlo, monospace",
                      }}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <div className="thumb" style={{
                      width: 38,
                      height: 38,
                      flex: "none",
                      overflow: "hidden",
                      border: "1px solid var(--stroke-hair)",
                      borderRadius: 4,
                    }}>
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div className="ph" style={{ width: "100%", height: "100%" }}>{p.code}</div>
                      )}
                    </div>
                    <div className="col" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <span className="t2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                      <span className="s">{formatPrice(p.price, p.currency)} · {p.stock ?? 0} in stock</span>
                    </div>
                    <span className="tag" style={{ flex: "none" }}>{p.code}</span>
                  </button>
                );
              })}
              {soldOut.map((p, idx) => (
                <div
                  key={p.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "#fff",
                    borderTop: eligible.length > 0 && idx === 0 ? "1px solid var(--stroke-hair)" : undefined,
                    borderBottom: idx === soldOut.length - 1 ? 0 : "1px solid var(--stroke-hair)",
                    opacity: 0.5,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      flex: "none",
                      borderRadius: 3,
                      border: "1px solid var(--stroke-soft)",
                    }}
                  />
                  <div style={{ width: 38, height: 38, flex: "none", background: "var(--color-surface)", borderRadius: 4 }} />
                  <div className="col" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <span className="t2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                    <span className="s">Sold out</span>
                  </div>
                  <span className="tag" style={{ flex: "none" }}>{p.code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col" style={{ gap: 6 }}>
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

          <div className="row" style={{ gap: 8 }}>
            <div className="col" style={{ gap: 4, flex: 1 }}>
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
            <div className="col" style={{ gap: 4, flex: 1 }}>
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

        {/* RIGHT: drop meta + generate button */}
        <div className="col drops-meta">
          <div className="drops-meta-row">
            <span className="k">Drop link</span>
            <span className="mono drops-meta-link">{dropSlugPreview}</span>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="k">Expires</span>
            <SegmentedControl
              value={expiryKind}
              options={EXPIRY_OPTIONS}
              onChange={(v) => setExpiryKind(v)}
            />
          </div>
          <Button
            onClick={generate}
            disabled={selected.size === 0 || isPending}
            style={{ marginTop: 4 }}
          >
            {isPending
              ? "Generating…"
              : selected.size === 0
              ? "Pick at least one item"
              : `Generate ${selected.size} card${selected.size === 1 ? "" : "s"} + caption${selected.size === 1 ? "" : "s"}`}
          </Button>
          <div className="anno">
            drop link + card + caption travel together — you never assemble a post by hand
          </div>
        </div>
      </div>

      <style jsx>{`
        .drops-new-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          align-items: start;
          margin-top: 16px;
        }
        .drops-new-main {
          min-width: 0; /* let overflow-x on .tpick actually scroll instead of pushing width */
        }
        .drops-meta {
          gap: 10px;
          padding: 16px;
          background: var(--color-surface);
          border: 1px solid var(--stroke-soft);
          border-radius: 12px;
          position: sticky;
          top: 24px;
          align-self: start;
        }
        .drops-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
        }
        .drops-meta-link {
          font-size: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        @media (max-width: 780px) {
          .drops-new-layout {
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }
          .drops-meta {
            position: static;
            padding: 14px;
            gap: 12px;
          }
          .drops-meta-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .drops-meta-link {
            white-space: normal;
            word-break: break-all;
            font-size: 10.5px;
          }
        }
      `}</style>
    </main>
  );
}
