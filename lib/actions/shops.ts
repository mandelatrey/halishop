"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireUser, type UserDoc } from "../auth";
import { DEFAULT_BRAND_KIT } from "../fixtures";
import { ensureSeeded } from "../seed";
import type { Shop } from "../types";
import { normalizePhone } from "../wa";

type ShopDoc = Shop & { _id: string };
export type SetupState = { error?: string; values?: Record<string, string> } | undefined;

/** Links that would clash with the app's own pages or read as official. */
const RESERVED = new Set(["admin", "api", "app", "haali", "hali", "login", "signup", "account", "seller", "shops", "shop", "orders", "settings", "new", "o", "d", "help", "support"]);

/** "Shania Collections!" -> "shania-collections" */
function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
}

/** Ref prefix like the original "SH-4F2": two letters from the name + three random characters. */
function refPrefixFor(name: string): string {
  const letters = (name.toUpperCase().match(/[A-Z]/g) ?? ["H", "A"]).join("").padEnd(2, "X").slice(0, 2);
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `${letters}-${Array.from({ length: 3 }, () => abc[randomInt(abc.length)]).join("")}`;
}

export async function createShop(_prev: SetupState, form: FormData): Promise<SetupState> {
  const user = await requireUser("/seller/setup");
  if (user.shopSlug) redirect("/orders");

  const values = Object.fromEntries(["shopName", "slug", "whatsapp", "area", "city"].map((k) => [k, String(form.get(k) ?? "").trim()]));
  const shopName = values.shopName.slice(0, 60);
  const slug = slugify(values.slug || values.shopName);
  const digits = normalizePhone(values.whatsapp || user.phone);

  if (!shopName) return { values, error: "Give your shop a name." };
  if (slug.length < 3) return { values, error: "Pick a link of at least 3 letters or numbers." };
  if (RESERVED.has(slug)) return { values, error: `“${slug}” is reserved — try another link.` };
  if (digits.length < 8 || digits.length > 15) return { values, error: "Enter the full WhatsApp number orders should go to." };

  await ensureSeeded(); // indexes, including the unique shop link
  const now = Date.now();
  const whatsapp = `+${digits}`;
  const host = process.env.NEXT_PUBLIC_APP_HOST || "shop.app";
  const city = values.city.slice(0, 40) || undefined;
  const shop: ShopDoc = {
    _id: slug,
    slug,
    ownerId: user.id,
    brandKit: { ...DEFAULT_BRAND_KIT, shopName, shopUrl: `${host}/shop/${slug}`, whatsapp },
    contact: {
      whatsapp,
      area: values.area.slice(0, 40) || undefined,
      city,
      cityCopy: city ? `delivery today in ${city}` : undefined,
    },
    refPrefix: refPrefixFor(shopName),
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  try {
    await db.collection<ShopDoc>("shops").insertOne(shop);
  } catch {
    return { values: { ...values, slug }, error: `The link “${slug}” is taken — try another.` };
  }
  await db.collection<UserDoc>("users").updateOne({ _id: user.id }, { $set: { shopSlug: slug } });
  revalidatePath("/shops");
  redirect("/products");
}

/**
 * Take over a shop that has no owner yet (shops from before accounts) — only
 * when its order WhatsApp number is the one this account signed up with.
 */
export async function claimShop(slug: string): Promise<{ error: string } | void> {
  const user = await requireUser("/seller/setup");
  if (user.shopSlug) redirect("/orders");
  const db = await getDb();
  const res = await db
    .collection<ShopDoc>("shops")
    .updateOne({ _id: slug, ownerId: { $exists: false }, "contact.whatsapp": user.phone }, { $set: { ownerId: user.id } });
  if (res.modifiedCount !== 1) return { error: "That shop can't be claimed with this account." };
  await db.collection<UserDoc>("users").updateOne({ _id: user.id }, { $set: { shopSlug: slug } });
  redirect("/orders");
}

/** Follow or unfollow a shop. Returns the new state. */
export async function toggleFavorite(slug: string): Promise<{ favorite: boolean }> {
  const user = await requireUser(`/shop/${slug}`);
  const favorite = !user.favorites.includes(slug);
  const db = await getDb();
  await db
    .collection<UserDoc>("users")
    .updateOne({ _id: user.id }, favorite ? { $addToSet: { favorites: slug } } : { $pull: { favorites: slug } });
  revalidatePath("/account");
  return { favorite };
}
