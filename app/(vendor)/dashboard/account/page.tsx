import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { googleEnabled } from "@/lib/auth/google";
import { requireVendor } from "@/lib/auth/session";
import AccountClient from "./Client";

export const metadata: Metadata = { title: "Account — Haali" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ linked?: string }> }) {
  const vendor = await requireVendor("/dashboard/account");
  const { linked } = await searchParams;
  return (
    <main className="page ad-page">
      <PageHeader
        label="Account"
        title="Your"
        soft="profile."
        subtitle="Buyers see your name, photo and bio on the About page of any shop where you've chosen to show them."
      />
      <AccountClient
        vendor={{
          name: vendor.name,
          email: vendor.email,
          bio: vendor.bio,
          avatar: vendor.avatar,
          hasPassword: vendor.hasPassword,
          hasGoogle: vendor.hasGoogle,
        }}
        googleEnabled={googleEnabled()}
        justLinked={linked === "google"}
      />
    </main>
  );
}
