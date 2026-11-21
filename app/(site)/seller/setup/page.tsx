import { redirect } from "next/navigation";
import { ClaimShopButton, ShopSetupForm } from "@/components/ShopSetupForm";
import { requireUser } from "@/lib/auth";
import { listClaimableShops } from "@/lib/server-store";
import { prettyPhone } from "@/lib/wa";

export default async function SellerSetupPage() {
  const user = await requireUser("/seller/setup");
  if (user.shopSlug) redirect("/orders");
  const claimable = await listClaimableShops(user.phone);
  const host = process.env.NEXT_PUBLIC_APP_HOST || "shop.app";

  return (
    <main className="st-auth">
      {claimable.length > 0 && (
        <section className="panel st-card">
          <span className="pill">Your shop</span>
          <h1 className="st-h1">Is this your shop?</h1>
          <p className="st-lede">
            {claimable.length === 1 ? "This shop takes" : "These shops take"} orders on {prettyPhone(user.phone)} — the number you signed up with.
          </p>
          {claimable.map((s) => (
            <ClaimShopButton key={s.slug} slug={s.slug} name={s.name} />
          ))}
        </section>
      )}
      <section className="panel st-card">
        <span className="pill">Sell on Haali</span>
        <h1 className="st-h1">{claimable.length ? "Or start a new shop" : "Set up your shop"}</h1>
        <p className="st-lede">You can change all of this later in Settings and Brand kit.</p>
        <ShopSetupForm phone={user.phone} host={host} />
      </section>
    </main>
  );
}
