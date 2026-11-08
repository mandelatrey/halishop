import type { Shop } from "./types";

/**
 * Build the full ref code for a product — e.g. "SH-4F2-B3".
 * The short form is just the raw product code ("B3").
 */
export function buildRef(shop: Shop, code: string, format: "short" | "full" = "full"): string {
  if (format === "short") return code;
  return `${shop.refPrefix}-${code}`;
}
