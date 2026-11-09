import ProductPhoto from "@/components/ProductPhoto";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrackView from "@/components/TrackView";
import { getProduct, getShopDoc } from "@/lib/server-store";
import BuyForm from "./BuyForm";
import type { Product, Shop } from "@/lib/types";

export default async function BuyerProductPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const [shop, product] = await Promise.all([getShopDoc(slug), getProduct(slug, code)]);
  if (!shop || !product) notFound();

  return <BuyerProductScreen shop={shop} product={product} />;
}

function BuyerProductScreen({ shop, product }: { shop: Shop; product: Product }) {
  return (
    <main className="by-wrap">
      <TrackView slug={shop.slug} type="product_view" code={product.code} />
      <Link href={`/shop/${shop.slug}`} className="by-back">
        <span aria-hidden>←</span> Back
      </Link>

      <div className="by-product">
        <div className="by-product-media">
          <ProductPhoto
            src={product.image}
            meta={product.imageMeta}
            fit={product.imageFit}
            label={product.code}
            padding={0.08}
          />
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
              Link back to <Link href={`/shop/${shop.slug}`}>the full shop</Link> ·{" "}
              <Link href={`/shop/${shop.slug}/about`}>About this seller</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
