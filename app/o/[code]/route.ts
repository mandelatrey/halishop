import { NextResponse } from "next/server";
import { getShopSlug } from "@/lib/actions/_slug";

/**
 * Tracked short link — 302s to the buyer-facing product page.
 *
 * Captions embed `shop.app/o/{code}`. In phase 1 there's no analytics backend;
 * the route just resolves to the current single-shop's product page so the
 * link is copyable, tappable, and matches the caption text verbatim.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const slug = getShopSlug();
  const url = new URL(`/shop/${slug}/${encodeURIComponent(code)}`, _req.url);
  return NextResponse.redirect(url, 302);
}
