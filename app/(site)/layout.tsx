import "./site.css";

// Accounts, the shops directory and the buyer's account read the session; never prerender.
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="st-scope">{children}</div>;
}
