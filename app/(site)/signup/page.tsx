import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser, safeNext } from "@/lib/auth";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next, user.shopSlug ? "/orders" : "/account"));
  return (
    <main className="st-auth">
      <section className="panel st-card">
        <span className="pill">Haali</span>
        <h1 className="st-h1">Create your account</h1>
        <p className="st-lede">Shop from sellers you follow, or open your own shop. Browsing needs no account.</p>
        <AuthForm mode="signup" next={next} role={as === "seller" ? "seller" : "buyer"} />
      </section>
    </main>
  );
}
