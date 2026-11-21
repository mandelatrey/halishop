"use server";

import { revalidatePath } from "next/cache";
import type { Storefront } from "../types";
import { getDb } from "../db";
import { ensureSeeded } from "../seed";
import { sanitizeStorefront } from "../storefront";
import { getShopSlug } from "./_slug";

export async function saveStorefront(input: Storefront): Promise<Storefront> {
  const slug = await getShopSlug();
  await ensureSeeded(slug);
  const clean = sanitizeStorefront(input);
  const db = await getDb();
  await db.collection<Storefront & { _id: string }>("storefronts").updateOne(
    { _id: slug },
    { $set: { ...clean, updatedAt: Date.now() } },
    { upsert: true }
  );
  revalidatePath("/storefront");
  revalidatePath(`/shop/${slug}`);
  return clean;
}
