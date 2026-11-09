import { getShop } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import BrandKitClient from "./Client";

export default async function BrandKitPage() {
  const shop = await getShop(getShopSlug());
  return <BrandKitClient initialBrand={shop.brandKit} orderNumber={shop.contact.whatsapp} />;
}
