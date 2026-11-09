import "./buyer.css";

// All buyer pages read from MongoDB; skip prerender.
export const dynamic = "force-dynamic";

/**
 * Buyer chrome: just the shop. No Haali nav and no vendor tools — buyers
 * arrive from a seller's status and should only ever see that seller's shop.
 */
export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="buyer-scope">
      {children}
      <footer className="by-poweredby">
        Shop powered by <a href="/">Haali</a>
      </footer>
    </div>
  );
}
