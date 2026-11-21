import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ShopCard } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";

/** A shop in the directory / favourites: photos, name, city, what's in stock. */
export default function ShopCardView({ shop, favorite }: { shop: ShopCard; favorite: boolean | null }) {
  return (
    <article className="st-shop">
      <Link href={`/shop/${shop.slug}`} className="st-shop-link" aria-label={`Open ${shop.name}`}>
        <div className="st-shop-photos" style={{ background: shop.primary }}>
          {shop.photos.length > 0 ? (
            shop.photos.map((code) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={code} src={`/shop/${shop.slug}/${code}/photo`} alt="" loading="lazy" />
            ))
          ) : (
            <span className="st-shop-empty">{shop.inStock ? `${shop.inStock} items` : "Nothing in stock yet"}</span>
          )}
        </div>
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
            <p>
              {[shop.city, `${shop.inStock} in stock`, shop.from && `from ${formatPrice(shop.from.price, shop.from.currency)}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </Link>
      <div className="st-shop-fav">
        <FavoriteButton slug={shop.slug} favorite={favorite} />
      </div>
    </article>
  );
}
