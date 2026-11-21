import { getShop } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import SettingsClient from "./Client";

export default async function SettingsPage() {
  const slug = await getShopSlug();
  const shop = await getShop(slug);
  return (
    <SettingsClient
      initialContact={shop.contact}
      shopName={shop.brandKit.shopName}
      shopPath={`/shop/${slug}`}
      brandKitWhatsapp={shop.brandKit.whatsapp}
    />
  );
}
