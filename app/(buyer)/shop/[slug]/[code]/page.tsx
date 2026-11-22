import ProductPhoto from "@/components/ProductPhoto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findShop, getProduct, getStorefrontButtons } from "@/lib/server-store";
import { buttonScope } from "@/lib/brand-accent";
import { getCurrentUser } from "@/lib/auth";
import BuyForm from "./BuyForm";
import BackButton from "@/components/BackButton";
import { CartButton, CartSheet } from "@/components/Cart";
import type { Product, Shop, Storefront } from "@/lib/types";

export default async function BuyerProductPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;

  const [shop, product, buttons, user] = await Promise.all([
    findShop(slug),
    getProduct(slug, code),
    getStorefrontButtons(slug),
    getCurrentUser(),
  ]);
  if (!shop || !product) notFound();

  return <BuyerProductScreen shop={shop} product={product} buttons={buttons} accountPhone={user?.phone} />;
}

function BuyerProductScreen({
  shop,
  product,
  buttons,
  accountPhone,
}: {
  shop: Shop;
  product: Product;
  buttons: Storefront["buttons"];
  accountPhone?: string;
}) {
  return (
    <main {...buttonScope(shop.brandKit, buttons, "by-wrap")}>
      <div className="by-toprow">
        <BackButton fallbackHref={`/shop/${shop.slug}`} fallbackLabel={shop.brandKit.shopName.trim()} />
        <CartButton slug={shop.slug} />
      </div>
      <CartSheet
        slug={shop.slug}
        shopName={shop.brandKit.shopName.trim()}
        sellerWhatsapp={shop.contact.whatsapp}
        defaultArea={shop.contact.area}
        refPrefix={shop.refPrefix}
        accountPhone={accountPhone}
      />

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
            <BuyForm shop={shop} product={product} accountPhone={accountPhone} />
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
