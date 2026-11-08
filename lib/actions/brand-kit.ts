"use server";

import { revalidatePath } from "next/cache";
import type { BrandKit, Shop, ShopContact } from "../types";
import { getDb } from "../db";
import { ensureSeeded } from "../seed";
import { getShopSlug } from "./_slug";

type ShopDoc = Shop & { _id: string };

export async function saveBrandKit(brandKit: BrandKit): Promise<void> {
  const slug = getShopSlug();
  await ensureSeeded(slug);
  const db = await getDb();
  await db.collection<ShopDoc>("shops").updateOne(
    { _id: slug },
    { $set: { brandKit, updatedAt: Date.now() } }
  );
  revalidatePath("/brand-kit");
  revalidatePath("/");
  revalidatePath(`/shop/${slug}`);
}

export async function saveShopContact(contact: ShopContact): Promise<void> {
  const slug = getShopSlug();
  await ensureSeeded(slug);
  const db = await getDb();
  await db.collection<ShopDoc>("shops").updateOne(
    { _id: slug },
    { $set: { contact, updatedAt: Date.now() } }
  );
  revalidatePath("/brand-kit");
  revalidatePath(`/shop/${slug}`);
}
