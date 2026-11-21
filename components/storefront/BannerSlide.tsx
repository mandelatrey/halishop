import type { CSSProperties } from "react";
import ProductPhoto from "@/components/ProductPhoto";
import { bestForeground } from "@/lib/palette";
import type { BannerTarget } from "@/lib/storefront";
import type { Banner, Product } from "@/lib/types";
import "./storefront.css";

/**
 * One slide of the storefront carousel. Presentational only (no hooks), so the
 * buyer page renders it on the server and the editor reuses it for the live
 * preview. Filter and "ask" buttons are plain links carrying `data-shop-*`
 * attributes; <ShopBrowse> picks those clicks up (and without JS the links
 * still work: `?c=` reloads filtered, wa.me opens WhatsApp).
 */

function Cta({
  target,
  askHref,
  className,
  ariaLabel,
  children,
}: {
  target: BannerTarget;
  askHref: string;
  className: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}) {
  const body = children;
  if (target.kind === "filter") {
    return (
      <a href={`?c=${target.filter}#shop-items`} data-shop-filter={target.filter} className={className} aria-label={ariaLabel}>
        {body}
      </a>
    );
  }
  if (target.kind === "ask") {
    return (
      <a href={askHref} data-shop-ask="" className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  }
  return (
    <a
      href={target.href}
      className={className}
      aria-label={ariaLabel}
      {...(target.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {body}
    </a>
  );
}

export function BannerSlide({
  banner,
  target,
  askHref,
  shopName,
  first,
}: {
  banner: Banner;
  /** Resolved button target, or null for no button. */
  target: BannerTarget | null;
  /** wa.me fallback for "ask" buttons without JS. */
  askHref: string;
  shopName: string;
  /** First slide loads eagerly. */
  first?: boolean;
}) {
  const hasText = !!(banner.eyebrow || banner.headline || banner.subline);
  const showCta = !!(target && banner.cta?.trim());

  return (
    <div className={`by-slide tone-${banner.tone}${hasText ? " has-text" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.image}
        alt={hasText ? "" : `${shopName} banner`}
        className="by-slide-img"
        style={{ objectPosition: `${banner.focusX}% ${banner.focusY}%` }}
        loading={first ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
      {(hasText || showCta) && (
        <div className="by-slide-copy">
          {banner.eyebrow && <span className="by-slide-eyebrow">{banner.eyebrow}</span>}
          {banner.headline && <h2 className="by-slide-h">{banner.headline}</h2>}
          {banner.subline && <p className="by-slide-sub">{banner.subline}</p>}
          {showCta && target && (
            <Cta target={target} askHref={askHref} className="by-slide-cta">
              {banner.cta} <span className="arrow" aria-hidden>→</span>
            </Cta>
          )}
        </div>
      )}
      {/* Image-only banner with a link: the whole slide is the button. */}
      {target && !showCta && (
        <Cta
          target={target}
          askHref={askHref}
          className="by-slide-cover"
          ariaLabel={banner.headline || `Open ${shopName} banner`}
        />
      )}
    </div>
  );
}

/**
 * Shown until the seller adds banners: the shop name on their brand colour,
 * with a fan of real product photos on the right.
 */
export function BrandSlide({
  shopName,
  primary,
  eyebrow,
  lede,
  dropHref,
  photos,
}: {
  shopName: string;
  primary: string;
  eyebrow?: string;
  lede: string;
  dropHref?: string;
  photos: Pick<Product, "code" | "image" | "imageMeta" | "imageFit">[];
}) {
  const fg = bestForeground(primary, "#ffffff", "#14161a");
  const tone = fg === "#ffffff" ? "light" : "dark";
  return (
    <div
      className={`by-slide by-slide-brand tone-${tone}`}
      style={{ "--brand-bg": primary, "--brand-fg": fg } as CSSProperties}
    >
      <div className="by-slide-copy">
        {eyebrow && <span className="by-slide-eyebrow">{eyebrow}</span>}
        <h2 className="by-slide-h">{shopName}</h2>
        <p className="by-slide-sub">{lede}</p>
        {dropHref && (
          <a href={dropHref} className="by-slide-cta">
            See today&rsquo;s drop <span className="arrow" aria-hidden>→</span>
          </a>
        )}
      </div>
      {photos.length > 0 && (
        <div className="by-slide-fan" aria-hidden>
          {photos.slice(0, 3).map((p) => (
            <div key={p.code} className="by-slide-fan-card">
              <ProductPhoto src={p.image} meta={p.imageMeta} fit={p.imageFit} label={p.code} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
