import {
  CATEGORY_LABEL,
  type Banner,
  type BannerLink,
  type Drop,
  type Product,
  type ProductCategory,
  type ShopMenuKey,
  type Storefront,
  type StorefrontMenu,
} from "./types";
import { isMenuIconName, menuIconFor, type MenuIconName } from "./menu-icons";

/**
 * Storefront helpers shared by the buyer page, the editor and the save action.
 * No server-only or client-only imports — safe on both sides.
 */

export const MAX_BANNERS = 6;

/** Window event that opens the page's "Ask a question" sheet (components/AskWhatsApp.tsx). */
export const ASK_EVENT = "hali:ask";
export const MAX_MENU_LABEL = 24;

export const DEFAULT_STOREFRONT: Storefront = {
  banners: [],
  autoplay: true,
  buttons: "haali",
  menu: { order: [], hidden: [], labels: {}, icons: {} },
};

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ProductCategory[];

/** Default order of the hanging menu. */
const DEFAULT_ORDER: ShopMenuKey[] = [
  "all",
  "drop",
  ...CATEGORIES.map((c) => `cat:${c}` as const),
  "low",
  "ask",
];

const DEFAULT_LABEL: Record<ShopMenuKey, string> = {
  all: "All",
  drop: "Today's drop",
  low: "Almost gone",
  ask: "Ask us",
  ...(Object.fromEntries(CATEGORIES.map((c) => [`cat:${c}`, CATEGORY_LABEL[c]])) as Record<
    `cat:${ProductCategory}`,
    string
  >),
};

export function defaultMenuLabel(key: ShopMenuKey): string {
  return DEFAULT_LABEL[key];
}

export function isMenuKey(v: unknown): v is ShopMenuKey {
  return typeof v === "string" && v in DEFAULT_LABEL;
}

/** Product → its menu category ("general" when unset). */
export function categoryOf(p: Product): ProductCategory {
  return p.category && p.category in CATEGORY_LABEL ? p.category : "general";
}

/** "Almost gone": in stock with two or fewer pieces left. */
export function isLow(p: Product): boolean {
  return !p.soldOut && typeof p.stock === "number" && p.stock > 0 && p.stock <= 2;
}

/** What the grid is filtered to. */
export type ShopFilter = "all" | "low" | ProductCategory;

export type MenuEntry = {
  key: ShopMenuKey;
  label: string;
  icon: MenuIconName;
  /** Filter entries narrow the grid; `drop` links away; `ask` opens the WhatsApp sheet. */
  kind: "filter" | "drop" | "ask";
  filter?: ShopFilter;
  /** In-stock items this entry shows (filters only). */
  count?: number;
};

export type MenuContext = {
  products: Product[];
  hasDrop: boolean;
};

/** Seller order first, then anything new in the default order. */
export function orderedKeys(menu: StorefrontMenu): ShopMenuKey[] {
  const seen = new Set<ShopMenuKey>();
  const out: ShopMenuKey[] = [];
  for (const k of [...menu.order, ...DEFAULT_ORDER]) {
    if (isMenuKey(k) && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/**
 * Every entry the menu *could* show for this catalogue, in the seller's order,
 * with `hidden` still included (the editor needs them). Categories only appear
 * once a product uses them; "Almost gone" only while something is low; the drop
 * only while one is live.
 */
export function menuCandidates(menu: StorefrontMenu, ctx: MenuContext): (MenuEntry & { hidden: boolean })[] {
  const inStock = ctx.products.filter((p) => !p.soldOut);
  const perCat = new Map<ProductCategory, number>();
  const usedCats = new Set<ProductCategory>();
  for (const p of ctx.products) usedCats.add(categoryOf(p));
  for (const p of inStock) perCat.set(categoryOf(p), (perCat.get(categoryOf(p)) ?? 0) + 1);
  const low = inStock.filter(isLow).length;
  // One category only → a category entry would just repeat "All".
  const showCats = usedCats.size > 1;

  const out: (MenuEntry & { hidden: boolean })[] = [];
  for (const key of orderedKeys(menu)) {
    const label = menu.labels[key]?.trim() || DEFAULT_LABEL[key];
    const hidden = menu.hidden.includes(key);
    const icon = menuIconFor(key, menu);
    if (key === "all") out.push({ key, label, icon, kind: "filter", filter: "all", count: inStock.length, hidden });
    else if (key === "drop") ctx.hasDrop && out.push({ key, label, icon, kind: "drop", hidden });
    else if (key === "ask") out.push({ key, label, icon, kind: "ask", hidden });
    else if (key === "low") low > 0 && out.push({ key, label, icon, kind: "filter", filter: "low", count: low, hidden });
    else {
      const cat = key.slice(4) as ProductCategory;
      if (showCats && usedCats.has(cat)) {
        out.push({ key, label, icon, kind: "filter", filter: cat, count: perCat.get(cat) ?? 0, hidden });
      }
    }
  }
  return out;
}

/** The entries buyers actually see. */
export function resolveMenu(menu: StorefrontMenu, ctx: MenuContext): MenuEntry[] {
  return menuCandidates(menu, ctx)
    .filter((e) => !e.hidden)
    .map(({ hidden: _hidden, ...e }) => e);
}

/** `?c=` value → filter (unknown values fall back to "all"). */
export function parseFilter(v: string | null | undefined): ShopFilter {
  if (!v) return "all";
  if (v === "low") return "low";
  if (v in CATEGORY_LABEL) return v as ProductCategory;
  return "all";
}

export type BannerTarget =
  | { kind: "href"; href: string; external?: boolean }
  | { kind: "filter"; filter: ShopFilter }
  | { kind: "ask" };

/** Resolve a banner's button. Null when there's nothing sensible to link to. */
export function bannerTarget(
  link: BannerLink,
  ctx: { slug: string; dropHref?: string; productCodes: string[] }
): BannerTarget | null {
  switch (link.kind) {
    case "drop":
      return ctx.dropHref ? { kind: "href", href: ctx.dropHref } : null;
    case "category":
      return { kind: "filter", filter: link.category };
    case "low":
      return { kind: "filter", filter: "low" };
    case "product":
      return ctx.productCodes.includes(link.code) ? { kind: "href", href: `/shop/${ctx.slug}/${link.code}` } : null;
    case "whatsapp":
      return { kind: "ask" };
    case "url":
      return safeUrl(link.url) ? { kind: "href", href: safeUrl(link.url)!, external: true } : null;
    default:
      return null;
  }
}

/** Only http(s) links; a bare domain gets https:// in front. */
export function safeUrl(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------
 * Validation — the save action runs everything through this.
 * ------------------------------------------------------------------------- */

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const pct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50);

function cleanLink(l: unknown): BannerLink {
  const o = (l ?? {}) as Record<string, unknown>;
  switch (o.kind) {
    case "drop":
    case "low":
    case "whatsapp":
      return { kind: o.kind };
    case "category":
      return typeof o.category === "string" && o.category in CATEGORY_LABEL
        ? { kind: "category", category: o.category as ProductCategory }
        : { kind: "none" };
    case "product":
      return typeof o.code === "string" && o.code ? { kind: "product", code: o.code.slice(0, 40) } : { kind: "none" };
    case "url":
      return { kind: "url", url: clip(o.url, 500) ?? "" };
    default:
      return { kind: "none" };
  }
}

function cleanBanner(b: unknown): Banner | null {
  const o = (b ?? {}) as Record<string, unknown>;
  if (typeof o.image !== "string" || !o.image.startsWith("data:image/")) return null;
  return {
    id: clip(o.id, 64) || Math.random().toString(36).slice(2),
    image: o.image,
    focusX: pct(o.focusX),
    focusY: pct(o.focusY),
    tone: o.tone === "dark" ? "dark" : "light",
    eyebrow: clip(o.eyebrow, 40),
    headline: clip(o.headline, 90),
    subline: clip(o.subline, 160),
    cta: clip(o.cta, 28),
    link: cleanLink(o.link),
  };
}

export function sanitizeStorefront(input: unknown): Storefront {
  const o = (input ?? {}) as Record<string, unknown>;
  const m = (o.menu ?? {}) as Record<string, unknown>;
  const labels: StorefrontMenu["labels"] = {};
  for (const [k, v] of Object.entries((m.labels ?? {}) as Record<string, unknown>)) {
    const s = clip(v, MAX_MENU_LABEL)?.trim();
    if (isMenuKey(k) && s) labels[k] = s;
  }
  const icons: StorefrontMenu["icons"] = {};
  for (const [k, v] of Object.entries((m.icons ?? {}) as Record<string, unknown>)) {
    if (isMenuKey(k) && isMenuIconName(v)) icons[k] = v;
  }
  return {
    banners: (Array.isArray(o.banners) ? o.banners : [])
      .map(cleanBanner)
      .filter((b): b is Banner => !!b)
      .slice(0, MAX_BANNERS),
    autoplay: o.autoplay !== false,
    buttons: o.buttons === "accent" || o.buttons === "primary" ? o.buttons : "haali",
    menu: {
      order: (Array.isArray(m.order) ? m.order : []).filter(isMenuKey),
      // "All" can't be hidden — it's the way back from a filter.
      hidden: (Array.isArray(m.hidden) ? m.hidden : []).filter(isMenuKey).filter((k) => k !== "all"),
      labels,
      icons,
    },
  };
}

/** Is this drop still "up" by its own expiry rule? */
export function isDropLive(drop: Drop, now = Date.now()): boolean {
  if (drop.expiry.kind === "never") return true;
  if (drop.expiry.kind === "hours") return now - drop.postedAt < drop.expiry.hours * 3_600_000;
  return new Date(drop.postedAt).toDateString() === new Date(now).toDateString();
}
