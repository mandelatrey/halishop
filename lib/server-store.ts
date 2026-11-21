import "server-only";
import type { CustomTemplate, Drop, Order, Product, Shop, ShopCard, Storefront } from "./types";
import { DEFAULT_STOREFRONT } from "./storefront";
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
/** A shop by its link, or null if there's no such shop (buyer pages → 404). */
export async function findShop(slug: string): Promise<Shop | null> {
  await ensureSeeded(slug); // indexes; the demo shop where allowed — never creates other shops
  const db = await getDb();
  const doc = await db.collection<ShopDoc>("shops").findOne({ _id: slug });
  return doc ? (strip(doc as unknown as Record<string, unknown>, ["_id"]) as unknown as Shop) : null;
}

/** The signed-in seller's shop (it exists: requireSeller found it on the account). */
export async function getShop(slug: string): Promise<Shop> {
  await ensureSeeded(slug);
  const db = await getDb();
  const doc = await db.collection<ShopDoc>("shops").findOne({ _id: slug });
  if (!doc) throw new Error(`Shop not found after seed: ${slug}`);
  return strip(doc as unknown as Record<string, unknown>, ["_id"]) as unknown as Shop;
}

/** The shop page's look (banners + menu). Defaults until the seller saves one. */
export async function getStorefront(slug: string): Promise<Storefront> {
  const db = await getDb();
  const doc = await db.collection<Storefront & { _id: string }>("storefronts").findOne({ _id: slug });
  if (!doc) return DEFAULT_STOREFRONT;
  const { _id, ...rest } = doc;
  void _id;
  return {
    ...DEFAULT_STOREFRONT,
    ...rest,
    menu: { ...DEFAULT_STOREFRONT.menu, ...rest.menu },
  };
}

/** Just the button colour — for buyer pages that don't show the banners. */
export async function getStorefrontButtons(slug: string): Promise<Storefront["buttons"]> {
  const db = await getDb();
  const doc = await db
    .collection<Storefront & { _id: string }>("storefronts")
    .findOne({ _id: slug }, { projection: { buttons: 1 } });
  return doc?.buttons ?? DEFAULT_STOREFRONT.buttons;
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

/* -------------------------------------------------------------------------
 * Directory, accounts, orders
 * ------------------------------------------------------------------------- */

/** Every shop with something in stock, for /shops (and favourites). Photos stay out: only codes. */
export async function listShopCards(only?: string[]): Promise<ShopCard[]> {
  await ensureSeeded();
  const db = await getDb();
  const match = only ? { _id: { $in: only } } : {};
  const [shops, stats] = await Promise.all([
    db
      .collection<ShopDoc>("shops")
      .find(match, { projection: { slug: 1, "brandKit.shopName": 1, "brandKit.logo": 1, "brandKit.palette.primary": 1, "contact.city": 1, createdAt: 1 } })
      .toArray(),
    db
      .collection("products")
      .aggregate<{ _id: string; count: number; min: number; currency: string; photos: string[] }>([
        { $match: { soldOut: { $ne: true }, ...(only ? { shopSlug: { $in: only } } : {}) } },
        { $sort: { price: 1 } },
        { $project: { shopSlug: 1, code: 1, price: 1, currency: 1, hasImage: { $gt: ["$image", null] } } },
        {
          $group: {
            _id: "$shopSlug",
            count: { $sum: 1 },
            min: { $min: "$price" },
            currency: { $first: "$currency" },
            photos: { $push: { $cond: ["$hasImage", "$code", "$$REMOVE"] } },
          },
        },
      ])
      .toArray(),
  ]);
  const byShop = new Map(stats.map((s) => [s._id, s]));
  return shops
    .map((s) => {
      const st = byShop.get(s._id);
      return {
        slug: s._id,
        name: s.brandKit?.shopName?.trim() || s._id,
        logo: s.brandKit?.logo,
        city: s.contact?.city,
        primary: s.brandKit?.palette?.primary ?? "#201e1d",
        inStock: st?.count ?? 0,
        from: st ? { price: st.min, currency: st.currency } : undefined,
        photos: (st?.photos ?? []).slice(0, 3),
        createdAt: s.createdAt ?? 0,
      };
    })
    // A favourite stays listed even when empty; the directory only shows shops with stock.
    .filter((s) => only || s.inStock > 0)
    .sort((a, b) => b.inStock - a.inStock || b.createdAt - a.createdAt)
    .map(({ createdAt: _c, ...card }) => card);
}

/** Shops from before accounts whose order number is this phone: the setup page offers to claim them. */
export async function listClaimableShops(phone: string): Promise<{ slug: string; name: string }[]> {
  const db = await getDb();
  const docs = await db
    .collection<ShopDoc>("shops")
    .find({ ownerId: { $exists: false }, "contact.whatsapp": phone }, { projection: { "brandKit.shopName": 1 } })
    .toArray();
  return docs.map((d) => ({ slug: d._id, name: d.brandKit?.shopName ?? d._id }));
}

type OrderDoc = Omit<Order, "id"> & { _id: string };
const toOrder = ({ _id, ...o }: OrderDoc): Order => ({ id: _id, ...o });

export async function listOrdersForShop(slug: string, limit = 200): Promise<Order[]> {
  const db = await getDb();
  const docs = await db.collection<OrderDoc>("orders").find({ shopSlug: slug }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toOrder);
}

export async function listOrdersForUser(userId: string, limit = 100): Promise<Order[]> {
  const db = await getDb();
  const docs = await db.collection<OrderDoc>("orders").find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toOrder);
}

/** Shop names for a set of slugs (order lists). */
export async function shopNames(slugs: string[]): Promise<Record<string, string>> {
  if (!slugs.length) return {};
  const db = await getDb();
  const docs = await db
    .collection<ShopDoc>("shops")
    .find({ _id: { $in: [...new Set(slugs)] } }, { projection: { "brandKit.shopName": 1 } })
    .toArray();
  return Object.fromEntries(docs.map((d) => [d._id, d.brandKit?.shopName?.trim() || d._id]));
}
