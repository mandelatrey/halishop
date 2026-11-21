import "server-only";
import type { Product, Shop } from "./types";
import { DEFAULT_BRAND_KIT, DEFAULT_CONTACT, DEFAULT_REF_PREFIX, SEED_PRODUCTS } from "./fixtures";
import { getDb } from "./db";

type ShopDoc = Shop & { _id: string };
type ProductDoc = Product & { _id: string; shopSlug: string; updatedAt: number };

declare global {
  // eslint-disable-next-line no-var
  var _haliSeeded: Map<string, Promise<void>> | undefined;
}

const seeded = globalThis._haliSeeded ?? new Map<string, Promise<void>>();
if (process.env.NODE_ENV !== "production") globalThis._haliSeeded = seeded;

/** The demo shop (Shania, six products) — seeded outside production, or with HALI_SEED_DEMO=1. */
export const DEMO_SLUG = "shania";
const demoAllowed = () => process.env.NODE_ENV !== "production" || process.env.HALI_SEED_DEMO === "1";

/**
 * Get the database ready: indexes, once per process — and, for the demo slug
 * where allowed, the Shania fixture (idempotent: `$setOnInsert` upsert).
 * Never creates any other shop: sellers create theirs in /seller/setup.
 * Memoised per slug so requests don't repeat the round-trips.
 */
export async function ensureSeeded(slug: string = DEMO_SLUG): Promise<void> {
  const key = slug === DEMO_SLUG && demoAllowed() ? slug : "";
  const cached = seeded.get(key);
  if (cached) return cached;

  const work = (key ? runSeed(key) : ensureIndexes()).catch((err) => {
    // Don't poison the cache if seeding fails — allow a retry next request.
    seeded.delete(key);
    throw err;
  });
  seeded.set(key, work);
  return work;
}

async function runSeed(slug: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  const shopDoc: Shop = {
    slug,
    brandKit: DEFAULT_BRAND_KIT,
    contact: DEFAULT_CONTACT,
    refPrefix: DEFAULT_REF_PREFIX,
    createdAt: now,
    updatedAt: now,
  };

  const shops = db.collection<ShopDoc>("shops");
  await shops.updateOne(
    { _id: slug },
    { $setOnInsert: { _id: slug, ...shopDoc } },
    { upsert: true }
  );

  const products = db.collection<ProductDoc>("products");
  const existing = await products.countDocuments({ shopSlug: slug }, { limit: 1 });
  if (existing === 0) {
    await products.insertMany(
      SEED_PRODUCTS.map((p) => ({
        _id: `${slug}:${p.code}`,
        shopSlug: slug,
        ...p,
        updatedAt: now,
      }))
    );
  }

  await ensureIndexes();
}

async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  const shops = db.collection<ShopDoc>("shops");
  const products = db.collection<ProductDoc>("products");
  await Promise.all([
    shops.createIndex({ slug: 1 }, { unique: true }),
    shops.createIndex({ ownerId: 1 }),
    products.createIndex({ shopSlug: 1, code: 1 }, { unique: true }),
    db.collection("custom_templates").createIndex({ shopSlug: 1, createdAt: -1 }),
    db.collection("drops").createIndex({ shopSlug: 1, id: 1 }, { unique: true }),
    db.collection("drops").createIndex({ shopSlug: 1, createdAt: -1 }),
  ]);
}
