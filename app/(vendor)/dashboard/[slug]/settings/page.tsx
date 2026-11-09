import { requireOwnedShop } from "@/lib/auth/session";
import { shopPath } from "@/lib/paths";
import SettingsClient from "./Client";

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { shop } = await requireOwnedShop(slug);
  return (
    <SettingsClient
      initialContact={shop.contact}
      initialAbout={shop.about ?? { showOwner: true }}
      shopName={shop.brandKit.shopName}
      shopPath={shopPath(slug)}
      brandKitWhatsapp={shop.brandKit.whatsapp}
    />
  );
}
