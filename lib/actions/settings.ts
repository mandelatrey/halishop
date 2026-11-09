"use server";

import { revalidatePath } from "next/cache";
import type { Shop, ShopContact } from "../types";
import { getDb } from "../db";
import { ensureSeeded } from "../seed";
import { normalizePhone } from "../wa";
import { getShopSlug } from "./_slug";

type ShopDoc = Shop & { _id: string };

export type SaveSettingsResult = { ok: true; contact: ShopContact } | { ok: false; error: string };

/**
 * Save the shop's account settings: the WhatsApp number every "Order" /
 * "Ask" link opens a chat with, plus delivery defaults.
 *
 * `contact.whatsapp` is the single source of truth for order links. We also
 * mirror it into `brandKit.whatsapp` (a legacy field the brand kit used to
 * edit without effect) so the two can never disagree again.
 */
export async function saveShopSettings(input: ShopContact): Promise<SaveSettingsResult> {
  const digits = normalizePhone(input.whatsapp ?? "");
  // E.164 allows up to 15 digits; anything under 8 can't be a real mobile number.
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: "Enter a full WhatsApp number, including the country code." };
  }

  const contact: ShopContact = {
    whatsapp: `+${digits}`,
    area: input.area?.trim() || undefined,
    city: input.city?.trim() || undefined,
    cityCopy: input.cityCopy?.trim() || undefined,
  };

  const slug = getShopSlug();
  await ensureSeeded(slug);
  const db = await getDb();
  await db.collection<ShopDoc>("shops").updateOne(
    { _id: slug },
    { $set: { contact, "brandKit.whatsapp": contact.whatsapp, updatedAt: Date.now() } }
  );

  revalidatePath("/settings");
  revalidatePath("/brand-kit");
  // Storefront, product pages and drop pages all build links from contact.
  revalidatePath(`/shop/${slug}`, "layout");
  return { ok: true, contact };
}
