"use server";

import { revalidatePath } from "next/cache";
import type { Product } from "../types";
import { getDb } from "../db";
import { ensureSeeded } from "../seed";
import { getShopSlug } from "./_slug";

type ProductDoc = Product & { _id: string; shopSlug: string; updatedAt: number };

export async function upsertProduct(product: Product): Promise<void> {
  const slug = getShopSlug();
  await ensureSeeded(slug);
  const db = await getDb();
  const id = `${slug}:${product.code}`;
  await db.collection<ProductDoc>("products").updateOne(
    { _id: id },
    {
      $set: {
        shopSlug: slug,
        ...product,
        updatedAt: Date.now(),
      },
      $setOnInsert: { _id: id },
    },
    { upsert: true }
  );
  revalidatePath("/products");
  revalidatePath(`/products/${product.code}/card`);
  revalidatePath(`/shop/${slug}`);
  revalidatePath(`/shop/${slug}/${product.code}`);
}

export async function removeProduct(code: string): Promise<void> {
  const slug = getShopSlug();
  const db = await getDb();
  await db.collection<ProductDoc>("products").deleteOne({ _id: `${slug}:${code}` });
  revalidatePath("/products");
  revalidatePath(`/shop/${slug}`);
}
