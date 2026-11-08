// All buyer pages read from MongoDB; skip prerender.
export const dynamic = "force-dynamic";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <div className="buyer-scope">{children}</div>;
}
