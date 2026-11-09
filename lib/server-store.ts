import "server-only";
import { cache } from "react";
import type { CustomTemplate, Drop, Product, Shop, VendorPublic } from "./types";
import { getDb } from "./db";
import { ensureDemoSeeded } from "./seed";

type ShopDoc = Shop & { _id: string };
type ProductDoc = Product & { _id: string; shopSlug: string; updatedAt?: number };
type TemplateDoc = CustomTemplate & { _id: string; shopSlug: string };
type DropDoc = Drop & { _id: string };

function strip<T extends Record<string, unknown>>(doc: T, keys: string[]): Omit<T, keyof T> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(doc)) {
    if (!keys.includes(k)) out[k] = doc[k];
  }
  return out as Omit<T, keyof T>;
}

/* -------------------------------------------------------------------------
 * Reads
 *
 * None of these create data. A slug that doesn't exist reads as null/empty so
 * buyer routes can 404 — previously every read seeded a fresh shop for any
 * slug a visitor typed into the URL.
 * ------------------------------------------------------------------------- */
function toShop(doc: ShopDoc): Shop {
  return strip(doc as unknown as Record<string, unknown>, ["_id"]) as unknown as Shop;
}

/** The shop, or null if no shop has this slug. Memoised per request. */
export const getShopDoc = cache(async (slug: string): Promise<Shop | null> => {
  if (typeof slug !== "string" || !slug) return null;
  await ensureDemoSeeded();
  const db = await getDb();
  const doc = await db.collection<ShopDoc>("shops").findOne({ _id: slug });
  return doc ? toShop(doc) : null;
});

/** The shop; throws if missing. For callers that have already checked access. */
export async function getShop(slug: string): Promise<Shop> {
  const shop = await getShopDoc(slug);
  if (!shop) throw new Error(`Shop not found: ${slug}`);
  return shop;
}

/** Every shop a vendor owns, oldest first (their first hustle leads). */
export async function listShopsForOwner(ownerId: string): Promise<Shop[]> {
  await ensureDemoSeeded();
  const db = await getDb();
  const docs = await db.collection<ShopDoc>("shops").find({ ownerId }).sort({ createdAt: 1 }).toArray();
  return docs.map(toShop);
}

/** The owner's buyer-safe profile, or null if the shop is unclaimed. */
export async function getShopOwnerPublic(shop: Shop): Promise<VendorPublic | null> {
  if (!shop.ownerId) return null;
  const db = await getDb();
  const doc = await db
    .collection<{ _id: string; name: string; bio?: string; avatar?: string; createdAt: number }>("vendors")
    .findOne({ _id: shop.ownerId }, { projection: { name: 1, bio: 1, avatar: 1, createdAt: 1 } });
  return doc ? { name: doc.name, bio: doc.bio, avatar: doc.avatar, createdAt: doc.createdAt } : null;
}

export async function listProducts(slug: string): Promise<Product[]> {
  const db = await getDb();
  const docs = await db
    .collection<ProductDoc>("products")
    .find({ shopSlug: slug })
    .sort({ code: 1 })
    .toArray();
  return docs.map(
    (d) => strip(d as unknown as Record<string, unknown>, ["_id", "shopSlug", "updatedAt"]) as unknown as Product
  );
}

export async function getProduct(slug: string, code: string): Promise<Product | null> {
  const db = await getDb();
  const doc = await db
    .collection<ProductDoc>("products")
    .findOne({ _id: `${slug}:${code}` });
  if (!doc) return null;
  return strip(doc as unknown as Record<string, unknown>, ["_id", "shopSlug", "updatedAt"]) as unknown as Product;
}

export async function listCustomTemplates(slug: string): Promise<CustomTemplate[]> {
  const db = await getDb();
  const docs = await db
    .collection<TemplateDoc>("custom_templates")
    .find({ shopSlug: slug })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(
    (d) => strip(d as unknown as Record<string, unknown>, ["_id", "shopSlug"]) as unknown as CustomTemplate
  );
}

export async function getCustomTemplate(slug: string, id: string): Promise<CustomTemplate | null> {
  const db = await getDb();
  const doc = await db
    .collection<TemplateDoc>("custom_templates")
    .findOne({ _id: id, shopSlug: slug });
  if (!doc) return null;
  return strip(doc as unknown as Record<string, unknown>, ["_id", "shopSlug"]) as unknown as CustomTemplate;
}

export async function getDrop(slug: string, dropId: string): Promise<Drop | null> {
  const db = await getDb();
  const doc = await db
    .collection<DropDoc>("drops")
    .findOne({ _id: `${slug}:${dropId}` });
  if (!doc) return null;
  return strip(doc as unknown as Record<string, unknown>, ["_id"]) as unknown as Drop;
}

export async function listDropsForShop(slug: string, limit = 20): Promise<Drop[]> {
  const db = await getDb();
  const docs = await db
    .collection<DropDoc>("drops")
    .find({ shopSlug: slug })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(
    (d) => strip(d as unknown as Record<string, unknown>, ["_id"]) as unknown as Drop
  );
}
