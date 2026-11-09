import type { CaptionVariantKind, Product, Shop } from "./types";
import { formatPrice } from "./format";
import { getOptions } from "./variants";
import { buildRef } from "./ref";

/**
 * Default caption templates. Tokens are of the form `{token}` — see
 * `renderCaption` for available substitutions.
 *
 * Copy comes from wireframe 1v ("Ready to post") and 1z ("Caption to paste").
 */
export const DEFAULT_CAPTIONS: Record<CaptionVariantKind, string> = {
  default:
    "{product} — {price}. {variantsLine}Tap the link to order, {cityCopy} 🛵 {trackedLink}",
  scarcity:
    "Only {stock} {product} left at {price} 😩 {variantsLine}Order before they finish: {trackedLink}",
  restock:
    "They're back! {product} at {price}. Same day delivery in {city}. {trackedLink}",
};

/**
 * Build the "sizes" fragment: "Sizes S to XL, still available. " if variants
 * exist, empty string otherwise. Reads well in the default caption.
 */
function variantsLine(product: Product): string {
  // Captions mention the first option only ("Sizes S to XL") to stay short.
  const first = getOptions(product)[0];
  const variants = first?.values ?? [];
  if (variants.length === 0) return "";
  const label = first.label;
  if (variants.length === 1) return `${label} ${variants[0]}, still available. `;
  return `${label} ${variants[0]} to ${variants[variants.length - 1]}, still available. `;
}

/** Absolute host for the tracked link — falls back to "shop.app" in prod. */
export function trackedLinkFor(slug: string, code: string): string {
  const host = process.env.NEXT_PUBLIC_APP_HOST || "shop.app";
  return `${host}/o/${slug}/${code}`;
}

/**
 * Substitute all `{token}`s in a caption template. Missing tokens become
 * empty strings; doubled spaces collapse.
 */
export function renderCaption(template: string, tokens: Record<string, string>): string {
  const out = template.replace(/\{(\w+)\}/g, (_, key) => tokens[key] ?? "");
  return out.replace(/ {2,}/g, " ").trim();
}

/**
 * Compose the token map for a product in the context of a shop. `trackedLink`
 * uses NEXT_PUBLIC_APP_HOST or falls back to `shop.app` — the /o/ redirect
 * route resolves whichever host we're actually running on.
 */
export function captionTokensFor(shop: Shop, product: Product): Record<string, string> {
  return {
    shop: shop.brandKit.shopName,
    product: product.title,
    price: formatPrice(product.price, product.currency),
    variants: (getOptions(product)[0]?.values ?? []).join(", "),
    variantsLine: variantsLine(product),
    stock: String(product.stock ?? ""),
    code: product.code,
    ref: buildRef(shop, product.code, "full"),
    trackedLink: trackedLinkFor(shop.slug, product.code),
    shopLink: shop.brandKit.shopUrl,
    cityCopy: shop.contact.cityCopy ?? "",
    city: shop.contact.city ?? "",
  };
}

export function renderCaptionFor(template: string, shop: Shop, product: Product): string {
  return renderCaption(template, captionTokensFor(shop, product));
}
