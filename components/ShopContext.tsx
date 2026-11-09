"use client";

import { createContext, useContext } from "react";
import { dashPath, shopPath } from "@/lib/paths";

type ShopCtx = { slug: string; name: string };

const Ctx = createContext<ShopCtx | null>(null);

/** Provided by `/dashboard/[slug]/layout.tsx` for every per-shop vendor page. */
export function ShopProvider({ slug, name, children }: ShopCtx & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ slug, name }}>{children}</Ctx.Provider>;
}

/**
 * The shop the vendor is working on, plus URL helpers:
 *   const { slug, dash, shop } = useShop();
 *   dash("/products")   → "/dashboard/shania/products"
 *   shop("/B3")         → "/shop/shania/B3"
 */
export function useShop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop() must be used inside a /dashboard/[slug] page");
  return {
    ...ctx,
    dash: (path = "") => dashPath(ctx.slug, path),
    shop: (path = "") => shopPath(ctx.slug, path),
  };
}
