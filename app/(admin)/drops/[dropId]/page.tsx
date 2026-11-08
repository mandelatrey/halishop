import Link from "next/link";
import { getDrop, getShop, listCustomTemplates, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import DropOutputClient from "./Client";

export default async function DropOutputPage({ params }: { params: Promise<{ dropId: string }> }) {
  const { dropId } = await params;
  const slug = getShopSlug();
  const [shop, drop, products, customs] = await Promise.all([
    getShop(slug),
    getDrop(slug, dropId),
    listProducts(slug),
    listCustomTemplates(slug),
  ]);

  if (!drop) {
    return (
      <main className="page">
        <p>Drop not found.</p>
        <Link href="/drops/new">← New drop</Link>
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
