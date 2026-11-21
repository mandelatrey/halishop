import "../(admin)/admin.css";
import "../(site)/site.css";
import "./staff.css";
import { requireAdmin } from "@/lib/auth";

// Haali team tools. Reads the session and the database on every request.
export const dynamic = "force-dynamic";

/** Admins only; everyone else gets a 404 (requireAdmin). */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="st-scope">{children}</div>;
}
