import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getShop } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import BuyForm from "./BuyForm";
import type { Product, Shop } from "@/lib/types";

export default async function BuyerProductPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  if (slug !== getShopSlug()) notFound();

  const [shop, product] = await Promise.all([getShop(slug), getProduct(slug, code)]);
  if (!product) notFound();

  return <BuyerProductScreen shop={shop} product={product} />;
}

function BuyerProductScreen({ shop, product }: { shop: Shop; product: Product }) {
  return (
    <main className="storefront">
      <section className="sf-mobile">
        <div className="bp-hero">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" />
          ) : (
            <div className="ph" style={{ width: "100%", height: "100%" }}>{product.code}</div>
          )}
          <div className="bp-code-tag">{product.code}</div>
        </div>

        <BuyForm shop={shop} product={product} />

        <div className="col" style={{ padding: 12, gap: 4 }}>
          <div className="k" style={{ letterSpacing: "0.1em" }}>
            {shop.brandKit.shopName}
            {shop.contact.area ? ` · ${shop.contact.area}` : ""}
          </div>
          <div className="p" style={{ fontSize: 12 }}>
            Link back to <Link href={`/shop/${shop.slug}`}>the full shop</Link>.
          </div>
        </div>
      </section>

      <style>{`
        .storefront {
          max-width: 480px;
          margin: 0 auto;
          padding: 24px;
        }
        .sf-mobile {
          background: #fff;
          border: 1px solid var(--stroke-soft);
          border-radius: 12px;
          overflow: hidden;
        }
        .bp-hero {
          position: relative;
          height: 300px;
          background: var(--color-surface);
        }
        .bp-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bp-code-tag {
          position: absolute;
          left: 0;
          bottom: 0;
          padding: 8px 12px;
          background: var(--color-text);
          color: #fff;
          font: 700 11px/1 ui-monospace, Menlo, monospace;
          letter-spacing: 0.14em;
          pointer-events: none;
        }
      `}</style>
    </main>
  );
}
