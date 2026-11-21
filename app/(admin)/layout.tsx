import "./admin.css";
import DropGuard from "@/components/DropGuard";
import { requireSeller } from "@/lib/auth";

// All admin pages read from MongoDB; skip prerender. The global hamburger
// menu lives in the root layout.
export const dynamic = "force-dynamic";

/** Seller pages: signed-in sellers with a shop only (every page and action also checks). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSeller();
  return (
    <>
      <DropGuard />
      {children}
    </>
  );
}
