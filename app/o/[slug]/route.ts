import { NextResponse } from "next/server";
import { demoShopSlug } from "@/lib/seed";

/**
 * Legacy short link `shop.app/o/{code}` from before multi-shop accounts.
 * Captions already posted to statuses still use it, so it keeps resolving
 * against the original (demo) shop. New captions use /o/{slug}/{code}.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: code } = await params;
  const legacy = demoShopSlug();
  if (!legacy) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(new URL(`/o/${legacy}/${encodeURIComponent(code)}`, req.url), 302);
}
