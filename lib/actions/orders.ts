"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { getCurrentUser, requireSeller } from "../auth";
import type { Order, OrderItem, OrderStatus, Product } from "../types";
import { normalizePhone } from "../wa";

type OrderDoc = Omit<Order, "id"> & { _id: string };

export type OrderInput = {
  /** Made in the browser per order (crypto.randomUUID), so a second tap updates instead of duplicating. */
  id: string;
  slug: string;
  items: { code: string; variant?: string; qty: number }[];
  buyerPhone: string;
  area?: string;
};

const ID = /^[0-9a-f-]{16,64}$/i;
const STATUSES: OrderStatus[] = ["new", "confirmed", "delivered", "cancelled"];

/**
 * Record an order as the buyer opens WhatsApp with it (product page or cart).
 * Titles and prices come from the catalogue, not the browser. Anyone can
 * place one (buyers needn't sign in); a signed-in buyer's order is linked to
 * their account so it shows in "My orders".
 */
export async function recordOrder(input: OrderInput): Promise<{ ok: boolean }> {
  if (!ID.test(input.id) || !Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) return { ok: false };
  const digits = normalizePhone(String(input.buyerPhone ?? ""));
  if (digits.length < 8 || digits.length > 15) return { ok: false };

  const db = await getDb();
  const shop = await db.collection("shops").findOne({ _id: input.slug as never }, { projection: { _id: 1 } });
  if (!shop) return { ok: false };
  const codes = [...new Set(input.items.map((i) => String(i.code)))];
  const products = await db
    .collection<Product & { _id: string; shopSlug: string }>("products")
    .find({ shopSlug: input.slug, code: { $in: codes } }, { projection: { image: 0, imageMeta: 0 } })
    .toArray();
  const byCode = new Map(products.map((p) => [p.code, p]));
  const items: OrderItem[] = input.items.flatMap((i) => {
    const p = byCode.get(String(i.code));
    const qty = Math.min(99, Math.max(1, Math.floor(Number(i.qty) || 1)));
    return p
      ? [{ code: p.code, title: p.title, variant: i.variant ? String(i.variant).slice(0, 120) : undefined, qty, price: p.price, currency: p.currency }]
      : [];
  });
  if (!items.length) return { ok: false };

  const user = await getCurrentUser();
  const now = Date.now();
  try {
    await db.collection<OrderDoc>("orders").updateOne(
      // only a still-new order of this shop can be re-sent
      { _id: input.id, shopSlug: input.slug, status: "new" },
      {
        $set: {
          items,
          buyerPhone: `+${digits}`,
          area: input.area ? String(input.area).slice(0, 60) : undefined,
          ...(user ? { userId: user.id } : {}),
          updatedAt: now,
        },
        $setOnInsert: { shopSlug: input.slug, status: "new", createdAt: now },
      },
      { upsert: true }
    );
  } catch {
    return { ok: false }; // the id exists for another shop, or was already confirmed
  }
  revalidatePath("/orders");
  if (user) revalidatePath("/account");
  return { ok: true };
}

/** Seller: move one of their shop's orders to a new status. */
export async function setOrderStatus(id: string, status: OrderStatus): Promise<{ ok: boolean }> {
  const seller = await requireSeller();
  if (!STATUSES.includes(status)) return { ok: false };
  const db = await getDb();
  const res = await db
    .collection<OrderDoc>("orders")
    .updateOne({ _id: id, shopSlug: seller.shopSlug }, { $set: { status, updatedAt: Date.now() } });
  revalidatePath("/orders");
  revalidatePath("/account");
  return { ok: res.matchedCount === 1 };
}
