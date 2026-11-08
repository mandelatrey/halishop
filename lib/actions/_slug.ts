import "server-only";

/** The single shop slug for this deployment. Read from the env, defaults to "shania". */
export function getShopSlug(): string {
  return process.env.NEXT_PUBLIC_SHOP_SLUG || "shania";
}
