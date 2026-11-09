import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "../AuthForm";
import { AUTH_ERRORS } from "../messages";
import { googleEnabled } from "@/lib/auth/google";
import { safeNext } from "@/lib/auth/next";
import { getCurrentVendor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Log in — Haali" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next) ?? undefined;
  if (await getCurrentVendor()) redirect(next ?? "/dashboard");
  return (
    <AuthForm
      mode="login"
      next={next}
      googleEnabled={googleEnabled()}
      notice={sp.error ? AUTH_ERRORS[sp.error] : undefined}
    />
  );
}
