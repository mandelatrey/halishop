"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * The buyer's cart: kept on their device (localStorage, one cart per shop),
 * like the remembered WhatsApp number. Nothing reaches the server — the cart
 * becomes one WhatsApp message when they send it.
 *
 * Every hook instance on the page (cart button, sheet, product form) reads the
 * same store and updates together; other tabs follow via the storage event.
 */

export type CartItem = {
  code: string;
  title: string;
  price: number;
  currency: string;
  /** Chosen options, as the order message words them ("M" or "Colour: Blue, Storage: 256GB"). */
  variant?: string;
  qty: number;
  /** Stock when added, to cap the quantity. */
  max?: number;
  /** The product has a photo (served by /shop/[slug]/[code]/photo). */
  photo?: boolean;
};

const EVENT = "hali:cart";
const keyOf = (slug: string) => `hali:cart:${slug}`;
const lineId = (i: Pick<CartItem, "code" | "variant">) => `${i.code}|${i.variant ?? ""}`;
const EMPTY: CartItem[] = [];

// One parsed snapshot per raw string, so useSyncExternalStore sees a stable value.
const cache = new Map<string, { raw: string | null; items: CartItem[] }>();

function read(slug: string): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(keyOf(slug));
  } catch {
    return EMPTY;
  }
  const hit = cache.get(slug);
  if (hit && hit.raw === raw) return hit.items;
  let items: CartItem[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      items = parsed.filter(
        (i): i is CartItem =>
          i && typeof i.code === "string" && typeof i.title === "string" && typeof i.price === "number" && i.qty > 0
      );
    }
  } catch {
    items = EMPTY;
  }
  cache.set(slug, { raw, items });
  return items;
}

function write(slug: string, items: CartItem[]) {
  try {
    if (items.length) window.localStorage.setItem(keyOf(slug), JSON.stringify(items));
    else window.localStorage.removeItem(keyOf(slug));
  } catch {
    /* storage full or blocked: the cart just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const clampQty = (q: number, max?: number) => Math.max(1, Math.min(typeof max === "number" && max > 0 ? max : 99, q));

export function useCart(slug: string) {
  const items = useSyncExternalStore(
    subscribe,
    () => read(slug),
    () => EMPTY
  );

  /** Add an item; the same product + options adds to that line's quantity. Returns the new line quantity. */
  const add = useCallback(
    (item: CartItem) => {
      const cur = read(slug);
      const id = lineId(item);
      const existing = cur.find((i) => lineId(i) === id);
      const next = existing
        ? cur.map((i) => (lineId(i) === id ? { ...i, qty: clampQty(i.qty + item.qty, item.max ?? i.max), max: item.max ?? i.max } : i))
        : [...cur, { ...item, qty: clampQty(item.qty, item.max) }];
      write(slug, next);
      return next.find((i) => lineId(i) === id)!.qty;
    },
    [slug]
  );

  const setQty = useCallback(
    (item: CartItem, qty: number) =>
      write(slug, read(slug).map((i) => (lineId(i) === lineId(item) ? { ...i, qty: clampQty(qty, i.max) } : i))),
    [slug]
  );

  const remove = useCallback(
    (item: CartItem) => write(slug, read(slug).filter((i) => lineId(i) !== lineId(item))),
    [slug]
  );

  const clear = useCallback(() => write(slug, []), [slug]);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  return { items, count, add, setQty, remove, clear, lineId };
}

/** Window event that opens the page's cart sheet. */
export const OPEN_CART_EVENT = "hali:open-cart";
export const openCart = () => window.dispatchEvent(new Event(OPEN_CART_EVENT));
