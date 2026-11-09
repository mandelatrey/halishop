import { requireOwnedShop } from "@/lib/auth/session";
import { listProducts } from "@/lib/server-store";
import ProductsClient from "./Client";

export default async function ProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOwnedShop(slug);
  const products = await listProducts(slug);
  return <ProductsClient initialProducts={products} />;
}
