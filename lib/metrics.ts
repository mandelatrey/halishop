import "server-only";
import type { Product, Shop, ShopEventType } from "./types";
import { getDb } from "./db";
import type { EventDoc } from "./events";

/** Days are bucketed in the sellers' timezone so "today" means their today. */
const TZ = process.env.HALI_TIMEZONE || "Africa/Kampala";

export type Counts = Record<ShopEventType, number>;

const zero = (): Counts => ({
  shop_view: 0,
  product_view: 0,
  drop_view: 0,
  about_view: 0,
  order_tap: 0,
  ask_tap: 0,
  link_tap: 0,
});

export type DayPoint = { day: string; visits: number; orders: number };

export type TopProduct = { code: string; title: string; views: number; orders: number };

export type CatalogueFacts = {
  products: number;
  inStock: number;
  lowStock: number;
  soldOut: number;
  /** Retail value of counted stock, per currency ("UGX" → 1_250_000). */
  stockValue: Record<string, number>;
};

export type ShopMetrics = {
  slug: string;
  name: string;
  logo?: string;
  current: Counts;
  previous: Counts;
  /** One point per day in the window, oldest first. */
  series: DayPoint[];
  top: TopProduct[];
  catalogue: CatalogueFacts;
  dropsInWindow: number;
  lastDropAt?: number;
};

/** Page views a buyer made — storefront, product, drop and about pages. */
export function visits(c: Counts): number {
  return c.shop_view + c.product_view + c.drop_view + c.about_view;
}

/** Order taps per product view — the share of product looks that became a WhatsApp order. */
export function conversion(c: Counts): number | null {
  return c.product_view > 0 ? c.order_tap / c.product_view : null;
}

function dayKey(d: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function catalogueFacts(products: Product[]): CatalogueFacts {
  const facts: CatalogueFacts = { products: products.length, inStock: 0, lowStock: 0, soldOut: 0, stockValue: {} };
  for (const p of products) {
    const out = p.soldOut || p.stock === 0;
    if (out) facts.soldOut++;
    else facts.inStock++;
    if (!out && typeof p.stock === "number" && p.stock > 0 && p.stock <= 2) facts.lowStock++;
    if (!out && typeof p.stock === "number" && p.stock > 0) {
      facts.stockValue[p.currency] = (facts.stockValue[p.currency] ?? 0) + p.price * p.stock;
    }
  }
  return facts;
}

/**
 * Metrics for each shop over the last `days` days, plus the `days` before
 * that for trend arrows. Three queries regardless of shop count.
 */
export async function getShopMetrics(shops: Shop[], days = 30): Promise<ShopMetrics[]> {
  if (shops.length === 0) return [];
  const db = await getDb();
  const slugs = shops.map((s) => s.slug);

  const now = new Date();
  const dayList: string[] = [];
  for (let i = days - 1; i >= 0; i--) dayList.push(dayKey(new Date(now.getTime() - i * 86_400_000)));
  const windowStartKey = dayList[0];
  // Fetch 2× the window (+1 day of slack for timezone edges), bucket by local day.
  const since = new Date(now.getTime() - (2 * days + 1) * 86_400_000);

  const [byDay, byProduct, products, drops] = await Promise.all([
    db
      .collection<EventDoc>("events")
      .aggregate<{ _id: { s: string; t: ShopEventType; d: string }; n: number }>([
        { $match: { shopSlug: { $in: slugs }, ts: { $gte: since } } },
        {
          $group: {
            _id: { s: "$shopSlug", t: "$type", d: { $dateToString: { format: "%Y-%m-%d", date: "$ts", timezone: TZ } } },
            n: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection<EventDoc>("events")
      .aggregate<{ _id: { s: string; c: string; t: ShopEventType }; n: number }>([
        {
          $match: {
            shopSlug: { $in: slugs },
            type: { $in: ["product_view", "order_tap"] },
            code: { $exists: true },
            ts: { $gte: new Date(now.getTime() - days * 86_400_000) },
          },
        },
        { $group: { _id: { s: "$shopSlug", c: "$code", t: "$type" }, n: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection<Product & { shopSlug: string }>("products")
      .find({ shopSlug: { $in: slugs } }, { projection: { image: 0, imageMeta: 0, description: 0 } })
      .toArray(),
    db
      .collection<{ shopSlug: string; createdAt: number }>("drops")
      .find({ shopSlug: { $in: slugs } }, { projection: { shopSlug: 1, createdAt: 1 } })
      .toArray(),
  ]);

  const windowStartMs = now.getTime() - days * 86_400_000;

  return shops.map((shop) => {
    const current = zero();
    const previous = zero();
    const perDay = new Map(dayList.map((d) => [d, { visits: 0, orders: 0 }]));

    for (const row of byDay) {
      if (row._id.s !== shop.slug) continue;
      const inWindow = row._id.d >= windowStartKey;
      (inWindow ? current : previous)[row._id.t] += row.n;
      const point = perDay.get(row._id.d);
      if (point) {
        if (row._id.t === "order_tap") point.orders += row.n;
        else if (row._id.t !== "ask_tap" && row._id.t !== "link_tap") point.visits += row.n;
      }
    }

    const shopProducts = products.filter((p) => p.shopSlug === shop.slug);
    const titles = new Map(shopProducts.map((p) => [p.code, p.title]));
    const topMap = new Map<string, TopProduct>();
    for (const row of byProduct) {
      if (row._id.s !== shop.slug) continue;
      const t = topMap.get(row._id.c) ?? { code: row._id.c, title: titles.get(row._id.c) ?? row._id.c, views: 0, orders: 0 };
      if (row._id.t === "order_tap") t.orders += row.n;
      else t.views += row.n;
      topMap.set(row._id.c, t);
    }
    const top = [...topMap.values()]
      .filter((t) => titles.has(t.code))
      .sort((a, b) => b.orders - a.orders || b.views - a.views)
      .slice(0, 5);

    const shopDrops = drops.filter((d) => d.shopSlug === shop.slug);
    return {
      slug: shop.slug,
      name: shop.brandKit.shopName,
      logo: shop.brandKit.logo,
      current,
      previous,
      series: dayList.map((day) => ({ day, ...perDay.get(day)! })),
      top,
      catalogue: catalogueFacts(shopProducts),
      dropsInWindow: shopDrops.filter((d) => d.createdAt >= windowStartMs).length,
      lastDropAt: shopDrops.reduce<number | undefined>((m, d) => (m === undefined || d.createdAt > m ? d.createdAt : m), undefined),
    };
  });
}

/** Sum several shops' metrics into one portfolio view. */
export function combine(all: ShopMetrics[]): Pick<ShopMetrics, "current" | "previous" | "series"> & {
  catalogue: CatalogueFacts;
} {
  const current = zero();
  const previous = zero();
  const series = (all[0]?.series ?? []).map((p) => ({ day: p.day, visits: 0, orders: 0 }));
  const catalogue: CatalogueFacts = { products: 0, inStock: 0, lowStock: 0, soldOut: 0, stockValue: {} };
  for (const m of all) {
    for (const k of Object.keys(current) as ShopEventType[]) {
      current[k] += m.current[k];
      previous[k] += m.previous[k];
    }
    m.series.forEach((p, i) => {
      series[i].visits += p.visits;
      series[i].orders += p.orders;
    });
    catalogue.products += m.catalogue.products;
    catalogue.inStock += m.catalogue.inStock;
    catalogue.lowStock += m.catalogue.lowStock;
    catalogue.soldOut += m.catalogue.soldOut;
    for (const [cur, v] of Object.entries(m.catalogue.stockValue)) {
      catalogue.stockValue[cur] = (catalogue.stockValue[cur] ?? 0) + v;
    }
  }
  return { current, previous, series, catalogue };
}
