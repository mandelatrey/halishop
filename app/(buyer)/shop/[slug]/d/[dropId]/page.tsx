import ProductPhoto from "@/components/ProductPhoto";
import { optionsSummary } from "@/lib/variants";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getDrop, getShop, getStorefrontButtons, listProducts } from "@/lib/server-store";
import { buttonScope } from "@/lib/brand-accent";
import { CartButton, CartSheet } from "@/components/Cart";
import { getShopSlug } from "@/lib/actions/_slug";
import { formatPrice } from "@/lib/format";

export default async function BuyerDropPage({
  params,
}: {
  params: Promise<{ slug: string; dropId: string }>;
}) {
  const { slug, dropId } = await params;
  if (slug !== getShopSlug()) notFound();

  const [shop, buttons, drop, products] = await Promise.all([
    getShop(slug),
    getStorefrontButtons(slug),
    getDrop(slug, dropId),
    listProducts(slug),
  ]);

  if (!drop) notFound();

  const byCode = new Map(products.map((p) => [p.code, p]));
  const dropProducts = drop.items
    .map((it) => byCode.get(it.code))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const posted = new Date(drop.postedAt);
  const hh = String(posted.getHours()).padStart(2, "0");
  const mm = String(posted.getMinutes()).padStart(2, "0");
  const expiryText =
    drop.expiry.kind === "eod"
      ? `Posted ${hh}:${mm} · off the page at 23:59`
      : drop.expiry.kind === "hours"
      ? `Posted ${hh}:${mm} · off the page in 24h`
      : `Posted ${hh}:${mm}`;

  return (
    <main {...buttonScope(shop.brandKit, buttons, "by-wrap")}>
      <div className="by-toprow">
        <a href={`/shop/${slug}`} className="by-back">
          <span aria-hidden>←</span> {shop.brandKit.shopName}
        </a>
        <CartButton slug={slug} />
      </div>
      <CartSheet
        slug={slug}
        shopName={shop.brandKit.shopName.trim()}
        sellerWhatsapp={shop.contact.whatsapp}
        defaultArea={shop.contact.area}
        refPrefix={shop.refPrefix}
      />
      <header className="panel-dark by-drop-banner">
        <span className="pill dark">Live drop · {shop.brandKit.shopName}</span>
        <h1 className="by-h1">{drop.name}</h1>
        <div className="by-drop-meta">
          <span>
            <b>{dropProducts.length}</b> {dropProducts.length === 1 ? "piece" : "pieces"}
          </span>
          <span>{expiryText}</span>
        </div>
      </header>

      <div className="by-sec-head">
        <h2 className="section-title">In this drop</h2>
        <Link href={`/shop/${slug}`} className="by-count">
          All items →
        </Link>
      </div>

      <div className="by-grid">
        {dropProducts.map((p) => {
          const variantsText = optionsSummary(p);
          return (
            <Link key={p.code} href={`/shop/${slug}/${p.code}`} className="by-card" aria-label={`Order ${p.title}`}>
              <div className="by-card-img">
                <ProductPhoto src={p.image} meta={p.imageMeta} fit={p.imageFit} label={p.code} />
                <span className="by-chip">{p.code}</span>
                {typeof p.stock === "number" && p.stock <= 2 && p.stock > 0 && (
                  <span className="by-flag">Only {p.stock} left</span>
                )}
              </div>
              <div className="by-card-body">
                <h3 className="by-card-title">{p.title}</h3>
                {variantsText && (
                  <div className="by-tags">
                    <span className="tag">{variantsText}</span>
                  </div>
                )}
                <div className="by-card-foot">
                  <span className="by-card-price">{formatPrice(p.price, p.currency)}</span>
                  <span className="by-card-order">
                    <span className="by-card-order-l">Order</span>
                    <ArrowRight size={15} aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <footer className="by-foot">
        <div className="by-foot-info">
          <p>
            This page comes off with the status. The shop link — {shop.brandKit.shopUrl} — stays.
          </p>
        </div>
        <Link href={`/shop/${slug}`} className="btn sec">
          See all items in the shop
        </Link>
      </footer>
    </main>
  );
}
