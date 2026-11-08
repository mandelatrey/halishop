import { listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import ProductsClient from "./Client";

export default async function ProductsPage() {
  const products = await listProducts(getShopSlug());
  return <ProductsClient initialProducts={products} />;
}
