import { getShop, getStorefront, listDropsForShop, listProducts } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import { isDropLive } from "@/lib/storefront";
import StorefrontClient from "./Client";

export default async function StorefrontEditorPage() {
  const slug = await getShopSlug();
  const [shop, products, drops, storefront] = await Promise.all([
    getShop(slug),
    listProducts(slug),
    listDropsForShop(slug, 1),
    getStorefront(slug),
  ]);
  const latest = drops[0];

  return (
    <StorefrontClient
      initial={storefront}
      slug={slug}
      shopName={shop.brandKit.shopName.trim()}
      primary={shop.brandKit.palette.primary}
      accent={shop.brandKit.palette.accent}
      cityLine={
        shop.contact.cityCopy ? `${shop.contact.city ? `${shop.contact.city} · ` : ""}same-day boda` : undefined
      }
      dropLive={!!latest && isDropLive(latest)}
      // Light copies for the menu, link pickers and counts — no photos…
      products={products.map(({ code, title, category, stock, soldOut, price, currency }) => ({
        code,
        title,
        category,
        stock,
        soldOut,
        price,
        currency,
      }))}
      // …except three for the brand slide preview.
      photos={products
        .filter((p) => !p.soldOut && p.image)
        .slice(0, 3)
        .map(({ code, image, imageMeta, imageFit }) => ({ code, image, imageMeta, imageFit }))}
    />
  );
}
