import DropGuard from "@/components/DropGuard";
import ShopTabs from "@/components/ShopTabs";
import { ShopProvider } from "@/components/ShopContext";
import { requireOwnedShop } from "@/lib/auth/session";

/**
 * Every page under /dashboard/[slug] is one shop's tools. The layout checks
 * the signed-in vendor owns the shop (404 otherwise); each page repeats the
 * check because layouts don't re-render on client-side navigation.
 */
export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { shop } = await requireOwnedShop(slug);
  return (
    <ShopProvider slug={shop.slug} name={shop.brandKit.shopName}>
      <DropGuard />
      <ShopTabs />
      {children}
    </ShopProvider>
  );
}
