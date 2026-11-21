"use client";

import { useMemo, useRef, useState, useTransition, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import { BannerSlide, BrandSlide } from "@/components/storefront/BannerSlide";
import { ShopMenuBar, menuIcon } from "@/components/storefront/ShopMenu";
import { saveStorefront } from "@/lib/actions/storefront";
import { accentTones, buttonScopeFor } from "@/lib/brand-accent";
import { prepareBannerImage } from "@/lib/image-prep";
import { fileToDataUrl } from "@/lib/render-card";
import {
  MAX_BANNERS,
  MAX_MENU_LABEL,
  bannerTarget,
  categoryOf,
  defaultMenuLabel,
  orderedKeys,
  resolveMenu,
  safeUrl,
} from "@/lib/storefront";
import { useFileDrop } from "@/lib/use-file-drop";
import {
  CATEGORY_LABEL,
  type Banner,
  type BannerLink,
  type Product,
  type ProductCategory,
  type ShopMenuKey,
  type Storefront,
} from "@/lib/types";

type LiteProduct = Pick<Product, "code" | "title" | "category" | "stock" | "soldOut" | "price" | "currency">;
type Photo = Pick<Product, "code" | "image" | "imageMeta" | "imageFit">;

const LINK_KINDS: { value: BannerLink["kind"]; label: string }[] = [
  { value: "none", label: "No button" },
  { value: "category", label: "A category" },
  { value: "product", label: "One product" },
  { value: "drop", label: "Today's drop" },
  { value: "low", label: "Almost gone" },
  { value: "whatsapp", label: "Ask on WhatsApp" },
  { value: "url", label: "Another web page" },
];

const TONES: { value: Banner["tone"]; label: string }[] = [
  { value: "light", label: "White text" },
  { value: "dark", label: "Dark text" },
];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Read + prepare one dropped or picked banner photo. */
function useBannerUpload(onReady: (img: { dataUrl: string; tone: Banner["tone"] }) => void) {
  const [busy, setBusy] = useState(false);
  const drop = useFileDrop(async (f) => {
    setBusy(true);
    try {
      onReady(await prepareBannerImage(await fileToDataUrl(f)));
    } catch {
      drop.setError("Couldn't read that image — try a PNG or JPG.");
    } finally {
      setBusy(false);
    }
  }, { maxBytes: 12 * 1024 * 1024 });
  return { ...drop, busy };
}

export default function StorefrontClient({
  initial,
  slug,
  shopName,
  primary,
  accent,
  cityLine,
  dropLive,
  products,
  photos,
}: {
  initial: Storefront;
  slug: string;
  shopName: string;
  primary: string;
  accent: string;
  cityLine?: string;
  dropLive: boolean;
  products: LiteProduct[];
  photos: Photo[];
}) {
  const [saved, setSaved] = useState<Storefront>(initial);
  const [draft, setDraft] = useState<Storefront>(initial);
  const [flash, setFlash] = useState<"idle" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const firstName = shopName.split(/\s+/)[0];
  const shopPath = `/shop/${slug}`;

  function save() {
    startTransition(async () => {
      try {
        const clean = await saveStorefront(draft);
        setSaved(clean);
        setDraft(clean);
        setFlash("saved");
        setTimeout(() => setFlash("idle"), 1600);
      } catch {
        setFlash("error");
      }
    });
  }

  /* ---------- Banners ---------- */
  const setBanner = (id: string, patch: Partial<Banner>) =>
    setDraft((d) => ({ ...d, banners: d.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const moveBanner = (i: number, by: -1 | 1) =>
    setDraft((d) => {
      const list = [...d.banners];
      const j = i + by;
      if (j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, banners: list };
    });
  const removeBanner = (id: string) => setDraft((d) => ({ ...d, banners: d.banners.filter((b) => b.id !== id) }));
  const addBanner = (img: { dataUrl: string; tone: Banner["tone"] }) =>
    setDraft((d) =>
      d.banners.length >= MAX_BANNERS
        ? d
        : {
            ...d,
            banners: [
              ...d.banners,
              { id: newId(), image: img.dataUrl, tone: img.tone, focusX: 50, focusY: 50, link: { kind: "none" } },
            ],
          }
    );

  /* ---------- Menu ---------- */
  const categories = useMemo(() => {
    const used = new Set<ProductCategory>(products.map((p) => categoryOf(p as Product)));
    return used;
  }, [products]);
  // Rows the seller can arrange: everything except categories nobody uses.
  const menuRows = orderedKeys(draft.menu).filter((k) =>
    k.startsWith("cat:") ? categories.size > 1 && categories.has(k.slice(4) as ProductCategory) : true
  );
  const moveRow = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= menuRows.length) return;
    const next = [...menuRows];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft((d) => ({ ...d, menu: { ...d.menu, order: next } }));
  };
  const toggleRow = (key: ShopMenuKey, show: boolean) =>
    setDraft((d) => ({
      ...d,
      menu: {
        ...d.menu,
        hidden: show ? d.menu.hidden.filter((k) => k !== key) : [...d.menu.hidden, key],
      },
    }));
  const labelRow = (key: ShopMenuKey, label: string) =>
    setDraft((d) => ({ ...d, menu: { ...d.menu, labels: { ...d.menu.labels, [key]: label } } }));

  /* ---------- Buttons ---------- */
  const buttonOptions: { value: Storefront["buttons"]; label: string; hex: string | null }[] = [
    { value: "haali", label: "Haali orange", hex: null },
    { value: "accent", label: "Brand accent", hex: accent },
    { value: "primary", label: "Brand main colour", hex: primary },
  ];
  const chosenHex = buttonOptions.find((o) => o.value === draft.buttons)?.hex ?? null;

  /* ---------- Preview ---------- */
  const productCodes = products.map((p) => p.code);
  const linkCtx = { slug, dropHref: dropLive ? "#" : undefined, productCodes };
  const previewMenu = resolveMenu(draft.menu, { products: products as Product[], hasDrop: dropLive });
  const askHref = "#";

  const add = useBannerUpload(addBanner);
  const addInput = useRef<HTMLInputElement>(null);

  return (
    <main className="page ad-page">
      <PageHeader
        label="Storefront"
        title="Shop"
        soft="page"
        subtitle="Banner slides across the top of your shop, and the menu that hangs underneath them."
        actions={
          <>
            {flash === "saved" && <span className="ad-flash" role="status">Saved ✓</span>}
            {flash === "error" && (
              <span className="ad-upload-error" role="alert">Couldn&rsquo;t save — try again.</span>
            )}
            <Link href={shopPath} className="btn sec" target="_blank">
              View shop
            </Link>
            {dirty && <Button variant="sec" onClick={() => setDraft(saved)}>Revert</Button>}
            <Button onClick={save} disabled={!dirty || isPending} style={{ minWidth: 148 }}>
              {isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
          </>
        }
      />

      <div className="ad-split wide-aside">
        <div className="ad-stack">
          <section className="panel">
            <div className="sf-head">
              <h2 className="section-title">Banner slides</h2>
              <span className="ad-hint">
                {draft.banners.length} of {MAX_BANNERS}
              </span>
            </div>
            <p className="ad-hint sf-intro">
              Wide photos work best (1600 × 800 or bigger). Phones show a squarer crop — tap the photo to
              mark what must stay in view. Until you add a slide, buyers see your shop name on your brand
              colour.
            </p>

            <div className="sf-slides">
              {draft.banners.map((b, i) => (
                <BannerEditor
                  key={b.id}
                  banner={b}
                  index={i}
                  count={draft.banners.length}
                  products={products}
                  dropLive={dropLive}
                  onChange={(patch) => setBanner(b.id, patch)}
                  onMove={(by) => moveBanner(i, by)}
                  onRemove={() => removeBanner(b.id)}
                />
              ))}
            </div>

            {draft.banners.length < MAX_BANNERS && (
              <>
                <button
                  type="button"
                  className={`sf-add${add.dragging ? " dragging" : ""}`}
                  onClick={() => addInput.current?.click()}
                  disabled={add.busy}
                  {...add.dropProps}
                >
                  <ImagePlus size={22} aria-hidden />
                  <b>{add.busy ? "Preparing photo…" : draft.banners.length ? "Add another slide" : "Add your first slide"}</b>
                  <span>Click or drop a wide photo</span>
                </button>
                {add.error && <span className="ad-upload-error" role="alert">{add.error}</span>}
                <input
                  ref={addInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    add.take(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </>
            )}

            {draft.banners.length > 1 && (
              <label className="sf-check">
                <input
                  type="checkbox"
                  checked={draft.autoplay}
                  onChange={(e) => setDraft({ ...draft, autoplay: e.target.checked })}
                />
                Move to the next slide on its own every few seconds
              </label>
            )}
          </section>

          <section className="panel">
            <h2 className="section-title">Menu</h2>
            <p className="ad-hint sf-intro">
              Hangs under the banners. Buyers tap an entry to narrow the shop to it. Categories show up once
              your products use more than one.
            </p>
            <ul className="sf-menu">
              {menuRows.map((key, i) => {
                const Icon = menuIcon(key);
                const shown = !draft.menu.hidden.includes(key);
                const note =
                  key === "drop"
                    ? dropLive
                      ? "Links to your live drop"
                      : "Shows while a drop is live"
                    : key === "low"
                    ? "Items with 2 or fewer left"
                    : key === "ask"
                    ? "Opens the question sheet"
                    : key === "all"
                    ? "Always shown"
                    : undefined;
                return (
                  <li key={key} className={`sf-menu-row${shown ? "" : " off"}`}>
                    <span className="sf-menu-ic" aria-hidden>
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <label className="sf-menu-name">
                      <span className="sr-only">Label for {defaultMenuLabel(key)}</span>
                      <input
                        className="inp"
                        value={draft.menu.labels[key] ?? ""}
                        placeholder={defaultMenuLabel(key)}
                        maxLength={MAX_MENU_LABEL}
                        onChange={(e) => labelRow(key, e.target.value)}
                      />
                      {note && <span className="ad-hint">{note}</span>}
                    </label>
                    <label className="sf-switch">
                      <input
                        type="checkbox"
                        checked={shown}
                        disabled={key === "all"}
                        onChange={(e) => toggleRow(key, e.target.checked)}
                      />
                      <span>{shown ? "Shown" : "Hidden"}</span>
                    </label>
                    <span className="sf-order">
                      <button
                        type="button"
                        className="btn gh sf-icon-btn"
                        onClick={() => moveRow(i, -1)}
                        disabled={i === 0}
                        aria-label={`Move ${defaultMenuLabel(key)} earlier`}
                      >
                        <ArrowUp size={15} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn gh sf-icon-btn"
                        onClick={() => moveRow(i, 1)}
                        disabled={i === menuRows.length - 1}
                        aria-label={`Move ${defaultMenuLabel(key)} later`}
                      >
                        <ArrowDown size={15} aria-hidden />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel">
            <h2 className="section-title">Button colour</h2>
            <p className="ad-hint sf-intro">
              Order buttons, the selected menu entry and other highlights on your shop, product and drop
              pages. Brand colours come from your{" "}
              <Link href="/brand-kit">brand kit</Link>.
            </p>
            <div className="sf-colours" role="radiogroup" aria-label="Button colour">
              {buttonOptions.map((o) => {
                const tones = o.hex ? accentTones(o.hex) : null;
                const on = draft.buttons === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`sf-colour${on ? " on" : ""}`}
                    onClick={() => setDraft({ ...draft, buttons: o.value })}
                  >
                    <span {...buttonScopeFor(o.hex, "sf-colour-sample")}>
                      <span className="sf-colour-btn">
                        Order <ArrowRight size={14} aria-hidden />
                      </span>
                    </span>
                    <span className="sf-colour-l">
                      {o.hex && <span className="sf-colour-sw" style={{ background: o.hex }} aria-hidden />}
                      {o.label}
                    </span>
                    {tones?.adjusted && (
                      <span className="ad-hint">Shown a little darker so white text stays readable.</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="ad-aside panel" aria-label="Shop page preview">
          <h2 className="section-title">Live preview</h2>
          <div
            className="sf-preview-well"
            // The preview's links are for show — keep clicks on this page.
            onClickCapture={(e) => {
              if ((e.target as Element).closest("a")) e.preventDefault();
            }}
          >
            <div {...buttonScopeFor(chosenHex, "sf-preview")}>
              <BannerCarousel autoplay={draft.autoplay} label="Preview">
                {draft.banners.length > 0
                  ? draft.banners.map((b, i) => (
                      <BannerSlide
                        key={b.id}
                        banner={b}
                        target={bannerTarget(b.link, linkCtx)}
                        askHref={askHref}
                        shopName={shopName}
                        first={i === 0}
                      />
                    ))
                  : [
                      <BrandSlide
                        key="brand"
                        shopName={shopName}
                        primary={primary}
                        eyebrow={cityLine ?? "Order on WhatsApp"}
                        lede={`Tap anything you like and your order opens in WhatsApp, already written out with the order details, ready to send to ${firstName}.`}
                        dropHref={dropLive ? "#" : undefined}
                        photos={photos}
                      />,
                    ]}
              </BannerCarousel>
              <ShopMenuBar entries={previewMenu} active="all" askHref={askHref} preview />
            </div>
          </div>
          <p className="ad-hint" style={{ margin: "14px 0 0", textAlign: "center" }}>
            Phone size. Wider screens show the same slides, cropped wider.
          </p>
        </aside>
      </div>

      {(dirty || isPending) && (
        <div className="ad-savebar" role="region" aria-label="Unsaved changes">
          <span className="ad-savebar-note">Unsaved changes</span>
          <Button variant="sec" onClick={() => setDraft(saved)} disabled={isPending}>Revert</Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------
 * One slide's editor
 * ------------------------------------------------------------------------- */

function BannerEditor({
  banner,
  index,
  count,
  products,
  dropLive,
  onChange,
  onMove,
  onRemove,
}: {
  banner: Banner;
  index: number;
  count: number;
  products: LiteProduct[];
  dropLive: boolean;
  onChange: (patch: Partial<Banner>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useBannerUpload(({ dataUrl, tone }) => onChange({ image: dataUrl, tone, focusX: 50, focusY: 50 }));
  const link = banner.link;

  function setFocusFromPointer(e: MouseEvent<HTMLButtonElement>) {
    if (e.detail === 0) return; // keyboard "click"
    const img = e.currentTarget.querySelector("img");
    if (!img) return;
    const r = img.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100);
    const y = Math.round(((e.clientY - r.top) / r.height) * 100);
    onChange({ focusX: Math.min(100, Math.max(0, x)), focusY: Math.min(100, Math.max(0, y)) });
  }
  function nudgeFocus(e: KeyboardEvent<HTMLButtonElement>) {
    const step = e.shiftKey ? 10 : 4;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    onChange({
      focusX: Math.min(100, Math.max(0, banner.focusX + m[0])),
      focusY: Math.min(100, Math.max(0, banner.focusY + m[1])),
    });
  }

  function setLinkKind(kind: BannerLink["kind"]) {
    const next: BannerLink =
      kind === "category"
        ? { kind, category: (products[0] ? categoryOf(products[0] as Product) : "general") as ProductCategory }
        : kind === "product"
        ? { kind, code: products.find((p) => !p.soldOut)?.code ?? products[0]?.code ?? "" }
        : kind === "url"
        ? { kind, url: "" }
        : { kind };
    onChange({ link: next, cta: kind === "none" ? banner.cta : banner.cta || defaultCta(kind) });
  }

  const warn =
    link.kind === "drop" && !dropLive
      ? "The button shows while a drop is live."
      : link.kind === "url" && link.url.trim() && !safeUrl(link.url)
      ? "That doesn't look like a web address."
      : link.kind !== "none" && !banner.cta?.trim()
      ? "No button text — the whole slide becomes the link."
      : null;

  return (
    <article className="sf-slide">
      <header className="sf-slide-head">
        <span className="sf-slide-n">Slide {index + 1}</span>
        <span className="sf-order">
          <button type="button" className="btn gh sf-icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move slide earlier">
            <ArrowUp size={15} aria-hidden />
          </button>
          <button type="button" className="btn gh sf-icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move slide later">
            <ArrowDown size={15} aria-hidden />
          </button>
          <button type="button" className="btn gh danger sf-icon-btn" onClick={onRemove} aria-label={`Remove slide ${index + 1}`}>
            <Trash2 size={15} aria-hidden />
          </button>
        </span>
      </header>

      <div className="sf-slide-grid">
        <div className="sf-media">
          <button
            type="button"
            className={`sf-focus${upload.dragging ? " dragging" : ""}`}
            onClick={setFocusFromPointer}
            onKeyDown={nudgeFocus}
            aria-label={`Focal point ${banner.focusX}% across, ${banner.focusY}% down. Click the photo or use the arrow keys to move it. Drop an image to replace.`}
            {...upload.dropProps}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.image} alt="" draggable={false} />
            <span className="sf-focus-dot" style={{ left: `${banner.focusX}%`, top: `${banner.focusY}%` }} aria-hidden />
            {(upload.dragging || upload.busy) && (
              <span className="ad-slot-drop">{upload.busy ? "Preparing…" : "Drop to replace"}</span>
            )}
          </button>
          <div className="sf-media-row">
            <span className="ad-hint">Tap the photo to set its focus.</span>
            <button type="button" className="btn gh" onClick={() => input.current?.click()}>
              Replace photo
            </button>
          </div>
          {upload.error && <span className="ad-upload-error" role="alert">{upload.error}</span>}
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              upload.take(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="ad-form sf-fields">
          <div className="ad-grid-2">
            <label className="ad-field">
              <span className="k">Small label</span>
              <input
                className="inp"
                value={banner.eyebrow ?? ""}
                maxLength={40}
                placeholder="New in"
                onChange={(e) => onChange({ eyebrow: e.target.value })}
              />
            </label>
            <label className="ad-field">
              <span className="k">Headline</span>
              <input
                className="inp"
                value={banner.headline ?? ""}
                maxLength={90}
                placeholder="Fresh styles just landed"
                onChange={(e) => onChange({ headline: e.target.value })}
              />
            </label>
          </div>
          <label className="ad-field">
            <span className="k">Line under the headline</span>
            <input
              className="inp"
              value={banner.subline ?? ""}
              maxLength={160}
              placeholder="Delivered today, pay when it arrives."
              onChange={(e) => onChange({ subline: e.target.value })}
            />
          </label>

          <div className="ad-grid-2">
            <label className="ad-field">
              <span className="k">Button goes to</span>
              <select className="inp" value={link.kind} onChange={(e) => setLinkKind(e.target.value as BannerLink["kind"])}>
                {LINK_KINDS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {link.kind === "category" && (
              <label className="ad-field">
                <span className="k">Category</span>
                <select
                  className="inp"
                  value={link.category}
                  onChange={(e) => onChange({ link: { kind: "category", category: e.target.value as ProductCategory } })}
                >
                  {(Object.keys(CATEGORY_LABEL) as ProductCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {link.kind === "product" && (
              <label className="ad-field">
                <span className="k">Product</span>
                <select
                  className="inp"
                  value={link.code}
                  onChange={(e) => onChange({ link: { kind: "product", code: e.target.value } })}
                >
                  {products.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.title}
                      {p.soldOut ? " (sold out)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {link.kind === "url" && (
              <label className="ad-field">
                <span className="k">Web address</span>
                <input
                  className="inp"
                  value={link.url}
                  inputMode="url"
                  placeholder="instagram.com/yourshop"
                  onChange={(e) => onChange({ link: { kind: "url", url: e.target.value } })}
                />
              </label>
            )}
          </div>

          {link.kind !== "none" && (
            <label className="ad-field">
              <span className="k">Button text</span>
              <input
                className="inp"
                value={banner.cta ?? ""}
                maxLength={28}
                placeholder={defaultCta(link.kind)}
                onChange={(e) => onChange({ cta: e.target.value })}
              />
            </label>
          )}
          {warn && <span className="ad-hint sf-warn">{warn}</span>}

          <div className="ad-field">
            <span className="k">Text colour</span>
            <SegmentedControl value={banner.tone} options={TONES} onChange={(tone) => onChange({ tone })} />
          </div>
        </div>
      </div>
    </article>
  );
}

function defaultCta(kind: BannerLink["kind"]): string {
  switch (kind) {
    case "drop":
      return "See today's drop";
    case "whatsapp":
      return "Ask us";
    case "product":
      return "Order now";
    case "url":
      return "Learn more";
    default:
      return "Shop now";
  }
}
