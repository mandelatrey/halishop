import Link from "next/link";
import type { Shop, VendorPublic } from "@/lib/types";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function sinceLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function Avatar({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="by-avatar" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="by-avatar by-avatar-ph" style={{ width: size, height: size }} aria-hidden>
      {initials(name)}
    </span>
  );
}

/**
 * "Who you're buying from" — compact card on the storefront linking to the
 * full About page. Shows the owner when the shop opts in, else the shop.
 */
export default function SellerCard({ shop, owner }: { shop: Shop; owner: VendorPublic | null }) {
  const about = shop.about ?? {};
  const blurb = about.tagline || about.description;
  return (
    <section className="panel by-seller" aria-label="About the seller">
      <div className="by-seller-who">
        {owner ? (
          <Avatar name={owner.name} src={owner.avatar} />
        ) : shop.brandKit.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.brandKit.logo} alt="" className="by-avatar" />
        ) : (
          <Avatar name={shop.brandKit.shopName} />
        )}
        <div className="by-seller-text">
          <span className="by-label">You&rsquo;re buying from</span>
          <strong>{owner ? `${owner.name} · ${shop.brandKit.shopName}` : shop.brandKit.shopName}</strong>
          {blurb && <p>{blurb}</p>}
        </div>
      </div>
      <Link href={`/shop/${shop.slug}/about`} className="btn sec by-seller-link">
        About this seller <span className="arrow" aria-hidden>→</span>
      </Link>
    </section>
  );
}
