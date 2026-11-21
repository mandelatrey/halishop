import { getProduct } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";

/**
 * A product's photo as an ordinary image, for places that only know the
 * product code — the buyer's cart, which lives in their browser and can't
 * hold the photo itself. Photos are stored as data URLs in the product doc.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  if (slug !== getShopSlug()) return new Response("Not found", { status: 404 });
  const product = await getProduct(slug, code);
  // A photo stored as a path or URL (seed photos): send the browser there.
  if (product?.image && /^(\/|https?:\/\/)/.test(product.image)) {
    return Response.redirect(new URL(product.image, req.url), 302);
  }
  const m = product?.image ? /^data:(image\/[\w.+-]+);base64,(.*)$/s.exec(product.image) : null;
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      // Short cache: a seller may swap the photo.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
