import { redirect } from "next/navigation";
import Link from "next/link";
import PasswordForm from "@/components/PasswordForm";
import { getCurrentUser, safeNext } from "@/lib/auth";

export const metadata = { title: "Change password · Haali" };

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Not requireUser: it would send someone on a temporary password straight back here.
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account/password")}`);
  const temporary = !!user.mustChangePassword;
  return (
    <main className="st-auth">
      <section className="panel st-card">
        <span className="pill">Your account</span>
        <h1 className="st-h1">{temporary ? "Choose your password" : "Change password"}</h1>
        <p className="st-lede">
          {temporary
            ? "You signed in with a temporary password from the Haali team. Choose your own to carry on."
            : "Your other devices will be signed out."}
        </p>
        <PasswordForm temporary={temporary} next={next ? safeNext(next, "/account") : undefined} />
      </section>
      {!temporary && (
        <p className="st-note">
          <Link href="/account">Back to your account</Link>
        </p>
      )}
    </main>
  );
}
