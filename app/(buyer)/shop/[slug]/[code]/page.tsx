import ProductPhoto from "@/components/ProductPhoto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getShop, getStorefrontButtons } from "@/lib/server-store";
import { buttonScope } from "@/lib/brand-accent";
import { getShopSlug } from "@/lib/actions/_slug";
import BuyForm from "./BuyForm";
import type { Product, Shop, Storefront } from "@/lib/types";

export default async function BuyerProductPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  if (slug !== getShopSlug()) notFound();

  const [shop, product, buttons] = await Promise.all([
    getShop(slug),
    getProduct(slug, code),
    getStorefrontButtons(slug),
  ]);
  if (!product) notFound();

  return <BuyerProductScreen shop={shop} product={product} buttons={buttons} />;
}

function BuyerProductScreen({
  shop,
  product,
  buttons,
}: {
  shop: Shop;
  product: Product;
  buttons: Storefront["buttons"];
}) {
  return (
    <main {...buttonScope(shop.brandKit, buttons, "by-wrap")}>
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
              Link back to <Link href={`/shop/${shop.slug}`}>the full shop</Link>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
