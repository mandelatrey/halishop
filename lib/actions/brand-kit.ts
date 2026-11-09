"use server";

import { revalidatePath } from "next/cache";
import type { BrandKit, Shop } from "../types";
import { getDb } from "../db";
import { assertShopOwner } from "../auth/session";
import { dashPath, shopPath } from "../paths";

type ShopDoc = Shop & { _id: string };

export async function saveBrandKit(slug: string, brandKit: BrandKit): Promise<void> {
  await assertShopOwner(slug);
  const db = await getDb();
  await db.collection<ShopDoc>("shops").updateOne(
    { _id: slug },
    { $set: { brandKit, updatedAt: Date.now() } }
  );
  revalidatePath(dashPath(slug), "layout");
  revalidatePath("/dashboard");
  revalidatePath(shopPath(slug), "layout");
}
