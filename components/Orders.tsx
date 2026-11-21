"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { setOrderStatus } from "@/lib/actions/orders";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppHref, prettyPhone } from "@/lib/wa";
import { useWhatsAppTarget } from "@/lib/wa-target";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/lib/types";

/** "Today 14:05", "Yesterday 09:12", "21 Nov 14:05" — in the viewer's own time zone. */
function When({ ts }: { ts: number }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date(ts);
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const day = new Date();
    const yest = new Date(Date.now() - 86_400_000);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    setText(same(d, day) ? `Today ${time}` : same(d, yest) ? `Yesterday ${time}` : `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${time}`);
  }, [ts]);
  return <time dateTime={new Date(ts).toISOString()}>{text ?? ""}</time>;
}

export function orderTotal(o: Order): string {
  const by = new Map<string, number>();
  for (const i of o.items) by.set(i.currency, (by.get(i.currency) ?? 0) + i.price * i.qty);
  return [...by].map(([c, n]) => formatPrice(n, c)).join(" + ");
}

function Items({ order }: { order: Order }) {
  return (
    <ul className="st-order-items">
      {order.items.map((i, n) => (
        <li key={`${i.code}-${n}`}>
          <span>
            {i.title}
            {i.variant ? <span className="st-order-variant"> · {i.variant}</span> : null}
            <span className="st-order-qty"> ×{i.qty}</span>
          </span>
          <span className="st-order-price">{formatPrice(i.price * i.qty, i.currency)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Buyer's view: one order with its shop and status. */
export function BuyerOrder({ order, shopName }: { order: Order; shopName: string }) {
  return (
    <article className="st-order">
      <header>
        <Link href={`/shop/${order.shopSlug}`} className="st-order-shop">
          {shopName}
        </Link>
        <span className={`st-status s-${order.status}`}>{ORDER_STATUS_LABEL[order.status]}</span>
      </header>
      <Items order={order} />
      <footer>
        <When ts={order.createdAt} />
        <b>{orderTotal(order)}</b>
      </footer>
    </article>
  );
}

const FILTERS: (OrderStatus | "all")[] = ["all", "new", "confirmed", "delivered", "cancelled"];
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["new"],
};
const ACTION: Record<OrderStatus, string> = { new: "Reopen", confirmed: "Confirm", delivered: "Mark delivered", cancelled: "Cancel" };

/** Seller's Orders page: filter by status, chat with the buyer, move orders along. */
export function SellerOrders({ orders: initial, shopName }: { orders: Order[]; shopName: string }) {
  const [orders, setOrders] = useState(initial);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [pending, start] = useTransition();
  const { target } = useWhatsAppTarget();
  const count = (f: OrderStatus | "all") => (f === "all" ? orders.length : orders.filter((o) => o.status === f).length);
  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  function move(o: Order, status: OrderStatus) {
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status } : x)));
    start(async () => {
      const res = await setOrderStatus(o.id, status);
      if (!res.ok) setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status: o.status } : x)));
    });
  }

  return (
    <>
      <div className="st-tabs" role="tablist" aria-label="Filter orders">
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "new" ? "New" : ORDER_STATUS_LABEL[f]} <span>{count(f)}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="st-empty">
          {orders.length === 0
            ? "No orders yet. They appear here as soon as a buyer taps Send on your shop."
            : "Nothing here."}
        </p>
      ) : (
        <div className="st-orders">
          {shown.map((o) => (
            <article key={o.id} className="st-order">
              <header>
                <span className="st-order-buyer">
                  <a
                    href={buildWhatsAppHref(o.buyerPhone, `Hi, it's ${shopName} about your order.`, target)}
                    target={target === "app" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="st-order-chat"
                  >
                    <MessageCircle size={14} aria-hidden /> {prettyPhone(o.buyerPhone)}
                  </a>
                  {o.area && <span className="st-order-area">{o.area}</span>}
                </span>
                <span className={`st-status s-${o.status}`}>{o.status === "new" ? "New" : ORDER_STATUS_LABEL[o.status]}</span>
              </header>
              <Items order={o} />
              <footer>
                <When ts={o.createdAt} />
                <b>{orderTotal(o)}</b>
              </footer>
              {NEXT[o.status].length > 0 && (
                <div className="st-order-actions">
                  {NEXT[o.status].map((s) => (
                    <button key={s} type="button" className={s === "cancelled" || s === "new" ? "btn gh" : "btn"} disabled={pending} onClick={() => move(o, s)}>
                      {ACTION[s]}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
