"use client";

import { useShop } from "@/components/ShopContext";
import ProductPhoto from "@/components/ProductPhoto";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
import ImageSlot from "@/components/ImageSlot";
import PageHeader from "@/components/PageHeader";
import OptionsEditor from "@/components/OptionsEditor";
import { removeProduct, upsertProduct } from "@/lib/actions/products";
import { CATEGORY_LABEL, type ImageFit, type Product, type ProductCategory } from "@/lib/types";
import { defaultOptionsFor, getOptions, learnValues, optionsDetail, withOptions } from "@/lib/variants";

const CATEGORIES: ProductCategory[] = [
  "general",
  "clothing",
  "electronics",
  "shoes",
  "beauty",
  "food",
  "home",
];

const FIT_OPTIONS: { value: ImageFit; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "contain", label: "Show whole product" },
  { value: "cover", label: "Fill frame" },
];

const EMPTY: Product = {
  code: "",
  title: "",
  price: 0,
  currency: "UGX",
  category: "general",
  options: [],
  stock: 0,
  description: "",
};

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const { slug, dash } = useShop();
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
      // Legacy single-variant products open as one option row.
      options: getOptions(p),
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
    const next: Product = withOptions(
      {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        title: draft.title.trim(),
        soldOut: (draft.stock ?? 0) === 0,
      },
      draft.options ?? []
    );
    startTransition(async () => {
      await upsertProduct(slug, next);
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.code === next.code);
        return idx === -1 ? [...prev, next] : prev.map((p, i) => (i === idx ? next : p));
      });
      reset();
    });
  }

  function del(code: string) {
    startTransition(async () => {
      await removeProduct(slug, code);
      setProducts((prev) => prev.filter((p) => p.code !== code));
    });
  }

  function chooseCategory(next: ProductCategory) {
    // Swap in the new category's option types only while nothing has been
    // filled in yet — never throw away values the seller entered.
    const untouched = (draft.options ?? []).every((o) => o.values.length === 0);
    setDraft({
      ...draft,
      category: next,
      options: untouched ? defaultOptionsFor(next) : draft.options,
    });
  }

  const currentCategory = draft.category ?? "general";
  // Values already used across the catalogue, offered first as suggestions.
  const learned = learnValues(products);

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

                <OptionsEditor
                  category={currentCategory}
                  options={draft.options ?? []}
                  onChange={(options) => setDraft({ ...draft, options })}
                  learned={learned}
                />

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
                  prepare
                  onChange={(v, meta) => setDraft({ ...draft, image: v, imageMeta: v ? meta : undefined })}
                  label="Product photo"
                  width={88}
                  height={88}
                />

                {draft.image && (
                  <div className="ad-fit">
                    <div className="ad-field">
                      <span className="k">Photo fit</span>
                      <div className="ad-chips" role="radiogroup" aria-label="Photo fit">
                        {FIT_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            role="radio"
                            aria-checked={(draft.imageFit ?? "auto") === o.value}
                            className={`ad-chip${(draft.imageFit ?? "auto") === o.value ? " on" : ""}`}
                            onClick={() => setDraft({ ...draft, imageFit: o.value })}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      <span className="ad-hint">
                        {draft.imageMeta?.kind === "cutout"
                          ? "Plain background detected — Auto shows the whole product on its background colour."
                          : draft.imageMeta?.kind === "photo"
                            ? "Scene photo detected — Auto fills the frame unless its shape is very different."
                            : "Auto works out the best fit for each frame."}
                      </span>
                    </div>
                    <div className="ad-fit-previews" aria-label="Fit preview">
                      <figure>
                        <div className="ad-fit-frame shop">
                          <ProductPhoto src={draft.image} meta={draft.imageMeta} fit={draft.imageFit} />
                        </div>
                        <figcaption>Shop card</figcaption>
                      </figure>
                      <figure>
                        <div className="ad-fit-frame status">
                          <ProductPhoto src={draft.image} meta={draft.imageMeta} fit={draft.imageFit} />
                        </div>
                        <figcaption>Status card</figcaption>
                      </figure>
                    </div>
                  </div>
                )}

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
          const detail = optionsDetail(p);
          const isEditing = editingCode === p.code;
          return (
            <div key={p.code} className={`prow${isEditing ? " editing" : ""}`}>
              <div className="thumb">
                <ProductPhoto src={p.image} meta={p.imageMeta} fit={p.imageFit} label={p.code} padding={0.06} />
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
                  {detail ? ` · ${detail}` : ""}
                </span>
              </div>
              <div className="actions">
                <Link href={dash(`/products/${p.code}/card`)} className="ad-cta" aria-label={`Make a status card for ${p.title}`}>
                  Make a status card <span className="arrow" aria-hidden>→</span>
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
