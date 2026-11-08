import Link from "next/link";
import { getCustomTemplate, getShop, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import TemplateEditorClient from "./Client";

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slug = getShopSlug();
  const [shop, template, products] = await Promise.all([
    getShop(slug),
    getCustomTemplate(slug, id),
    listProducts(slug),
  ]);

  if (!template) {
    return (
      <main className="page">
        <p>Template not found.</p>
        <Link href="/templates">Back</Link>
      </main>
    );
  }

  return (
    <TemplateEditorClient
      initial={template}
      brand={shop.brandKit}
      products={products}
    />
  );
}
