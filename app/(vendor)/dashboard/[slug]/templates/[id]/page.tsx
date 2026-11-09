import Link from "next/link";
import { requireOwnedShop } from "@/lib/auth/session";
import { dashPath } from "@/lib/paths";
import { getCustomTemplate, listProducts } from "@/lib/server-store";
import TemplateEditorClient from "./Client";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { shop } = await requireOwnedShop(slug);
  const [template, products] = await Promise.all([getCustomTemplate(slug, id), listProducts(slug)]);

  if (!template) {
    return (
      <main className="page">
        <p>Template not found.</p>
        <Link href={dashPath(slug, "/templates")}>Back</Link>
      </main>
    );
  }

  return <TemplateEditorClient initial={template} brand={shop.brandKit} products={products} />;
}
