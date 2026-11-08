import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { buildRef } from "@/lib/ref";
import { buildWaLink } from "@/lib/wa";
import type { Product, Shop } from "@/lib/types";

/**
 * Buyer-facing storefront. Rendered at `/shop/[slug]`. Product links use
 * `/shop/[slug]/[code]` so the `slug` prop is required — it drives href
 * construction. Styles live in `app/(buyer)/buyer.css` (`by-` classes).
 */
export default function Storefront({
  shop,
  products,
  slug,
  dropHref,
}: {
  shop: Shop;
  products: Product[];
  slug: string;
  /** Link to the shop's live drop, if one is currently up. */
  dropHref?: string;
}) {
  const inStock = products.filter((p) => !p.soldOut);
  const soldOut = products.filter((p) => p.soldOut);

  const firstName = shop.brandKit.shopName.split(/\s+/)[0];
  const askLink = buildWaLink(
    shop.contact.whatsapp,
    `Hi ${firstName}, I'd like to ask about your shop.`
  );

  // Two-tone display name: first word in ink, the rest in the soft second tone.
  const [nameHead, ...nameRest] = shop.brandKit.shopName.trim().split(/\s+/);

  // Stats — only facts the catalogue actually holds.
  const cheapest = inStock.length ? inStock.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const counted = inStock.filter((p) => typeof p.stock === "number");
  const pieces = counted.reduce((n, p) => n + Math.max(0, p.stock ?? 0), 0);
  const stats: { v: React.ReactNode; l: string }[] = [
    { v: inStock.length, l: inStock.length === 1 ? "Item in stock" : "Items in stock" },
  ];
  if (cheapest) {
    const [cur, ...amt] = formatPrice(cheapest.price, cheapest.currency).split(" ");
    stats.push({
      v: amt.length ? (
        <>
          <small>{cur}</small>
          {amt.join(" ")}
        </>
      ) : (
        cur
      ),
      l: "Lowest price",
    });
  }
  if (counted.length > 0) stats.push({ v: pieces, l: pieces === 1 ? "Piece left" : "Pieces left" });

  return (
    <main className="by-wrap">
      <header className="by-hero">
        {(shop.brandKit.logo || shop.contact.cityCopy) && (
          <div className="by-hero-top">
            {shop.brandKit.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.brandKit.logo} alt="" className="by-logo" />
            )}
            {shop.contact.cityCopy && (
              <span className="pill">
                {shop.contact.city ? `${shop.contact.city} · ` : ""}
                same-day boda
              </span>
            )}
          </div>
        )}

        <h1 className="by-h1">
          {nameHead}
          {nameRest.length > 0 && <span className="soft"> {nameRest.join(" ")}</span>}
        </h1>
        <p className="by-lede">
          Tap anything you like and your order opens in WhatsApp, already written out for {firstName}.
        </p>

        <div className="by-ctas">
          {dropHref && (
            <Link href={dropHref} className="btn">
              See today&rsquo;s drop <span className="arrow" aria-hidden>→</span>
            </Link>
          )}
          <a href={askLink} className="btn sec" target="_blank" rel="noopener noreferrer">
            Ask a question on WhatsApp
          </a>
        </div>
      </header>

      <div className="by-stats" style={{ "--n": stats.length } as React.CSSProperties}>
        {stats.map((s) => (
          <div key={s.l}>
            <div className="by-stat-v">{s.v}</div>
            <div className="by-stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="by-sec-head">
        <h2 className="section-title">In stock</h2>
        <span className="by-count">
          {inStock.length} {inStock.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="by-grid">
        {inStock.map((p) => {
          const ref = buildRef(shop, p.code, "full");
          const variantsText = (p.variants ?? []).join(" ");
          return (
            <Link
              key={p.code}
              href={`/shop/${slug}/${p.code}`}
              className="by-card"
              aria-label={`Order ${p.title}`}
            >
              <div className="by-card-img">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" />
                ) : (
                  <div className="ph">{p.code}</div>
                )}
                <span className="by-chip">{ref}</span>
              </div>
              <div className="by-card-body">
                <div>
                  <h3 className="by-card-title">{p.title}</h3>
                  <div className="by-card-price">{formatPrice(p.price, p.currency)}</div>
                </div>
                {(variantsText || (typeof p.stock === "number" && p.stock > 0)) && (
                  <div className="by-tags">
                    {variantsText && <span className="tag">{variantsText}</span>}
                    {typeof p.stock === "number" && p.stock > 0 && (
                      <span className={p.stock <= 2 ? "tag acc" : "tag"}>
                        {p.stock <= 2 ? `Only ${p.stock} left` : `${p.stock} in stock`}
                      </span>
                    )}
                  </div>
                )}
                <div className="by-card-foot">
                  <span className="btn">
                    Order <span className="arrow" aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {soldOut.map((p) => (
          <div key={p.code} className="by-card sold" aria-label={`${p.title} — sold out`}>
            <div className="by-card-img">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" />
              ) : (
                <div className="ph">{p.code}</div>
              )}
              <span className="by-chip ink">Sold out</span>
            </div>
            <div className="by-card-body">
              <div>
                <h3 className="by-card-title">{p.title}</h3>
                <div className="by-card-price">{formatPrice(p.price, p.currency)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="by-foot">
        <div className="by-foot-info">
          <div className="by-label">
            {shop.brandKit.shopName} · {shop.contact.whatsapp}
            {shop.contact.area ? ` · ${shop.contact.area}` : ""}
          </div>
          <p>You pay the rider on delivery, or send MoMo to {firstName}.</p>
        </div>
        <a href={askLink} className="btn sec" target="_blank" rel="noopener noreferrer">
          Ask a question on WhatsApp
        </a>
      </footer>
    </main>
  );
}
