import Link from "next/link";
import { getProduct, getShop, listCustomTemplates } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import CardGeneratorClient from "./Client";

export default async function CardGeneratorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const slug = getShopSlug();
  const [shop, product, customs] = await Promise.all([
    getShop(slug),
    getProduct(slug, code),
    listCustomTemplates(slug),
  ]);

  if (!product) {
    return (
      <main className="page">
        <p>No product with code {code}.</p>
        <Link href="/products">Back to products</Link>
      </main>
    );
  }

  return (
    <CardGeneratorClient product={product} brand={shop.brandKit} customs={customs} />
  );
}
