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
 * Slug of the demo shop seeded with fixtures, or null when seeding is off.
 * Set HALI_DEMO_SHOP=off in production once real vendors are on board.
 * Falls back to the old single-shop env var so existing deployments keep
 * their shop.
 */
export function demoShopSlug(): string | null {
  const v = process.env.HALI_DEMO_SHOP ?? process.env.NEXT_PUBLIC_SHOP_SLUG ?? "shania";
  return v === "off" || v === "" ? null : v;
}

/** Seed the demo shop (if enabled) and create indexes. Safe to call on every request. */
export async function ensureDemoSeeded(): Promise<void> {
  const slug = demoShopSlug();
  if (slug) return ensureSeeded(slug);
  return ensureIndexes();
}

let indexes: Promise<void> | null = null;
function ensureIndexes(): Promise<void> {
  if (!indexes) {
    indexes = createIndexes().catch((err) => {
      indexes = null;
      throw err;
    });
  }
  return indexes;
}

/**
 * Ensure a shop doc exists for `slug`. Idempotent via `$setOnInsert` upsert
 * plus a per-process memoization so subsequent requests inside the same Node
 * process short-circuit — otherwise every page render would run 5 parallel
 * createIndex calls against Atlas.
 */
async function ensureSeeded(slug: string): Promise<void> {
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

  await ensureIndexes();
}

async function createIndexes(): Promise<void> {
  const db = await getDb();
  // Safe to call repeatedly, but round-trips every time — so memoised above.
  await Promise.all([
    db.collection("shops").createIndex({ slug: 1 }, { unique: true }),
    db.collection("products").createIndex({ shopSlug: 1, code: 1 }, { unique: true }),
    db.collection("custom_templates").createIndex({ shopSlug: 1, createdAt: -1 }),
    db.collection("drops").createIndex({ shopSlug: 1, id: 1 }, { unique: true }),
    db.collection("drops").createIndex({ shopSlug: 1, createdAt: -1 }),
    db.collection("shops").createIndex({ ownerId: 1 }),
    db.collection("events").createIndex({ shopSlug: 1, ts: -1 }),
    db.collection("events").createIndex({ shopSlug: 1, type: 1, ts: -1 }),
    // Raw events age out after ~13 months; metrics only look back 90 days.
    db.collection("events").createIndex({ ts: 1 }, { expireAfterSeconds: 400 * 86_400 }),
  ]);
}
