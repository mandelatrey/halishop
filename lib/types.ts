import type { Harmony } from "./palette";

export type BuiltinTemplateId = "bar" | "block" | "frame" | "split" | "clean";

export type FrameStyle = "Bar" | "Block" | "Border" | "None";

export type BrandPalette = {
  primary: string;     // card ground / footer bg
  accent: string;      // price / CTAs
  harmony: Harmony;    // how accent was derived — kept so the palette maker can restore state
};

export type BrandKit = {
  shopName: string;
  shopUrl: string;
  logo?: string;
  palette: BrandPalette;
  frame: FrameStyle;
  whatsapp?: string;
  alwaysShow: {
    price: boolean;
    code: boolean;
    shopLink: boolean;
    variants: boolean;
    whatsapp: boolean;
  };
};

export type ProductCategory =
  | "general"
  | "clothing"
  | "electronics"
  | "shoes"
  | "beauty"
  | "food"
  | "home";

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  general: "General",
  clothing: "Clothing",
  electronics: "Electronics",
  shoes: "Shoes",
  beauty: "Beauty",
  food: "Food & drink",
  home: "Home",
};

/** Sensible variant label per category. Users can override on any product. */
export const DEFAULT_VARIANT_LABEL: Record<ProductCategory, string> = {
  general: "Options",
  clothing: "Sizes",
  electronics: "Storage",
  shoes: "Sizes",
  beauty: "Shades",
  food: "Flavours",
  home: "Colours",
};

export const VARIANT_PLACEHOLDER: Record<ProductCategory, string> = {
  general: "Red, Blue, Green",
  clothing: "S, M, L, XL",
  electronics: "128GB, 256GB, 512GB",
  shoes: "39, 40, 41, 42",
  beauty: "Nude, Coral, Berry",
  food: "Chocolate, Vanilla, Strawberry",
  home: "Cream, Black, Grey",
};

export type ProductOption = {
  /** "Size", "Colour", "Storage"… */
  label: string;
  values: string[];
};

export type Product = {
  code: string;
  title: string;
  price: number;
  currency: string;
  image?: string;
  category?: ProductCategory;
  /**
   * Option types the buyer picks one value from each of, e.g.
   * [{ label: "Colour", values: ["Black", "Blue"] }, { label: "Storage", values: ["128GB", "256GB"] }].
   * Read through `getOptions()` in lib/variants.ts, which also understands the
   * older single-variant fields below.
   */
  options?: ProductOption[];
  /**
   * Legacy single variant (label + values). Kept in sync with `options[0]` on
   * save so captions and older readers keep working.
   */
  variantLabel?: string;
  /** Legacy single-variant values. Was previously named `sizes`. */
  variants?: string[];
  stock?: number;
  description?: string;
  soldOut?: boolean;
};

export type CardConfig = {
  templateId: string; // "builtin:bar" | `custom:${uuid}`
  showPrice: boolean;
  codeFormat: "short" | "full";
};

export type TextZone =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type CustomTemplateComposition = "background" | "overlay" | "full";
export type ProductImageMode = "grayscale" | "color" | "hidden";

export type CustomTemplate = {
  id: string;
  name: string;
  composition: CustomTemplateComposition;
  image: string; // data URL, expected 9:16
  /** Multiplier applied to the product photo (centered). Default 1. Range 0.5–2. */
  productScale?: number;
  /** Horizontal offset of the product photo as a fraction of card width (0 = centered). */
  productOffsetX?: number;
  /** Vertical offset of the product photo as a fraction of card height (0 = centered). */
  productOffsetY?: number;
  textZone: TextZone;
  textColor: string;
  accentColor: string;
  fields: {
    shopName: boolean;
    title: boolean;
    price: boolean;
    code: boolean;
    shopUrl: boolean;
  };
  productImageMode: ProductImageMode;
  createdAt: number;
};

export type BuiltinTemplate = {
  kind: "builtin";
  id: BuiltinTemplateId;
  label: string;
};

export type ResolvedTemplate =
  | BuiltinTemplate
  | ({ kind: "custom" } & CustomTemplate);

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  { kind: "builtin", id: "bar", label: "bar" },
  { kind: "builtin", id: "block", label: "block" },
  { kind: "builtin", id: "frame", label: "frame" },
  { kind: "builtin", id: "split", label: "split" },
  { kind: "builtin", id: "clean", label: "clean" },
];

/* -------------------------------------------------------------------------
 * Shop — the multi-tenant root. Phase 1 has one shop per deployment
 * identified by NEXT_PUBLIC_SHOP_SLUG.
 * ------------------------------------------------------------------------- */
export type ShopContact = {
  /** E.164, stored with leading + (e.g. "+256772145908"). */
  whatsapp: string;
  /** Default delivery area shown in buy form (e.g. "Ntinda"). */
  area?: string;
  /** Copy fragment for the default caption ("delivery today in Kampala"). */
  cityCopy?: string;
  /** Bare city name for the restock caption variant ("Kampala"). */
  city?: string;
};

export type Shop = {
  slug: string;
  brandKit: BrandKit;
  contact: ShopContact;
  /** Prefix used to build the full ref code (e.g. "SH-4F2" → "SH-4F2-B3"). */
  refPrefix: string;
  createdAt: number;
  updatedAt: number;
};

/* -------------------------------------------------------------------------
 * Drops — a curated list of products the reseller batch-generated cards for.
 * ------------------------------------------------------------------------- */
export type DropExpiry =
  | { kind: "eod" }
  | { kind: "hours"; hours: 24 }
  | { kind: "never" };

export type CaptionVariantKind = "default" | "scarcity" | "restock";

export type DropCaption = {
  variant: CaptionVariantKind;
  /** Raw template with {tokens} — rendered on demand. */
  text: string;
};

export type DropItem = {
  code: string;
  captions: DropCaption[];
  activeCaption: CaptionVariantKind;
};

export type Drop = {
  id: string;
  shopSlug: string;
  name: string;
  createdAt: number;
  /** Milliseconds since epoch — used for "Posted HH:MM · off the page at ...". */
  postedAt: number;
  expiry: DropExpiry;
  items: DropItem[];
  /** Frozen at generation time. */
  templateId: string;
  cardConfig: {
    showPrice: boolean;
    codeFormat: "short" | "full";
  };
};

/* -------------------------------------------------------------------------
 * Buyer recall — small localStorage record on the buyer's device.
 * ------------------------------------------------------------------------- */
export type BuyerRecall = {
  whatsapp?: string;
  area?: string;
};
