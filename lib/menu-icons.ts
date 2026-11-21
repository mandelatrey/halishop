import type { ShopMenuKey } from "./types";

/**
 * Icons a seller can give a shop-menu entry. Names only (no React), so the
 * save action can validate them and the menu helpers stay pure; the buyer page
 * and editor map names to lucide components (components/storefront/ShopMenu.tsx).
 */
export const MENU_ICON_NAMES = [
  "LayoutGrid", "ShoppingBag", "Tag", "Percent", "Star", "Flame", "Zap", "Gift", "Heart", "Crown",
  "Shirt", "Footprints", "Backpack", "Briefcase", "Watch", "Glasses", "Gem", "Scissors",
  "Sparkles", "Palette", "Droplet", "Brush", "Pill", "Baby", "Dumbbell", "Bike",
  "Smartphone", "Laptop", "Headphones", "Speaker", "Tv", "Camera", "Gamepad2", "Plug", "Music",
  "Sofa", "Lamp", "Bed", "CookingPot", "UtensilsCrossed", "Coffee", "Cake", "Apple", "Wine",
  "Flower2", "Leaf", "PawPrint", "Book", "Car", "Wrench", "Package", "Truck", "MessageCircle",
] as const;

export type MenuIconName = (typeof MENU_ICON_NAMES)[number];

export const isMenuIconName = (v: unknown): v is MenuIconName =>
  typeof v === "string" && (MENU_ICON_NAMES as readonly string[]).includes(v);

/** Each entry's icon under its own name. */
export const DEFAULT_MENU_ICON: Record<ShopMenuKey, MenuIconName> = {
  all: "LayoutGrid",
  drop: "Zap",
  low: "Flame",
  ask: "MessageCircle",
  "cat:general": "ShoppingBag",
  "cat:clothing": "Shirt",
  "cat:electronics": "Headphones",
  "cat:shoes": "Footprints",
  "cat:beauty": "Sparkles",
  "cat:food": "UtensilsCrossed",
  "cat:home": "Sofa",
};

/** Words in a seller's label → the icon that fits. First match wins, so specific words come first. */
const WORDS: [RegExp, MenuIconName][] = [
  [/phone|mobile|gadget|smart ?watch|tablet|ipad|iphone|android/, "Smartphone"],
  [/laptop|desktop|computer|\bpc\b|macbook/, "Laptop"],
  [/headphone|earbud|earphone|airpod/, "Headphones"],
  [/speaker|audio|sound|bluetooth/, "Speaker"],
  [/\btvs?\b|television/, "Tv"],
  [/camera|photo/, "Camera"],
  [/game|gaming|playstation|xbox|console/, "Gamepad2"],
  [/charger|cable|plug|power ?bank/, "Plug"],
  [/electronic|tech/, "Headphones"],
  [/music|vinyl/, "Music"],
  [/watch/, "Watch"],
  [/glasses|shades|eyewear|sunnies/, "Glasses"],
  [/jewel|\brings?\b|necklace|earring|bracelet|\bgold\b|silver/, "Gem"],
  [/shoe|sneaker|footwear|heels|sandal|boot|slipper|flats/, "Footprints"],
  [/backpack|school/, "Backpack"],
  [/bag|purse|clutch|wallet/, "ShoppingBag"],
  [/office|work|suit/, "Briefcase"],
  [/hair|wig|braid|salon|barber/, "Scissors"],
  [/makeup|make-up|lipstick|cosmetic/, "Palette"],
  [/perfume|fragrance|scent|oil|lotion|skin/, "Droplet"],
  [/beauty|glow|care/, "Sparkles"],
  [/nail|brush/, "Brush"],
  [/health|pharma|medic|vitamin|supplement/, "Pill"],
  [/baby|kid|child|toddler|toy/, "Baby"],
  [/sport|fitness|gym|workout/, "Dumbbell"],
  [/bike|bicycle|cycling/, "Bike"],
  [/cloth|fashion|wear|dress|shirt|\btees?\b|\btops?\b|jean|trouser|skirt|style|outfit|apparel|\b(wo)?men\b|scar(f|ves)/, "Shirt"],
  [/kitchen|cook|\bpots?\b|\bpans?\b|utensil/, "CookingPot"],
  [/coffee|\btea\b|drink|juice/, "Coffee"],
  [/wine|beer|spirit|liquor/, "Wine"],
  [/cake|bake|bakery|pastr|dessert|sweet/, "Cake"],
  [/fruit|veg|grocer|fresh/, "Apple"],
  [/food|snack|meal|\beats?\b/, "UtensilsCrossed"],
  [/lamp|light/, "Lamp"],
  [/bed|sleep|bedding|mattress/, "Bed"],
  [/home|house|decor|furniture|living/, "Sofa"],
  [/flower|plant|garden/, "Flower2"],
  [/organic|natural|herbal/, "Leaf"],
  [/\bpets?\b|\bdogs?\b|\bcats?\b/, "PawPrint"],
  [/book|stationer|read/, "Book"],
  [/\bcars?\b|\bauto|vehicle|motor/, "Car"],
  [/tool|hardware|repair|diy/, "Wrench"],
  [/gift|present/, "Gift"],
  [/sale|deal|offer|discount|promo|clearance/, "Percent"],
  [/\bnew\b|latest|arrival/, "Star"],
  [/\bhot\b|trend|popular|\bbest/, "Flame"],
  [/\blove|\bfav/, "Heart"],
  [/premium|luxury|vip|exclusive/, "Crown"],
  [/deliver|shipping/, "Truck"],
];

export function guessMenuIcon(label: string): MenuIconName | null {
  const l = label.toLowerCase();
  for (const [re, icon] of WORDS) if (re.test(l)) return icon;
  return null;
}

/**
 * The icon an entry shows: the seller's pick; otherwise, if they renamed it,
 * one that fits the new name; otherwise the entry's own.
 */
export function menuIconFor(
  key: ShopMenuKey,
  menu: { icons?: Partial<Record<ShopMenuKey, string>>; labels: Partial<Record<ShopMenuKey, string>> }
): MenuIconName {
  const picked = menu.icons?.[key];
  if (isMenuIconName(picked)) return picked;
  const label = menu.labels[key]?.trim();
  return (label && guessMenuIcon(label)) || DEFAULT_MENU_ICON[key];
}
