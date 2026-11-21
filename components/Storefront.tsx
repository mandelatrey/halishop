import ProductPhoto from "./ProductPhoto";
import { optionsSummary } from "@/lib/variants";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, Truck, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { buildRef } from "@/lib/ref";
import { buildWaLink } from "@/lib/wa";
import {
  ASK_EVENT,
  bannerTarget,
  categoryOf,
  isLow,
  menuCandidates,
  resolveMenu,
  type ShopFilter,
} from "@/lib/storefront";
import { CATEGORY_LABEL, type Product, type Shop, type Storefront as StorefrontConfig } from "@/lib/types";
import { buttonScope } from "@/lib/brand-accent";
import AskWhatsApp from "./AskWhatsApp";
import AskDock from "./storefront/AskDock";
import { CartButton, CartSheet } from "./Cart";
import FavoriteButton from "./FavoriteButton";
import BannerCarousel from "./storefront/BannerCarousel";
import { BannerSlide, BrandSlide } from "./storefront/BannerSlide";
import { ShopBrowse } from "./storefront/ShopMenu";

/** "UGX 22,000" → <small>UGX</small>22,000 */
function Price({ value, currency }: { value: number; currency: string }) {
  const [cur, ...amt] = formatPrice(value, currency).split(" ");
  if (!amt.length) return <>{cur}</>;
  return (
    <>
      <small>{cur}</small>
      {amt.join(" ")}
    </>
  );
}

/**
 * Buyer-facing storefront. Rendered at `/shop/[slug]`. Product links use
 * `/shop/[slug]/[code]` so the `slug` prop is required — it drives href
 * construction. Styles live in `app/(buyer)/buyer.css` (`by-` classes) and
 * `components/storefront/storefront.css` (banners + menu).
 *
 *   shop bar (logo, name, facts, Ask)
 *   banner carousel  ← seller's slides (/storefront), or a brand slide
 *   hanging menu     ← filters the grid in place
 *   grid · trust strip · footer
 */
export default function Storefront({
  shop,
  products,
  slug,
  dropHref,
  storefront,
  initialFilter = "all",
  favorite = null,
  accountPhone,
}: {
  shop: Shop;
  products: Product[];
  slug: string;
  /** Link to the shop's live drop, if one is currently up. */
  dropHref?: string;
  storefront: StorefrontConfig;
  /** From `?c=` so a shared filtered link renders filtered. */
  initialFilter?: ShopFilter;
  /** Whether the signed-in buyer follows this shop; null when signed out. */
  favorite?: boolean | null;
  /** The signed-in buyer's number, to prefill orders. */
  accountPhone?: string;
}) {
  const inStock = products.filter((p) => !p.soldOut);
  const soldOut = products.filter((p) => p.soldOut);

  const shopName = shop.brandKit.shopName.trim();
  const firstName = shopName.split(/\s+/)[0];
  const askHref = buildWaLink(shop.contact.whatsapp, `Hi ${firstName}, I'm looking at your shop page.`);
  const cityLine = shop.contact.cityCopy
    ? `${shop.contact.city ? `${shop.contact.city} · ` : ""}same-day boda`
    : undefined;

  // Facts — only what the catalogue actually holds.
  const cheapest = inStock.length ? inStock.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const counted = inStock.filter((p) => typeof p.stock === "number");

  // Menu + per-filter counts and titles (titles follow the seller's labels).
  const ctx = { products, hasDrop: !!dropHref };
  const entries = resolveMenu(storefront.menu, ctx);
  const counts: Partial<Record<ShopFilter, number>> = { all: inStock.length, low: inStock.filter(isLow).length };
  const labels: Partial<Record<ShopFilter, string>> = { all: "In stock", low: "Almost gone" };
  for (const c of Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]) {
    counts[c] = inStock.filter((p) => categoryOf(p) === c).length;
    labels[c] = CATEGORY_LABEL[c];
  }
  for (const e of menuCandidates(storefront.menu, ctx)) {
    if (e.kind === "filter" && e.filter && e.filter !== "all") labels[e.filter] = e.label;
  }

  const linkCtx = { slug, dropHref, productCodes: products.map((p) => p.code) };
  const photos = inStock.filter((p) => p.image).slice(0, 3);

  return (
    <main {...buttonScope(shop.brandKit, storefront.buttons, "by-wrap by-shop")}>
      <header className="by-shopbar">
        {shop.brandKit.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.brandKit.logo} alt="" className="by-logo" />
        ) : (
          <span className="by-logo by-logo-mono" aria-hidden>
            {firstName.slice(0, 1)}
          </span>
        )}
        <div className="by-shopbar-id">
          <div className="by-shopname-row">
            <h1 className="by-shopname">{shopName}</h1>
            <FavoriteButton slug={slug} favorite={favorite} />
          </div>
          <p className="by-shopfacts">
            {cityLine && <span className="by-shopfacts-city">{cityLine}</span>}
            <span className="by-shopfacts-nums">
              <span>{inStock.length} in stock</span>
              {cheapest && <span>from {formatPrice(cheapest.price, cheapest.currency)}</span>}
            </span>
          </p>
        </div>
        {/* Cart + Ask stay in reach on scroll: they dock under the nav once the bar scrolls away. */}
        <AskDock>
          <span className="by-shopbar-actions">
            <CartButton slug={slug} />
            <AskWhatsApp
              number={shop.contact.whatsapp}
              shopName={shopName}
              area={shop.contact.area}
              className="btn sec by-shopbar-ask"
              openOn={ASK_EVENT}
            >
              <MessageCircle size={16} aria-hidden />
              <span className="by-shopbar-ask-full">Ask on WhatsApp</span>
              <span className="by-shopbar-ask-short">Ask</span>
            </AskWhatsApp>
          </span>
        </AskDock>
      </header>
      <CartSheet
        slug={slug}
        shopName={shopName}
        sellerWhatsapp={shop.contact.whatsapp}
        defaultArea={shop.contact.area}
        refPrefix={shop.refPrefix}
        accountPhone={accountPhone}
      />

      <BannerCarousel autoplay={storefront.autoplay} label={`${shopName} highlights`}>
        {storefront.banners.length > 0
          ? storefront.banners.map((b, i) => (
              <BannerSlide
                key={b.id}
                banner={b}
                target={bannerTarget(b.link, linkCtx)}
                askHref={askHref}
                shopName={shopName}
                first={i === 0}
              />
            ))
          : [
              <BrandSlide
                key="brand"
                shopName={shopName}
                primary={shop.brandKit.palette.primary}
                eyebrow={cityLine ?? "Order on WhatsApp"}
                lede={`Tap anything you like and your order opens in WhatsApp, already written out with the order details, ready to send to ${firstName}.`}
                dropHref={dropHref}
                photos={photos}
              />,
            ]}
      </BannerCarousel>

      <ShopBrowse
        entries={entries}
        initialFilter={initialFilter}
        counts={counts}
        labels={labels}
        dropHref={dropHref}
        askHref={askHref}
      >
        <div className="by-grid">
          {inStock.map((p) => {
            const ref = buildRef(shop, p.code, "full");
            const variantsText = optionsSummary(p);
            return (
              <Link
                key={p.code}
                href={`/shop/${slug}/${p.code}`}
                className="by-card"
                aria-label={`Order ${p.title}`}
                data-cat={categoryOf(p)}
                data-low={isLow(p) ? "" : undefined}
              >
                <div className="by-card-img">
                  <ProductPhoto src={p.image} meta={p.imageMeta} fit={p.imageFit} label={p.code} />
                  <span className="by-chip">{ref}</span>
                  {isLow(p) && <span className="by-flag">Only {p.stock} left</span>}
                </div>
                <div className="by-card-body">
                  <h3 className="by-card-title">{p.title}</h3>
                  {(variantsText || (typeof p.stock === "number" && p.stock > 2)) && (
                    <div className="by-tags">
                      {variantsText && <span className="tag">{variantsText}</span>}
                      {typeof p.stock === "number" && p.stock > 2 && <span className="tag">{p.stock} in stock</span>}
                    </div>
                  )}
                  <div className="by-card-foot">
                    <span className="by-card-price">
                      <Price value={p.price} currency={p.currency} />
                    </span>
                    <span className="by-card-order">
                      <span className="by-card-order-l">Order</span>
                      <ArrowRight size={15} aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {soldOut.map((p) => (
            <div key={p.code} className="by-card sold" aria-label={`${p.title} — sold out`} data-cat={categoryOf(p)}>
              <div className="by-card-img">
                <ProductPhoto src={p.image} meta={p.imageMeta} fit={p.imageFit} label={p.code} grayscale />
                <span className="by-chip ink">Sold out</span>
              </div>
              <div className="by-card-body">
                <h3 className="by-card-title">{p.title}</h3>
                <div className="by-card-foot">
                  <span className="by-card-price">
                    <Price value={p.price} currency={p.currency} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ShopBrowse>

      <ul className="by-trust" aria-label="How buying works">
        <li>
          <span className="by-trust-ic"><MessageCircle size={18} aria-hidden /></span>
          <div>
            <b>Order on WhatsApp</b>
            <span>Your order arrives already written out</span>
          </div>
        </li>
        <li>
          <span className="by-trust-ic"><Wallet size={18} aria-hidden /></span>
          <div>
            <b>Pay on delivery</b>
            <span>Pay the rider, or send MoMo to {firstName}</span>
          </div>
        </li>
        {shop.contact.cityCopy && (
          <li>
            <span className="by-trust-ic"><Truck size={18} aria-hidden /></span>
            <div>
              <b>Same-day boda</b>
              <span>{shop.contact.cityCopy.replace(/^./, (c) => c.toUpperCase())}</span>
            </div>
          </li>
        )}
        {counted.length > 0 && (
          <li>
            <span className="by-trust-ic"><ShieldCheck size={18} aria-hidden /></span>
            <div>
              <b>Real stock counts</b>
              <span>What you see is what&rsquo;s on the shelf</span>
            </div>
          </li>
        )}
      </ul>

      <footer className="by-foot">
        <div className="by-foot-info">
          <div className="by-label">
            {shopName} · {shop.contact.whatsapp}
            {shop.contact.area ? ` · ${shop.contact.area}` : ""}
          </div>
          <p>
            Questions about sizes, colours or delivery? Tap <b>Ask on WhatsApp</b> and {firstName} answers
            there.
          </p>
        </div>
      </footer>
    </main>
  );
}
