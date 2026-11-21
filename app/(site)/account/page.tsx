import Link from "next/link";
import { BuyerOrder } from "@/components/Orders";
import ShopCardView from "@/components/ShopCardView";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { listOrdersForUser, listShopCards, shopNames } from "@/lib/server-store";
import { prettyPhone } from "@/lib/wa";

export const metadata = { title: "Your account · Haali" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const user = await requireUser("/account");
  const { password } = await searchParams;
  const [orders, favorites] = await Promise.all([
    listOrdersForUser(user.id),
    user.favorites.length ? listShopCards(user.favorites) : Promise.resolve([]),
  ]);
  const names = await shopNames(orders.map((o) => o.shopSlug));

  return (
    <main className="page st-page">
      <header className="pg-head">
        <div>
          <span className="pill">Your account</span>
          <h1>Hi {user.name.split(/\s+/)[0]}</h1>
          <p className="subtitle">Signed in as {prettyPhone(user.phone)}.</p>
          {password === "changed" && (
            <p className="st-done" role="status">
              Password changed. Your other devices have been signed out.
            </p>
          )}
        </div>
        <div className="pg-head-actions">
          {user.shopSlug ? (
            <Link href="/orders" className="btn sec">
              Your shop&rsquo;s orders
            </Link>
          ) : (
            <Link href="/seller/setup" className="btn sec">
              Open a shop
            </Link>
          )}
          {user.role === "admin" && (
            <Link href="/admin" className="btn sec">
              Admin
            </Link>
          )}
          <Link href="/account/password" className="btn gh">
            Change password
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn gh">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="st-section" id="orders">
        <h2 className="section-title">My orders</h2>
        {orders.length === 0 ? (
          <p className="st-empty">
            Orders you send while signed in show up here, with what the seller has done with them.{" "}
            <Link href="/shops">Find a shop →</Link>
          </p>
        ) : (
          <div className="st-orders">
            {orders.map((o) => (
              <BuyerOrder key={o.id} order={o} shopName={names[o.shopSlug] ?? o.shopSlug} />
            ))}
          </div>
        )}
      </section>

      <section className="st-section" id="favourites">
        <h2 className="section-title">Favourite shops</h2>
        {favorites.length === 0 ? (
          <p className="st-empty">
            Tap <b>Save</b> on a shop to keep it here. <Link href="/shops">Browse shops →</Link>
          </p>
        ) : (
          <div className="st-shops">
            {favorites.map((s) => (
              <ShopCardView key={s.slug} shop={s} favorite />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
