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

/**
 * What the upload step learned about a product photo (lib/image-prep.ts).
 * Lets every frame fit the photo sensibly without re-analysing it.
 */
export type ImageMeta = {
  /** Pixel size of the stored (prepared) image. */
  w: number;
  h: number;
  /**
   * "cutout": product on a plain/studio or transparent background — show the
   *           whole product, centred, on `bg`.
   * "photo":  a scene that should fill the frame.
   */
  kind: "cutout" | "photo";
  /** Background colour of a cutout ("#ffffff"), or null when transparent. */
  bg?: string | null;
};

/** Seller override for how the photo sits in frames. */
export type ImageFit = "auto" | "contain" | "cover";

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
  /** Set when the photo was prepared on upload; absent for older photos. */
  imageMeta?: ImageMeta;
  /** "auto" (default) lets imageMeta decide. */
  imageFit?: ImageFit;
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
 * Shop — the multi-tenant root. Each shop is owned by one vendor; a vendor
 * can own many shops (one per hustle). Buyers only ever see one shop at a
 * time, at `/shop/[slug]`.
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
  /** Vendor who owns the shop. Absent only on legacy shops not yet claimed. */
  ownerId?: string;
  /** Buyer-facing "About this shop" info. */
  about?: ShopAbout;
  createdAt: number;
  updatedAt: number;
};

/** What buyers see about a shop on its About page and storefront footer. */
export type ShopAbout = {
  /** One line under the shop name ("Thrifted streetwear, hand-picked"). */
  tagline?: string;
  /** A few sentences about the shop: what it sells, how it works. */
  description?: string;
  /** How buyers pay ("Cash on delivery or MoMo"). */
  payment?: string;
  /** When the seller replies / delivers ("Mon–Sat, 9am–7pm"). */
  hours?: string;
  /** Social handles, without the @. */
  instagram?: string;
  tiktok?: string;
  /** Show the owner's name, photo and bio on the About page. Default true. */
  showOwner?: boolean;
};

/* -------------------------------------------------------------------------
 * Vendors — the people who sign in and run shops.
 * ------------------------------------------------------------------------- */
export type Vendor = {
  id: string;
  email: string;
  name: string;
  /** Short bio shown to buyers on shops that opt in. */
  bio?: string;
  /** Profile photo — Google avatar URL or uploaded data URL. */
  avatar?: string;
  /** Which sign-in methods are linked. */
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: number;
};

/** The subset of a vendor that's safe to show buyers. */
export type VendorPublic = Pick<Vendor, "name" | "bio" | "avatar" | "createdAt">;

/* -------------------------------------------------------------------------
 * Events — anonymous buyer activity, the raw input for vendor metrics.
 * ------------------------------------------------------------------------- */
export type ShopEventType =
  | "shop_view"
  | "product_view"
  | "drop_view"
  | "about_view"
  | "order_tap"
  | "ask_tap"
  | "link_tap";

export const SHOP_EVENT_TYPES: ShopEventType[] = [
  "shop_view",
  "product_view",
  "drop_view",
  "about_view",
  "order_tap",
  "ask_tap",
  "link_tap",
];

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
