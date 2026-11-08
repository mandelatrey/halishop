import { getShop, listCustomTemplates, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import NewDropClient from "./Client";

export default async function NewDropPage() {
  const slug = getShopSlug();
  const [shop, products, customs] = await Promise.all([
    getShop(slug),
    listProducts(slug),
    listCustomTemplates(slug),
  ]);
  return <NewDropClient brand={shop.brandKit} products={products} customs={customs} />;
}
