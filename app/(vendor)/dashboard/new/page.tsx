import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { requireVendor } from "@/lib/auth/session";
import { appHost } from "@/lib/paths";
import { listShopsForOwner } from "@/lib/server-store";
import NewShopForm from "./NewShopForm";

export const metadata: Metadata = { title: "New shop — Haali" };

export default async function NewShopPage() {
  const vendor = await requireVendor("/dashboard/new");
  const shops = await listShopsForOwner(vendor.id);
  // Pre-fill the order number from their latest shop — most hustles share one phone.
  const lastNumber = shops.at(-1)?.contact.whatsapp ?? "";
  return (
    <main className="page ad-page">
      <PageHeader
        label={shops.length ? "Another hustle" : "First shop"}
        title="Open a"
        soft="new shop."
        subtitle="Each shop gets its own link, catalogue, brand kit and WhatsApp number. Buyers only ever see the shop you send them to."
      />
      <NewShopForm host={appHost()} defaultWhatsapp={lastNumber} />
    </main>
  );
}
