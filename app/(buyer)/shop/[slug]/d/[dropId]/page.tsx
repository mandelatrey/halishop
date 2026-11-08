import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrop, getShop, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import { formatPrice } from "@/lib/format";

export default async function BuyerDropPage({
  params,
}: {
  params: Promise<{ slug: string; dropId: string }>;
}) {
  const { slug, dropId } = await params;
  if (slug !== getShopSlug()) notFound();

  const [shop, drop, products] = await Promise.all([
    getShop(slug),
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
    <main className="storefront">
      <section className="sf-mobile">
        <div className="drop-banner">
          <div className="drop-title">{drop.name.toUpperCase()}</div>
          <div className="drop-meta">{expiryText}</div>
        </div>

        <div className="col">
          {dropProducts.map((p) => {
            const variantsText = (p.variants ?? []).join(" ");
            return (
              <Link
                key={p.code}
                href={`/shop/${slug}/${p.code}`}
                className="dp-row"
              >
                <div className="dp-thumb">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" />
                  ) : (
                    <div className="ph" style={{ width: "100%", height: "100%" }}>{p.code}</div>
                  )}
                </div>
                <div className="col dp-info">
                  <div className="col" style={{ gap: 4 }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                      <div className="dp-title">{p.title}</div>
                      <span className="dp-refcode">{p.code}</span>
                    </div>
                    <div className="dp-price">{formatPrice(p.price, p.currency)}</div>
                    {variantsText && <span className="tag" style={{ alignSelf: "flex-start" }}>{variantsText}</span>}
                    {typeof p.stock === "number" && p.stock <= 2 && p.stock > 0 && (
                      <span className="tag acc" style={{ alignSelf: "flex-start" }}>Only {p.stock} left</span>
                    )}
                  </div>
                  <span className="btn" style={{ display: "block", textAlign: "center" }}>
                    Order this
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="col" style={{ gap: 10, padding: 16 }}>
          <Link href={`/shop/${slug}`} className="btn sec" style={{ display: "block", textAlign: "center" }}>
            See all items in the shop
          </Link>
          <div className="p" style={{ fontSize: 12 }}>
            This page comes off with the status. The shop link — {shop.brandKit.shopUrl} — stays.
          </div>
        </div>
      </section>

      <style>{`
        .storefront {
          max-width: 480px;
          margin: 0 auto;
          padding: 24px;
        }
        @media (min-width: 720px) { .storefront { max-width: 560px; padding: 40px 24px; } }
        .sf-mobile {
          background: #fff;
          border: 1px solid var(--stroke-soft);
          border-radius: 12px;
          overflow: hidden;
        }
        .drop-banner {
          background: var(--color-accent);
          color: #fff;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .drop-title {
          font: 800 26px/1 "DM Sans", sans-serif;
          letter-spacing: -0.025em;
        }
        .drop-meta {
          font: 700 10px/1.4 ui-monospace, Menlo, monospace;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.9;
        }
        .dp-row {
          display: grid;
          grid-template-columns: 118px 1fr;
          gap: 14px;
          padding: 14px;
          border-bottom: 1px solid var(--stroke-hair);
          color: var(--color-text);
          transition: background 0.15s ease;
        }
        .dp-row:hover { background: var(--color-surface); }
        .dp-row:last-child { border-bottom: 0; }
        .dp-thumb {
          width: 118px;
          height: 158px;
          border: 1px solid var(--stroke-hair);
          border-radius: 6px;
          overflow: hidden;
          background: var(--color-surface);
        }
        .dp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .dp-info { justify-content: space-between; gap: 9px; }
        .dp-title {
          font: 800 15px/1.15 "DM Sans", sans-serif;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }
        .dp-price {
          font: 800 18px/1 "DM Sans", sans-serif;
          letter-spacing: -0.02em;
        }
        .dp-refcode {
          font: 700 10px/1 ui-monospace, Menlo, monospace;
          letter-spacing: 0.12em;
          color: var(--color-mute-2);
        }
      `}</style>
    </main>
  );
}
