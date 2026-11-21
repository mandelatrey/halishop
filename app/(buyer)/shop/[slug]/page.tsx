import { notFound } from "next/navigation";
import Storefront from "@/components/Storefront";
import { findShop, getStorefront, listDropsForShop, listProducts } from "@/lib/server-store";
import { isDropLive, parseFilter } from "@/lib/storefront";
import { getCurrentUser } from "@/lib/auth";

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const { slug } = await params;
  const { c } = await searchParams;

  const [shop, products, drops, storefront, user] = await Promise.all([
    findShop(slug),
    listProducts(slug),
    listDropsForShop(slug, 1),
    getStorefront(slug),
    getCurrentUser(),
  ]);
  if (!shop) notFound();
  const latest = drops[0];
  const dropHref = latest && isDropLive(latest) ? `/shop/${slug}/d/${latest.id}` : undefined;

  return (
    <Storefront
      shop={shop}
      products={products}
      slug={slug}
      dropHref={dropHref}
      storefront={storefront}
      favorite={user ? user.favorites.includes(slug) : null}
      accountPhone={user?.phone}
      initialFilter={parseFilter(Array.isArray(c) ? c[0] : c)}
    />
  );
}
