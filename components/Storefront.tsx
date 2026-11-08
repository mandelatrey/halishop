import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { buildRef } from "@/lib/ref";
import { buildWaLink } from "@/lib/wa";
import type { Product, Shop } from "@/lib/types";

/**
 * Buyer-facing storefront. Rendered at `/` (home) and at `/shop/[slug]` for
 * explicit multi-tenant URLs. Product links use `/shop/[slug]/[code]` so the
 * `slug` prop is required — it drives href construction.
 */
export default function Storefront({
  shop,
  products,
  slug,
}: {
  shop: Shop;
  products: Product[];
  slug: string;
}) {
  const inStock = products.filter((p) => !p.soldOut);
  const soldOut = products.filter((p) => p.soldOut);

  const askLink = buildWaLink(
    shop.contact.whatsapp,
    `Hi ${shop.brandKit.shopName.split(/\s+/)[0]}, I'd like to ask about your shop.`
  );

  return (
    <main className="storefront">
      <section className="sf-mobile">
        <header className="sf-mobile-header">
          {shop.brandKit.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.brandKit.logo} alt="" className="sf-logo" />
          )}
          <div className="col" style={{ gap: 4 }}>
            <div className="sf-shopname">{shop.brandKit.shopName}</div>
            {shop.contact.cityCopy && (
              <div className="k" style={{ textTransform: "uppercase" }}>
                {shop.contact.city ? `${shop.contact.city} · ` : ""}
                same-day boda
              </div>
            )}
          </div>
        </header>

        <div className="sf-band">
          <span className="k">{inStock.length} items in stock</span>
          <span className="k" style={{ color: "var(--color-accent-dark)" }}>
            See today&rsquo;s drop →
          </span>
        </div>

        <div className="col">
          {inStock.map((p) => {
            const ref = buildRef(shop, p.code, "full");
            const variantsText = (p.variants ?? []).join(" ");
            return (
              <Link
                key={p.code}
                href={`/shop/${slug}/${p.code}`}
                className="sf-row"
                aria-label={`Order ${p.title}`}
              >
                <div className="sf-thumb">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" />
                  ) : (
                    <div className="ph" style={{ width: "100%", height: "100%" }}>{p.code}</div>
                  )}
                </div>
                <div className="col sf-info">
                  <div className="col" style={{ gap: 4 }}>
                    <div className="sf-title">{p.title}</div>
                    <div className="sf-price">{formatPrice(p.price, p.currency)}</div>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {variantsText && <span className="tag">{variantsText}</span>}
                      {typeof p.stock === "number" && p.stock > 0 && (
                        <span className={p.stock <= 2 ? "tag acc" : "tag"}>
                          {p.stock <= 2 ? `Only ${p.stock} left` : `${p.stock} in stock`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 10, alignItems: "center" }}>
                    <span className="btn sm" style={{ padding: "8px 16px", fontSize: 11, width: "auto" }}>Order</span>
                    <span className="sf-refcode">{ref}</span>
                  </div>
                </div>
              </Link>
            );
          })}

          {soldOut.map((p) => (
            <div key={p.code} className="sf-row sf-row-sold">
              <div className="sf-thumb">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" />
                ) : (
                  <div className="ph" style={{ width: "100%", height: "100%" }}>{p.code}</div>
                )}
              </div>
              <div className="col sf-info">
                <div className="sf-title">{p.title}</div>
                <div className="sf-price">{formatPrice(p.price, p.currency)}</div>
                <span className="tag">Sold out</span>
              </div>
            </div>
          ))}
        </div>

        <div className="col" style={{ gap: 10, padding: 16 }}>
          <a href={askLink} className="btn sec" target="_blank" rel="noopener noreferrer">
            Ask a question on WhatsApp
          </a>
          <div className="k" style={{ letterSpacing: "0.1em" }}>
            {shop.brandKit.shopName} · {shop.contact.whatsapp}
            {shop.contact.area ? ` · ${shop.contact.area}` : ""}
          </div>
          <div className="p" style={{ fontSize: 12 }}>
            You pay the rider on delivery, or send MoMo to {shop.brandKit.shopName.split(/\s+/)[0]}.
          </div>
        </div>
      </section>

      <style>{`
        .storefront {
          max-width: 960px;
          margin: 0 auto;
          padding: 24px;
        }
        .sf-mobile {
          background: #fff;
          border: 1px solid var(--stroke-soft);
          border-radius: 12px;
          overflow: hidden;
        }
        .sf-mobile-header {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 16px 14px;
          border-bottom: 1px solid var(--stroke-soft);
        }
        .sf-logo {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid var(--stroke-soft);
          flex: none;
        }
        .sf-shopname {
          font: 800 18px/1 "DM Sans", sans-serif;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }
        .sf-band {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--stroke-hair);
        }
        .sf-row {
          display: grid;
          grid-template-columns: 104px 1fr;
          gap: 14px;
          padding: 14px;
          border-bottom: 1px solid var(--stroke-hair);
          color: var(--color-text);
          transition: background 0.15s ease;
        }
        .sf-row:hover { background: var(--color-surface); }
        .sf-row:last-child { border-bottom: 0; }
        .sf-row-sold {
          opacity: 0.45;
          pointer-events: none;
        }
        .sf-thumb {
          width: 104px;
          height: 104px;
          border: 1px solid var(--stroke-hair);
          border-radius: 6px;
          overflow: hidden;
          background: var(--color-surface);
        }
        .sf-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .sf-info {
          gap: 8px;
          justify-content: space-between;
        }
        .sf-title {
          font: 800 15px/1.15 "DM Sans", sans-serif;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }
        .sf-price {
          font: 800 20px/1 "DM Sans", sans-serif;
          letter-spacing: -0.02em;
        }
        .sf-refcode {
          font: 700 10px/1 ui-monospace, Menlo, monospace;
          letter-spacing: 0.12em;
          color: var(--color-mute-2);
        }

        /* Desktop grid (screen 1c) */
        @media (min-width: 720px) {
          .storefront { padding: 40px 24px; }
          .sf-mobile-header {
            padding: 22px 24px;
          }
          .sf-band {
            padding: 12px 24px;
          }
          .sf-row {
            grid-template-columns: 1fr;
            padding: 0;
            border-bottom: none;
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .sf-mobile > .col {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: var(--stroke-hair);
            padding: 1px;
          }
          .sf-row, .sf-row-sold {
            background: #fff;
            display: flex;
            flex-direction: column;
          }
          .sf-thumb {
            width: 100%;
            height: 240px;
            border: 0;
            border-radius: 0;
          }
          .sf-info {
            padding: 14px 18px 18px;
            gap: 10px;
          }
        }
      `}</style>
    </main>
  );
}
