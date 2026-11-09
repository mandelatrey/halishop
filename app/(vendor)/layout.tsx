import "./admin.css";
import AppNav from "@/components/AppNav";
import { requireVendor } from "@/lib/auth/session";
import { listShopsForOwner } from "@/lib/server-store";

// Vendor pages are per-user and read from MongoDB; never prerender.
export const dynamic = "force-dynamic";

/** Everything under /dashboard requires a signed-in vendor. */
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const vendor = await requireVendor("/dashboard");
  const shops = await listShopsForOwner(vendor.id);
  return (
    <>
      <AppNav
        vendor={{ name: vendor.name, email: vendor.email, avatar: vendor.avatar }}
        shops={shops.map((s) => ({ slug: s.slug, name: s.brandKit.shopName }))}
      />
      {children}
    </>
  );
}
