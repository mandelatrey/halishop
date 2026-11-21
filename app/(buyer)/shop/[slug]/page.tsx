import { notFound } from "next/navigation";
import Storefront from "@/components/Storefront";
import { getShop, getStorefront, listDropsForShop, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import { isDropLive, parseFilter } from "@/lib/storefront";

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const { slug } = await params;
  if (slug !== getShopSlug()) notFound();
  const { c } = await searchParams;

  const [shop, products, drops, storefront] = await Promise.all([
    getShop(slug),
    listProducts(slug),
    listDropsForShop(slug, 1),
    getStorefront(slug),
  ]);
  const latest = drops[0];
  const dropHref = latest && isDropLive(latest) ? `/shop/${slug}/d/${latest.id}` : undefined;

  return (
    <Storefront
      shop={shop}
      products={products}
      slug={slug}
      dropHref={dropHref}
      storefront={storefront}
      initialFilter={parseFilter(Array.isArray(c) ? c[0] : c)}
    />
  );
}
