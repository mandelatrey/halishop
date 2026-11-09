import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AskWhatsApp from "@/components/AskWhatsApp";
import { Avatar, sinceLabel } from "@/components/SellerCard";
import TrackView from "@/components/TrackView";
import { getShopDoc, getShopOwnerPublic, listProducts } from "@/lib/server-store";
import { prettyPhone } from "@/lib/wa";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopDoc(slug);
  return shop ? { title: `About ${shop.brandKit.shopName}` } : {};
}

/** Buyer-facing "who am I buying from" page for one shop. */
export default async function ShopAboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShopDoc(slug);
  if (!shop) notFound();

  const about = shop.about ?? {};
  const [ownerRaw, products] = await Promise.all([getShopOwnerPublic(shop), listProducts(slug)]);
  const owner = about.showOwner === false ? null : ownerRaw;
  const inStock = products.filter((p) => !p.soldOut).length;
  const firstName = shop.brandKit.shopName.split(/\s+/)[0];
  const [nameHead, ...nameRest] = shop.brandKit.shopName.trim().split(/\s+/);

  const location = [shop.contact.area, shop.contact.city].filter(Boolean).join(", ");
  const details: { k: string; v: React.ReactNode }[] = [];
  if (location) details.push({ k: "Based in", v: location });
  if (shop.contact.cityCopy) details.push({ k: "Delivery", v: shop.contact.cityCopy.replace(/^./, (c) => c.toUpperCase()) });
  details.push({ k: "Payment", v: about.payment || `Pay the rider on delivery, or send MoMo to ${firstName}.` });
  if (about.hours) details.push({ k: "Hours", v: about.hours });
  details.push({ k: "WhatsApp", v: prettyPhone(shop.contact.whatsapp) });
  if (about.instagram)
    details.push({
      k: "Instagram",
      v: (
        <a href={`https://instagram.com/${encodeURIComponent(about.instagram)}`} target="_blank" rel="noopener noreferrer">
          @{about.instagram}
        </a>
      ),
    });
  if (about.tiktok)
    details.push({
      k: "TikTok",
      v: (
        <a href={`https://www.tiktok.com/@${encodeURIComponent(about.tiktok)}`} target="_blank" rel="noopener noreferrer">
          @{about.tiktok}
        </a>
      ),
    });
  details.push({ k: "On Haali since", v: sinceLabel(shop.createdAt) });

  return (
    <main className="by-wrap by-about">
      <TrackView slug={slug} type="about_view" />
      <Link href={`/shop/${slug}`} className="by-back">
        <span aria-hidden>←</span> Back to the shop
      </Link>

      <header className="by-hero">
        <div className="by-hero-top">
          {shop.brandKit.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.brandKit.logo} alt="" className="by-logo" />
          )}
          <span className="pill">About the shop</span>
        </div>
        <h1 className="by-h1">
          {nameHead}
          {nameRest.length > 0 && <span className="soft"> {nameRest.join(" ")}</span>}
        </h1>
        {about.tagline && <p className="by-tagline">{about.tagline}</p>}
        {about.description ? (
          <div className="by-about-desc">
            {about.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : (
          <p className="by-lede">
            {inStock} {inStock === 1 ? "item" : "items"} in stock right now. Orders go straight to {firstName}&rsquo;s
            WhatsApp.
          </p>
        )}
      </header>

      <div className="by-about-grid">
        <section className="panel">
          <h2 className="section-title">Shop details</h2>
          <dl className="by-dl">
            {details.map((d) => (
              <div key={d.k}>
                <dt className="by-label">{d.k}</dt>
                <dd>{d.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {owner && (
          <section className="panel by-owner">
            <h2 className="section-title">Who runs it</h2>
            <div className="by-seller-who">
              <Avatar name={owner.name} src={owner.avatar} size={56} />
              <div className="by-seller-text">
                <strong>{owner.name}</strong>
                <span className="by-label">Selling on Haali since {sinceLabel(owner.createdAt)}</span>
              </div>
            </div>
            {owner.bio && <p className="by-owner-bio">{owner.bio}</p>}
          </section>
        )}
      </div>

      <div className="by-ctas by-about-ctas">
        <Link href={`/shop/${slug}`} className="btn">
          Browse the shop <span className="arrow" aria-hidden>→</span>
        </Link>
        <AskWhatsApp
          number={shop.contact.whatsapp}
          shopName={shop.brandKit.shopName}
          area={shop.contact.area}
          trackSlug={slug}
        />
      </div>
    </main>
  );
}
