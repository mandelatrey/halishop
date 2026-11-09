"use server";

import { revalidatePath } from "next/cache";
import type { Shop, ShopAbout, ShopContact } from "../types";
import { getDb } from "../db";
import { assertShopOwner } from "../auth/session";
import { dashPath, shopPath } from "../paths";
import { normalizePhone } from "../wa";

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
export async function saveShopSettings(slug: string, input: ShopContact): Promise<SaveSettingsResult> {
  await assertShopOwner(slug);
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

  const db = await getDb();
  await db.collection<ShopDoc>("shops").updateOne(
    { _id: slug },
    { $set: { contact, "brandKit.whatsapp": contact.whatsapp, updatedAt: Date.now() } }
  );

  revalidatePath(dashPath(slug), "layout");
  // Storefront, product pages and drop pages all build links from contact.
  revalidatePath(shopPath(slug), "layout");
  return { ok: true, contact };
}

export type SaveAboutResult = { ok: true; about: ShopAbout } | { ok: false; error: string };

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined);
const handle = (v: unknown) => clip(typeof v === "string" ? v.replace(/^@+/, "").replace(/\s+/g, "") : v, 60);

/** Save the buyer-facing "About this shop" info. */
export async function saveShopAbout(slug: string, input: ShopAbout): Promise<SaveAboutResult> {
  await assertShopOwner(slug);
  const about: ShopAbout = {
    tagline: clip(input.tagline, 120),
    description: clip(input.description, 1200),
    payment: clip(input.payment, 200),
    hours: clip(input.hours, 120),
    instagram: handle(input.instagram),
    tiktok: handle(input.tiktok),
    showOwner: input.showOwner !== false,
  };
  for (const k of Object.keys(about) as (keyof ShopAbout)[]) if (about[k] === undefined) delete about[k];

  const db = await getDb();
  await db.collection<ShopDoc>("shops").updateOne({ _id: slug }, { $set: { about, updatedAt: Date.now() } });
  revalidatePath(dashPath(slug), "layout");
  revalidatePath(shopPath(slug), "layout");
  return { ok: true, about };
}
