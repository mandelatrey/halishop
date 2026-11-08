"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
import ImageSlot from "@/components/ImageSlot";
import { removeProduct, upsertProduct } from "@/lib/actions/products";
import {
  CATEGORY_LABEL,
  DEFAULT_VARIANT_LABEL,
  VARIANT_PLACEHOLDER,
  type Product,
  type ProductCategory,
} from "@/lib/types";

const CATEGORIES: ProductCategory[] = [
  "general",
  "clothing",
  "electronics",
  "shoes",
  "beauty",
  "food",
  "home",
];

const EMPTY: Product = {
  code: "",
  title: "",
  price: 0,
  currency: "UGX",
  category: "general",
  variantLabel: DEFAULT_VARIANT_LABEL["general"],
  variants: [],
  stock: 0,
  description: "",
};

function variantLabelFor(p: Product): string {
  if (p.variantLabel && p.variantLabel.trim()) return p.variantLabel;
  return DEFAULT_VARIANT_LABEL[p.category ?? "general"];
}

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<Product>(EMPTY);
  const [addOpen, setAddOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(p: Product) {
    setEditingCode(p.code);
    setDraft({
      ...p,
      category: p.category ?? "general",
      variantLabel: p.variantLabel ?? DEFAULT_VARIANT_LABEL[p.category ?? "general"],
      variants: p.variants ?? [],
    });
    setAddOpen(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function reset() {
    setEditingCode(null);
    setDraft(EMPTY);
    setAddOpen(false);
  }

  function submit() {
    if (!draft.code.trim() || !draft.title.trim()) return;
    const next: Product = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      variants: (draft.variants ?? []).filter(Boolean),
      soldOut: (draft.stock ?? 0) === 0,
    };
    startTransition(async () => {
      await upsertProduct(next);
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.code === next.code);
        return idx === -1 ? [...prev, next] : prev.map((p, i) => (i === idx ? next : p));
      });
      reset();
    });
  }

  function del(code: string) {
    startTransition(async () => {
      await removeProduct(code);
      setProducts((prev) => prev.filter((p) => p.code !== code));
    });
  }

  function chooseCategory(next: ProductCategory) {
    const shouldSyncLabel =
      !draft.variantLabel ||
      Object.values(DEFAULT_VARIANT_LABEL).includes(draft.variantLabel);
    setDraft({
      ...draft,
      category: next,
      variantLabel: shouldSyncLabel ? DEFAULT_VARIANT_LABEL[next] : draft.variantLabel,
    });
  }

  const currentCategory = draft.category ?? "general";
  const currentVariantLabel = variantLabelFor(draft);

  return (
    <main className="page">
      <h1>Products</h1>
      <p className="subtitle">
        Every product needs a title, price, and a short code.
      </p>

      <div ref={formRef} style={{ scrollMarginTop: 80, position: "relative", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          aria-expanded={addOpen}
          className="section-title"
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span>{editingCode ? `Editing ${editingCode}` : "Add product"}</span>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              transition: "transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
              transform: addOpen ? "rotate(90deg)" : "rotate(0deg)",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ›
          </span>
        </button>
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            display: "grid",
            gridTemplateRows: addOpen ? "1fr" : "0fr",
            transition:
              "grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms cubic-bezier(0.4, 0, 0.2, 1), transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: addOpen ? 1 : 0,
            transform: addOpen ? "translateY(0)" : "translateY(-4px)",
            pointerEvents: addOpen ? "auto" : "none",
          }}
          aria-hidden={!addOpen}
        >
          <div style={{ overflow: "hidden", minHeight: 0 }}>
      <div
        className="col"
        style={{
          gap: 12,
          padding: 16,
          border: "1px solid var(--stroke-soft)",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 12px 32px rgba(32, 30, 29, 0.08), 0 2px 6px rgba(32, 30, 29, 0.04)",
        }}
      >
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <label className="col" style={{ gap: 4, flex: "0 0 100px" }}>
            <span className="k">Code</span>
            <input
              className="inp"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              placeholder="B3"
              disabled={!!editingCode}
            />
          </label>
          <label className="col" style={{ gap: 4, flex: 1 }}>
            <span className="k">Title</span>
            <input
              className="inp"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Wireless earbuds"
            />
          </label>
        </div>

        <div className="col" style={{ gap: 4 }}>
          <span className="k">Category</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`btn sm ${currentCategory === c ? "" : "sec"}`}
                style={{ padding: "6px 10px", fontSize: 10 }}
                onClick={() => chooseCategory(c)}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <label className="col" style={{ gap: 4, flex: 1 }}>
            <span className="k">Price</span>
            <input
              className="inp"
              type="number"
              value={draft.price || ""}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
              placeholder="35000"
            />
          </label>
          <label className="col" style={{ gap: 4, flex: "0 0 80px" }}>
            <span className="k">Currency</span>
            <input
              className="inp"
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
            />
          </label>
          <label className="col" style={{ gap: 4, flex: "0 0 80px" }}>
            <span className="k">Stock</span>
            <input
              className="inp"
              type="number"
              value={draft.stock ?? 0}
              onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) || 0 })}
            />
          </label>
        </div>

        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <label className="col" style={{ gap: 4, flex: "0 0 150px" }}>
            <span className="k">Variant label</span>
            <input
              className="inp"
              value={currentVariantLabel}
              onChange={(e) => setDraft({ ...draft, variantLabel: e.target.value })}
              placeholder={DEFAULT_VARIANT_LABEL[currentCategory]}
            />
          </label>
          <label className="col" style={{ gap: 4, flex: 1 }}>
            <span className="k">{currentVariantLabel} (comma-separated)</span>
            <input
              className="inp"
              value={(draft.variants ?? []).join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  variants: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder={VARIANT_PLACEHOLDER[currentCategory]}
            />
          </label>
        </div>

        <label className="col" style={{ gap: 4 }}>
          <span className="k">Description</span>
          <textarea
            className="inp"
            rows={2}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Optional. Shown in captions, later."
          />
        </label>

        <ImageSlot
          value={draft.image}
          onChange={(v) => setDraft({ ...draft, image: v })}
          label="Product photo"
          width={80}
          height={80}
        />

        <div className="row" style={{ gap: 8 }}>
          <Button onClick={submit} disabled={isPending}>{editingCode ? (isPending ? "Saving…" : "Save changes") : (isPending ? "Saving…" : "Add product")}</Button>
          {editingCode && (
            <Button variant="sec" onClick={reset}>Cancel</Button>
          )}
        </div>
      </div>
          </div>
        </div>
      </div>

      <div className="section-title">Catalogue ({products.length})</div>
      <div
        className="col"
        style={{ border: "1px solid var(--stroke-soft)", background: "#fff", borderRadius: 8 }}
      >
        {products.map((p) => {
          const label = variantLabelFor(p);
          const vs = (p.variants ?? []).filter(Boolean);
          const isEditing = editingCode === p.code;
          return (
            <div key={p.code} className={`prow${isEditing ? " editing" : ""}`}>
              <div className="thumb">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" />
                ) : (
                  <div className="ph" style={{ width: "100%", height: "100%" }}>{p.code}</div>
                )}
              </div>
              <div className="col">
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="t2">{p.title}</span>
                  {p.category && p.category !== "general" && (
                    <span className="tag">{CATEGORY_LABEL[p.category]}</span>
                  )}
                  {p.soldOut && <span className="tag err">SOLD OUT</span>}
                </div>
                <span className="s">
                  {p.currency} {p.price.toLocaleString()} · {p.stock ?? 0} in stock
                  {vs.length > 0 ? ` · ${label}: ${vs.join(" / ")}` : ""}
                </span>
              </div>
              <div className="actions">
                <Link href={`/products/${p.code}/card`} className="btn pill" aria-label={`Make card for ${p.title}`}>
                  Make card <span className="arrow" aria-hidden>→</span>
                </Link>
                <button
                  className={`btn gh${isEditing ? " on" : ""}`}
                  onClick={() => startEdit(p)}
                  aria-pressed={isEditing}
                >
                  {isEditing ? "Editing" : "Edit"}
                </button>
                <button
                  className="btn gh danger"
                  onClick={() => {
                    if (confirm(`Delete ${p.code}?`)) del(p.code);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
