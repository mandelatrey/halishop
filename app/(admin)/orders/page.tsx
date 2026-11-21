import PageHeader from "@/components/PageHeader";
import { SellerOrders } from "@/components/Orders";
import { getShopSlug } from "@/lib/actions/_slug";
import { getShop, listOrdersForShop } from "@/lib/server-store";
import "../../(site)/site.css";

export default async function OrdersPage() {
  const slug = await getShopSlug();
  const [shop, orders] = await Promise.all([getShop(slug), listOrdersForShop(slug)]);
  return (
    <main className="page ad-page st-scope">
      <PageHeader
        label="Orders"
        title="Orders"
        subtitle="Every order buyers send from your shop. The conversation happens in WhatsApp — mark each one as it moves along, and buyers with an account see it."
      />
      <SellerOrders orders={orders} shopName={shop.brandKit.shopName.trim()} />
    </main>
  );
}
