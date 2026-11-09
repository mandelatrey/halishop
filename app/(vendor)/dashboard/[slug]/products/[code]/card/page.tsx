import Link from "next/link";
import { requireOwnedShop } from "@/lib/auth/session";
import { dashPath } from "@/lib/paths";
import { getProduct, listCustomTemplates } from "@/lib/server-store";
import CardGeneratorClient from "./Client";

export default async function CardGeneratorPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const { shop } = await requireOwnedShop(slug);
  const [product, customs] = await Promise.all([getProduct(slug, code), listCustomTemplates(slug)]);

  if (!product) {
    return (
      <main className="page">
        <p>No product with code {code}.</p>
        <Link href={dashPath(slug, "/products")}>Back to products</Link>
      </main>
    );
  }

  return <CardGeneratorClient product={product} brand={shop.brandKit} customs={customs} />;
}
