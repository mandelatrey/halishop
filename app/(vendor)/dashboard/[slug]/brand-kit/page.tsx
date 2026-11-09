import { requireOwnedShop } from "@/lib/auth/session";
import BrandKitClient from "./Client";

export default async function BrandKitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { shop } = await requireOwnedShop(slug);
  return <BrandKitClient initialBrand={shop.brandKit} orderNumber={shop.contact.whatsapp} />;
}
