import { requireOwnedShop } from "@/lib/auth/session";
import { listCustomTemplates, listProducts } from "@/lib/server-store";
import NewDropClient from "./Client";

export default async function NewDropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { shop } = await requireOwnedShop(slug);
  const [products, customs] = await Promise.all([listProducts(slug), listCustomTemplates(slug)]);
  return <NewDropClient brand={shop.brandKit} products={products} customs={customs} />;
}
