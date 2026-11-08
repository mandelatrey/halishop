import Storefront from "@/components/Storefront";
import { getShop, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";

/**
 * Home = the storefront for the single shop this deployment serves.
 * Multi-tenant URLs (`/shop/[slug]`) still work; this is just the canonical
 * front door.
 */
export default async function Home() {
  const slug = getShopSlug();
  const [shop, products] = await Promise.all([getShop(slug), listProducts(slug)]);
  return <Storefront shop={shop} products={products} slug={slug} />;
}
