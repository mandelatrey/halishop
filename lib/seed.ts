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

/**
 * Ensure a shop doc exists for `slug`. Idempotent via `$setOnInsert` upsert
 * plus a per-process memoization so subsequent requests inside the same Node
 * process short-circuit — otherwise every page render would run 5 parallel
 * createIndex calls against Atlas.
 */
export async function ensureSeeded(slug: string): Promise<void> {
  const cached = seeded.get(slug);
  if (cached) return cached;

  const work = runSeed(slug).catch((err) => {
    // Don't poison the cache if seeding fails — allow a retry next request.
    seeded.delete(slug);
    throw err;
  });
  seeded.set(slug, work);
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

  // Ensure indexes (safe to call repeatedly, but round-trips every time — so
  // gated by the seeded-memo above so we only do it once per process).
  await Promise.all([
    shops.createIndex({ slug: 1 }, { unique: true }),
    products.createIndex({ shopSlug: 1, code: 1 }, { unique: true }),
    db.collection("custom_templates").createIndex({ shopSlug: 1, createdAt: -1 }),
    db.collection("drops").createIndex({ shopSlug: 1, id: 1 }, { unique: true }),
    db.collection("drops").createIndex({ shopSlug: 1, createdAt: -1 }),
  ]);
}
