import { NextResponse } from "next/server";
import { isBot, recordEvent } from "@/lib/events";
import { getProduct, getShopDoc } from "@/lib/server-store";

/**
 * Tracked short link from a status caption (`shop.app/o/{slug}/{code}`) —
 * logs a `link_tap` and 302s to the product page (or the shop if the product
 * is gone).
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  const shop = await getShopDoc(slug);
  if (!shop) return new NextResponse("Not found", { status: 404 });

  const product = await getProduct(slug, code);
  if (!isBot(req.headers.get("user-agent"))) {
    await recordEvent({ shopSlug: slug, type: "link_tap", code: product ? code : undefined }).catch(() => {});
  }
  const target = product ? `/shop/${slug}/${encodeURIComponent(code)}` : `/shop/${slug}`;
  return NextResponse.redirect(new URL(target, req.url), 302);
}
