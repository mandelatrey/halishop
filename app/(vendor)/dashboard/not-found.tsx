import Link from "next/link";
import PageHeader from "@/components/PageHeader";

/** Shown when a /dashboard/[slug] shop doesn't exist or belongs to another account. */
export default function ShopNotFound() {
  return (
    <main className="page ad-page">
      <PageHeader
        label="Shop not found"
        title="We couldn't open"
        soft="that shop."
        subtitle="It doesn't exist, or it belongs to a different account than the one you're signed in with."
        actions={
          <Link href="/dashboard" className="btn">
            Back to your shops
          </Link>
        }
      />
    </main>
  );
}
