import "server-only";
import { requireSeller } from "../auth";

/**
 * The shop the signed-in seller runs. Every seller page and action reads its
 * shop from here, so a seller can only ever see and change their own shop.
 * Signed out → /login; signed in without a shop → /seller/setup.
 */
export async function getShopSlug(): Promise<string> {
  return (await requireSeller()).shopSlug;
}
