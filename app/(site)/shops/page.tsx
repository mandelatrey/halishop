import Link from "next/link";
import ShopCardView from "@/components/ShopCardView";
import ShopsDirectory from "@/components/ShopsDirectory";
import { getCurrentUser } from "@/lib/auth";
import { listShopCards } from "@/lib/server-store";

export const metadata = { title: "Shops on Haali" };

export default async function ShopsPage() {
  const [shops, user] = await Promise.all([listShopCards(), getCurrentUser()]);
  const cards = Object.fromEntries(
    shops.map((s) => [s.slug, <ShopCardView key={s.slug} shop={s} favorite={user ? user.favorites.includes(s.slug) : null} />])
  );
  return (
    <main className="page st-page">
      <header className="pg-head">
        <div>
          <span className="pill">Shops</span>
          <h1>Shops on Haali</h1>
          <p className="subtitle">
            Browse, then order in WhatsApp — no account needed.{" "}
            {user ? (
              <Link href="/account">Your orders and favourites →</Link>
            ) : (
              <>
                <Link href="/signup">Create an account</Link> to save shops and track your orders.
              </>
            )}
          </p>
        </div>
      </header>
      {shops.length === 0 ? (
        <p className="st-empty">No shops have anything in stock yet.</p>
      ) : (
        <ShopsDirectory shops={shops} cards={cards} />
      )}
    </main>
  );
}
