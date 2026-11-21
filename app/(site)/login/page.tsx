import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser, safeNext } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next, user.shopSlug ? "/orders" : "/account"));
  return (
    <main className="st-auth">
      <section className="panel st-card">
        <span className="pill">Haali</span>
        <h1 className="st-h1">Sign in</h1>
        <p className="st-lede">With the WhatsApp number you signed up with.</p>
        <AuthForm mode="login" next={next} />
      </section>
      <p className="st-note">Forgot your password? Resetting it by text message isn&rsquo;t available yet — contact the Haali team.</p>
    </main>
  );
}
