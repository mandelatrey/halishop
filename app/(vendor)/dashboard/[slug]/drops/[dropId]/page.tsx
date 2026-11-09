import Link from "next/link";
import { requireOwnedShop } from "@/lib/auth/session";
import { dashPath } from "@/lib/paths";
import { getDrop, listCustomTemplates, listProducts } from "@/lib/server-store";
import DropOutputClient from "./Client";

export default async function DropOutputPage({
  params,
}: {
  params: Promise<{ slug: string; dropId: string }>;
}) {
  const { slug, dropId } = await params;
  const { shop } = await requireOwnedShop(slug);
  const [drop, products, customs] = await Promise.all([
    getDrop(slug, dropId),
    listProducts(slug),
    listCustomTemplates(slug),
  ]);

  if (!drop) {
    return (
      <main className="page">
        <p>Drop not found.</p>
        <Link href={dashPath(slug, "/drops/new")}>← New drop</Link>
      </main>
    );
  }

  // Only pass products referenced by the drop (in the drop's order).
  const productsByCode = new Map(products.map((p) => [p.code, p]));
  const dropProducts = drop.items
    .map((it) => productsByCode.get(it.code))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <DropOutputClient
      shop={shop}
      drop={drop}
      products={dropProducts}
      customs={customs}
    />
  );
}
