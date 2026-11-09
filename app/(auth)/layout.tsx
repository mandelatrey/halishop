import "../(vendor)/admin.css";
import "./auth.css";
import AppNav from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main className="au-wrap">{children}</main>
    </>
  );
}
