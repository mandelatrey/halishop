/**
 * Product options ("variants") — multiple option types per product, with
 * category-aware suggestions so sellers mostly tap instead of type.
 *
 *   Clothing    → Size + Colour       Electronics → Colour + Storage (+ Size, RAM)
 *   Shoes       → Size + Colour       Beauty      → Shade (+ Size, Scent)
 *   Food        → Flavour (+ Size)    Home        → Colour (+ Size, Material)
 */
import type { Product, ProductCategory, ProductOption } from "./types";
import { DEFAULT_VARIANT_LABEL } from "./types";

export const MAX_OPTIONS = 3;

/** Option types to suggest per category, most likely first. */
export const CATEGORY_OPTIONS: Record<ProductCategory, { suggested: string[]; autoAdd: string[] }> = {
  general: { suggested: ["Colour", "Size", "Type"], autoAdd: [] },
  clothing: { suggested: ["Size", "Colour", "Fit"], autoAdd: ["Size", "Colour"] },
  electronics: { suggested: ["Colour", "Storage", "Size", "RAM", "Model"], autoAdd: ["Colour", "Storage"] },
  shoes: { suggested: ["Size", "Colour"], autoAdd: ["Size", "Colour"] },
  beauty: { suggested: ["Shade", "Size", "Scent"], autoAdd: ["Shade"] },
  food: { suggested: ["Flavour", "Size"], autoAdd: ["Flavour"] },
  home: { suggested: ["Colour", "Size", "Material"], autoAdd: ["Colour"] },
};

type Kind = "size" | "colour" | "storage" | "ram" | "shade" | "scent" | "flavour" | "material" | "fit" | "other";

/** Map free-typed labels ("Sizes", "Color", "Colours", "Memory"…) to a kind. */
export function optionKind(label: string): Kind {
  const l = label.trim().toLowerCase();
  if (/^sizes?$/.test(l)) return "size";
  if (/^colou?rs?$/.test(l)) return "colour";
  if (/^storage|capacity/.test(l)) return "storage";
  if (/^(ram|memory)$/.test(l)) return "ram";
  if (/^shades?$/.test(l)) return "shade";
  if (/^(scents?|fragrances?)$/.test(l)) return "scent";
  if (/^flavou?rs?$/.test(l)) return "flavour";
  if (/^materials?$/.test(l)) return "material";
  if (/^fits?$/.test(l)) return "fit";
  return "other";
}

const COLOURS = ["Black", "White", "Grey", "Silver", "Gold", "Blue", "Red", "Green", "Pink", "Beige", "Brown"];

const SIZE_BY_CATEGORY: Record<ProductCategory, string[]> = {
  general: ["Small", "Medium", "Large"],
  clothing: ["XS", "S", "M", "L", "XL", "XXL"],
  electronics: ["Small", "Medium", "Large", '13"', '15"', '32"', '43"', '55"'],
  shoes: ["37", "38", "39", "40", "41", "42", "43", "44", "45"],
  beauty: ["15ml", "30ml", "50ml", "100ml"],
  food: ["Small", "Medium", "Large", "250g", "500g", "1kg"],
  home: ["Small", "Medium", "Large", "Single", "Double", "Queen", "King"],
};

const VALUES_BY_KIND: Partial<Record<Kind, string[]>> = {
  colour: COLOURS,
  storage: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  ram: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB"],
  shade: ["Fair", "Light", "Medium", "Tan", "Deep", "Nude", "Coral", "Berry"],
  scent: ["Vanilla", "Sandalwood", "Citrus", "Rose", "Oud", "Lavender"],
  flavour: ["Original", "Chocolate", "Vanilla", "Strawberry", "Mango"],
  material: ["Cotton", "Leather", "Wood", "Metal", "Glass", "Plastic"],
  fit: ["Slim", "Regular", "Oversized"],
};

/**
 * Value suggestions for one option. Values the seller already used for the
 * same kind of option on other products come first ("learned"), then the
 * built-in list for this kind + category. Already-chosen values are excluded.
 */
export function suggestValues(
  label: string,
  category: ProductCategory,
  chosen: string[],
  learned: Partial<Record<string, string[]>> = {}
): string[] {
  const kind = optionKind(label);
  const key = learnKey(label, category);
  const builtIn = kind === "size" ? SIZE_BY_CATEGORY[category] : VALUES_BY_KIND[kind] ?? [];
  const taken = new Set(chosen.map((v) => v.toLowerCase()));
  const out: string[] = [];
  for (const v of [...(learned[key] ?? []), ...builtIn]) {
    const k = v.toLowerCase();
    if (!taken.has(k)) {
      taken.add(k);
      out.push(v);
    }
  }
  return out;
}

/**
 * Key for remembering used values. Sizes are remembered per category (shoe
 * sizes shouldn't be suggested for T-shirts); colours, storage etc. are shared.
 */
function learnKey(label: string, category: ProductCategory): string {
  const kind = optionKind(label);
  if (kind === "size") return `size@${category}`;
  return kind === "other" ? label.trim().toLowerCase() : kind;
}

/** Values used across a catalogue, grouped by option kind — feeds `suggestValues`. */
export function learnValues(products: Product[]): Partial<Record<string, string[]>> {
  const map: Record<string, string[]> = {};
  for (const p of products) {
    for (const o of getOptions(p)) {
      const key = learnKey(o.label, p.category ?? "general");
      const list = (map[key] ??= []);
      for (const v of o.values) if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) list.push(v);
    }
  }
  return map;
}

/** Empty options to start a product in this category with. */
export function defaultOptionsFor(category: ProductCategory): ProductOption[] {
  return CATEGORY_OPTIONS[category].autoAdd.map((label) => ({ label, values: [] }));
}

/** A product's options, understanding the legacy single-variant fields. */
export function getOptions(p: Product): ProductOption[] {
  if (p.options && p.options.length) {
    return p.options.filter((o) => o.label?.trim() && o.values?.length);
  }
  const values = (p.variants ?? []).filter(Boolean);
  if (!values.length) return [];
  const label = p.variantLabel?.trim() || DEFAULT_VARIANT_LABEL[p.category ?? "general"];
  return [{ label, values }];
}

/**
 * Clean options for saving and mirror the first one into the legacy
 * `variantLabel` / `variants` fields (captions and older readers use those).
 */
export function withOptions(p: Product, options: ProductOption[]): Product {
  const clean = options
    .map((o) => ({ label: o.label.trim(), values: o.values.map((v) => v.trim()).filter(Boolean) }))
    .filter((o) => o.label && o.values.length)
    .slice(0, MAX_OPTIONS);
  return {
    ...p,
    options: clean,
    variantLabel: clean[0]?.label,
    variants: clean[0]?.values ?? [],
  };
}

/** Compact text for product tags: "S M L XL · 3 colours". */
export function optionsSummary(p: Product): string {
  const [first, ...rest] = getOptions(p);
  if (!first) return "";
  // "3 storage options", "2 colour options" — reads right for any label.
  const extra = rest.map(
    (o) => `${o.values.length} ${o.label.toLowerCase().replace(/s$/, "")} option${o.values.length === 1 ? "" : "s"}`
  );
  return [first.values.join(" "), ...extra].join(" · ");
}

/** "Size: S / M / L · Colour: Black / White" for admin lists. */
export function optionsDetail(p: Product): string {
  return getOptions(p)
    .map((o) => `${o.label}: ${o.values.join(" / ")}`)
    .join(" · ");
}
