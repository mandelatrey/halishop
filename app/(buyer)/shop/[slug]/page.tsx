import { notFound } from "next/navigation";
import Storefront from "@/components/Storefront";
import { getShop, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== getShopSlug()) notFound();

  const [shop, products] = await Promise.all([getShop(slug), listProducts(slug)]);
  return <Storefront shop={shop} products={products} slug={slug} />;
}
