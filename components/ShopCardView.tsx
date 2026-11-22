import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { ShopCard } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";
import ProductPhoto from "./ProductPhoto";

/** A shop in the directory / favourites: photos, name, city, what's in stock. */
export default function ShopCardView({ shop, favorite }: { shop: ShopCard; favorite: boolean | null }) {
  return (
    <article className="st-shop">
      <Link href={`/shop/${shop.slug}`} className="st-shop-link" aria-label={`Open ${shop.name}`}>
        {shop.photos.length > 0 ? (
          // One big photo and two small ones (or two halves, or one), edge to edge.
          <div className="st-shop-photos" data-n={shop.photos.length}>
            {shop.photos.map((p) => (
              <span key={p.code} className="st-shop-photo">
                <ProductPhoto src={`/shop/${shop.slug}/${p.code}/photo`} meta={p.meta} fit={p.fit} padding={0.1} />
              </span>
            ))}
          </div>
        ) : (
          <div className="st-shop-photos st-shop-empty" style={{ "--shop": shop.primary } as React.CSSProperties}>
            <ShoppingBag size={22} strokeWidth={1.6} aria-hidden />
            <span>{shop.inStock ? `${shop.inStock} ${shop.inStock === 1 ? "item" : "items"}, no photos yet` : "Nothing in stock yet"}</span>
          </div>
        )}
        <div className="st-shop-body">
          {shop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo} alt="" className="st-shop-logo" />
          ) : (
            <span className="st-shop-logo st-shop-mono" aria-hidden>
              {shop.name.slice(0, 1)}
            </span>
          )}
          <div className="st-shop-id">
            <h3>{shop.name}</h3>
            <p>{[shop.city, `${shop.inStock} in stock`].filter(Boolean).join(" · ")}</p>
            {shop.from && <p className="st-shop-from">from {formatPrice(shop.from.price, shop.from.currency)}</p>}
          </div>
        </div>
      </Link>
      <div className="st-shop-fav">
        <FavoriteButton slug={shop.slug} favorite={favorite} />
      </div>
    </article>
  );
}
