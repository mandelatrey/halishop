import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Tracked short links → the buyer's product page.
 *
 *   /o/<shop>/<code>  — what captions use now (codes repeat across shops)
 *   /o/<code>         — links already posted from the single-shop days: the
 *                       old shop (NEXT_PUBLIC_SHOP_SLUG) if set, otherwise the
 *                       one shop that has that code; 404 when it's ambiguous.
 */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const to = (slug: string, code: string) =>
    NextResponse.redirect(new URL(`/shop/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`, req.url), 302);

  if (path.length === 2) return to(path[0], path[1]);
  if (path.length !== 1) return new NextResponse("Not found", { status: 404 });

  const code = path[0];
  const legacy = process.env.NEXT_PUBLIC_SHOP_SLUG;
  if (legacy) return to(legacy, code);
  const db = await getDb();
  const owners = await db
    .collection<{ shopSlug: string; code: string }>("products")
    .find({ code }, { projection: { shopSlug: 1 } })
    .limit(2)
    .toArray();
  return owners.length === 1 ? to(owners[0].shopSlug, code) : new NextResponse("Not found", { status: 404 });
}
