import { notFound } from "next/navigation";
import Storefront from "@/components/Storefront";
import TrackView from "@/components/TrackView";
import { getShopDoc, getShopOwnerPublic, listDropsForShop, listProducts } from "@/lib/server-store";
import type { Drop } from "@/lib/types";

/** Is this drop still "up" by its own expiry rule? */
function isLive(drop: Drop, now = Date.now()): boolean {
  if (drop.expiry.kind === "never") return true;
  if (drop.expiry.kind === "hours") return now - drop.postedAt < drop.expiry.hours * 3_600_000;
  return new Date(drop.postedAt).toDateString() === new Date(now).toDateString();
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShopDoc(slug);
  if (!shop) notFound();

  const [products, drops, owner] = await Promise.all([
    listProducts(slug),
    listDropsForShop(slug, 1),
    getShopOwnerPublic(shop),
  ]);
  const latest = drops[0];
  const dropHref = latest && isLive(latest) ? `/shop/${slug}/d/${latest.id}` : undefined;

  return (
    <>
      <TrackView slug={slug} type="shop_view" />
      <Storefront
        shop={shop}
        products={products}
        slug={slug}
        dropHref={dropHref}
        owner={shop.about?.showOwner === false ? null : owner}
      />
    </>
  );
}
