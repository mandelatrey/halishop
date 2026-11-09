"use server";

import { revalidatePath } from "next/cache";
import type { Product } from "../types";
import { getDb } from "../db";
import { assertShopOwner } from "../auth/session";
import { dashPath, shopPath } from "../paths";

type ProductDoc = Product & { _id: string; shopSlug: string; updatedAt: number };

export async function upsertProduct(slug: string, product: Product): Promise<void> {
  await assertShopOwner(slug);
  if (typeof product?.code !== "string" || !product.code.trim()) throw new Error("Product needs a code.");
  const db = await getDb();
  const id = `${slug}:${product.code}`;
  // Never let client-sent fields pick the document or the shop it belongs to.
  const { _id: _ignoredId, shopSlug: _ignoredShop, ...fields } = product as Product & {
    _id?: unknown;
    shopSlug?: unknown;
  };
  await db.collection<ProductDoc>("products").updateOne(
    { _id: id },
    {
      $set: { ...fields, shopSlug: slug, updatedAt: Date.now() },
      $setOnInsert: { _id: id },
    },
    { upsert: true }
  );
  revalidatePath(dashPath(slug), "layout");
  revalidatePath(shopPath(slug), "layout");
}

export async function removeProduct(slug: string, code: string): Promise<void> {
  await assertShopOwner(slug);
  const db = await getDb();
  await db.collection<ProductDoc>("products").deleteOne({ _id: `${slug}:${String(code)}` });
  revalidatePath(dashPath(slug), "layout");
  revalidatePath(shopPath(slug), "layout");
}
