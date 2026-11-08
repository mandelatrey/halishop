import "./admin.css";

// All admin pages read from MongoDB; skip prerender. The global hamburger
// menu lives in the root layout, so this group just carries the dynamic flag.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
