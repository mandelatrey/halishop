"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
import ImageSlot from "@/components/ImageSlot";
import PageHeader from "@/components/PageHeader";
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
    <main className="page ad-page">
      <PageHeader
        label="Catalogue"
        title="Your"
        soft="products"
        subtitle="Every product needs a title, price, and a short code."
        actions={
          <Button
            onClick={() => setAddOpen((v) => !v)}
            aria-expanded={addOpen}
            variant={addOpen ? "sec" : "primary"}
          >
            {addOpen ? "Close form" : "+ Add product"}
          </Button>
        }
      />

      <div ref={formRef} style={{ scrollMarginTop: 96 }}>
        <div
          className="ad-collapse"
          style={{
            gridTemplateRows: addOpen ? "1fr" : "0fr",
            opacity: addOpen ? 1 : 0,
            marginBottom: addOpen ? 16 : 0,
            pointerEvents: addOpen ? "auto" : "none",
          }}
          aria-hidden={!addOpen}
        >
          <div>
            <section className="panel">
              <div className="ad-panel-head">
                <h2 className="section-title">{editingCode ? `Editing ${editingCode}` : "Add product"}</h2>
                {editingCode && <span className="tag acc">{editingCode}</span>}
              </div>
              <div className="ad-form">
                <div className="ad-row">
                  <label className="ad-field ad-f-code">
                    <span className="k">Code</span>
                    <input
                      className="inp"
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                      placeholder="B3"
                      disabled={!!editingCode}
                    />
                  </label>
                  <label className="ad-field ad-f-grow">
                    <span className="k">Title</span>
                    <input
                      className="inp"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="Wireless earbuds"
                    />
                  </label>
                </div>

                <div className="ad-field">
                  <span className="k">Category</span>
                  <div className="ad-chips">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`ad-chip${currentCategory === c ? " on" : ""}`}
                        aria-pressed={currentCategory === c}
                        onClick={() => chooseCategory(c)}
                      >
                        {CATEGORY_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ad-row">
                  <label className="ad-field ad-f-grow price">
                    <span className="k">Price</span>
                    <input
                      className="inp"
                      type="number"
                      value={draft.price || ""}
                      onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                      placeholder="35000"
                    />
                  </label>
                  <label className="ad-field ad-f-small">
                    <span className="k">Currency</span>
                    <input
                      className="inp"
                      value={draft.currency}
                      onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <label className="ad-field ad-f-small">
                    <span className="k">Stock</span>
                    <input
                      className="inp"
                      type="number"
                      value={draft.stock ?? 0}
                      onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) || 0 })}
                    />
                  </label>
                </div>

                <div className="ad-row">
                  <label className="ad-field ad-f-label">
                    <span className="k">Variant label</span>
                    <input
                      className="inp"
                      value={currentVariantLabel}
                      onChange={(e) => setDraft({ ...draft, variantLabel: e.target.value })}
                      placeholder={DEFAULT_VARIANT_LABEL[currentCategory]}
                    />
                  </label>
                  <label className="ad-field ad-f-grow">
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

                <label className="ad-field">
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
                  width={88}
                  height={88}
                />

                <hr className="ad-divider" />

                <div className="ad-actions">
                  <Button onClick={submit} disabled={isPending}>{editingCode ? (isPending ? "Saving…" : "Save changes") : (isPending ? "Saving…" : "Add product")}</Button>
                  {editingCode && (
                    <Button variant="sec" onClick={reset}>Cancel</Button>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <section className="panel ad-list">
        <div className="ad-list-head">
          <h2 className="section-title">Catalogue</h2>
          <span className="s">{products.length} product{products.length === 1 ? "" : "s"}</span>
        </div>
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
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className="t2">{p.title}</span>
                  <span className="tag">{p.code}</span>
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
                <Link href={`/products/${p.code}/card`} className="ad-cta" aria-label={`Make card for ${p.title}`}>
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
      </section>
    </main>
  );
}
