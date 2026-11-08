import "server-only";
import type { CustomTemplate, Drop, Product, Shop } from "./types";
import { getDb } from "./db";
import { ensureSeeded } from "./seed";

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
 * ------------------------------------------------------------------------- */
export async function getShop(slug: string): Promise<Shop> {
  await ensureSeeded(slug);
  const db = await getDb();
  const doc = await db.collection<ShopDoc>("shops").findOne({ _id: slug });
  if (!doc) throw new Error(`Shop not found after seed: ${slug}`);
  return strip(doc as unknown as Record<string, unknown>, ["_id"]) as unknown as Shop;
}

export async function listProducts(slug: string): Promise<Product[]> {
  await ensureSeeded(slug);
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
