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
    <main className="by-wrap">
      <Link href={`/shop/${shop.slug}`} className="by-back">
        <span aria-hidden>←</span> {shop.brandKit.shopName}
      </Link>

      <div className="by-product">
        <div className="by-product-media">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" />
          ) : (
            <div className="ph">{product.code}</div>
          )}
          <div className="by-chip ink">{product.code}</div>
        </div>

        <div>
          <section className="panel">
            <BuyForm shop={shop} product={product} />
          </section>

          <div className="by-shopline">
            <div className="by-label">
              {shop.brandKit.shopName}
              {shop.contact.area ? ` · ${shop.contact.area}` : ""}
            </div>
            <p>
              Link back to <Link href={`/shop/${shop.slug}`}>the full shop</Link>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
