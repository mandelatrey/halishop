"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import PhoneInput from "./PhoneInput";
import ReadTicks from "./ReadTicks";
import WhatsAppTargetPicker from "./WhatsAppTargetPicker";
import { OPEN_CART_EVENT, openCart, useCart, type CartItem } from "@/lib/cart";
import { useBuyerRecall } from "@/lib/buyer-recall";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppHref, composeCartMessage, MAX_CART_PREFILL_CHARS } from "@/lib/wa";
import { useWhatsAppTarget } from "@/lib/wa-target";

/** "Cart" button with the item count. Opens the page's <CartSheet>. */
export function CartButton({ slug, className = "btn sec by-cart-btn" }: { slug: string; className?: string }) {
  const { count } = useCart(slug);
  return (
    <button type="button" className={className} onClick={openCart} aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}>
      <ShoppingBag size={16} aria-hidden />
      <span className="by-cart-btn-l">Cart</span>
      {count > 0 && (
        <span className="by-cart-count" aria-hidden>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/** Totals per currency: "UGX 720,000" (or "UGX 720,000 + USD 20" for a mixed cart). */
function totalText(items: CartItem[]) {
  const by = new Map<string, number>();
  for (const i of items) by.set(i.currency, (by.get(i.currency) ?? 0) + i.price * i.qty);
  return [...by].map(([cur, n]) => formatPrice(n, cur)).join(" + ");
}

/**
 * The cart sheet: items (quantity, remove), the buyer's number and delivery
 * area, the WhatsApp message it becomes, and Send. One per page; opened by
 * <CartButton> or openCart().
 */
export function CartSheet({
  slug,
  shopName,
  sellerWhatsapp,
  defaultArea,
  refPrefix,
}: {
  slug: string;
  shopName: string;
  /** shop.contact.whatsapp — where the order goes. */
  sellerWhatsapp: string;
  defaultArea?: string;
  refPrefix: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const phoneWrap = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { items, count, setQty, remove, clear, lineId } = useCart(slug);
  const { recall, save, ready } = useBuyerRecall();
  const { target } = useWhatsAppTarget();
  const [whatsapp, setWhatsapp] = useState("");
  const [area, setArea] = useState("");
  const [changing, setChanging] = useState(false);
  const [sent, setSent] = useState(false);
  const first = shopName.split(/\s+/)[0];

  useEffect(() => {
    const open = () => {
      setSent(false);
      dialog.current?.showModal();
    };
    window.addEventListener(OPEN_CART_EVENT, open);
    return () => window.removeEventListener(OPEN_CART_EVENT, open);
  }, []);

  const buyer = whatsapp || (!changing ? recall?.whatsapp ?? "" : "");
  const where = area || recall?.area || defaultArea || "";
  const showRecall = ready && !!recall?.whatsapp && !changing;

  const message = useMemo(
    () =>
      composeCartMessage({
        shopName,
        lines: items.map((i) => ({
          title: i.title,
          variant: i.variant,
          quantity: i.qty,
          formattedTotal: formatPrice(i.price * i.qty, i.currency),
          ref: `${refPrefix}-${i.code}`,
        })),
        formattedTotal: totalText(items),
        area: where || undefined,
      }),
    [items, shopName, refPrefix, where]
  );
  const href = buyer && items.length ? buildWhatsAppHref(sellerWhatsapp, message, target, MAX_CART_PREFILL_CHARS) : undefined;
  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      className="by-ask by-cart"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="by-ask-panel">
        <div className="by-ask-head">
          <div>
            <span className="by-label">Your cart · {shopName}</span>
            <h2 id={titleId} className="by-ask-title">
              {count === 0 ? "Your cart is empty" : `${count} ${count === 1 ? "item" : "items"}`}
            </h2>
          </div>
          <button type="button" className="by-ask-close" onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="by-cart-empty">
            <p>Open a product and tap <b>Add to cart</b> to collect a few things, then send them to {first} in one message.</p>
            <button type="button" className="btn sec" onClick={close}>
              Keep browsing
            </button>
          </div>
        ) : sent ? (
          <div className="by-cart-sent">
            <p>
              Your order opened in WhatsApp — press send there. Once it&rsquo;s sent you can clear the cart.
            </p>
            <div className="by-ask-actions">
              <button
                type="button"
                className="btn by-order"
                onClick={() => {
                  clear();
                  close();
                }}
              >
                Clear the cart
              </button>
              <a className="btn gh" href={href} target="_blank" rel="noopener noreferrer">
                Didn&rsquo;t open? Try again
              </a>
              <button type="button" className="btn gh" onClick={() => setSent(false)}>
                Back to the cart
              </button>
            </div>
          </div>
        ) : (
          <>
            <ul className="by-cart-list">
              {items.map((i) => (
                <li key={lineId(i)} className="by-cart-line">
                  <span className="by-cart-thumb">
                    {i.photo !== false && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/shop/${slug}/${i.code}/photo`}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <span aria-hidden>{i.code}</span>
                  </span>
                  <div className="by-cart-info">
                    <span className="by-cart-title">{i.title}</span>
                    {i.variant && <span className="by-cart-variant">{i.variant}</span>}
                    <span className="by-cart-price">{formatPrice(i.price * i.qty, i.currency)}</span>
                  </div>
                  <div className="by-cart-qty" role="group" aria-label={`Quantity of ${i.title}`}>
                    <button
                      type="button"
                      onClick={() => (i.qty > 1 ? setQty(i, i.qty - 1) : remove(i))}
                      aria-label={i.qty > 1 ? "One fewer" : `Remove ${i.title}`}
                    >
                      {i.qty > 1 ? <Minus size={14} aria-hidden /> : <Trash2 size={14} aria-hidden />}
                    </button>
                    <span aria-live="polite">{i.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(i, i.qty + 1)}
                      disabled={typeof i.max === "number" && i.qty >= i.max}
                      aria-label="One more"
                    >
                      <Plus size={14} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="by-cart-total">
              <span className="by-label">Total</span>
              <b>{totalText(items)}</b>
            </div>

            {showRecall ? (
              <div className="by-recall">
                <div className="by-field" style={{ gap: 6 }}>
                  <span className="by-label">Sending as</span>
                  <span className="by-recall-v">
                    {recall?.whatsapp}
                    {where ? ` · ${where}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn gh"
                  onClick={() => {
                    setWhatsapp(recall?.whatsapp ?? "");
                    setArea(recall?.area ?? "");
                    setChanging(true);
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="by-cart-fields">
                <div className="by-field" ref={phoneWrap}>
                  <span className="by-label">Your WhatsApp number *</span>
                  <PhoneInput value={whatsapp} onChange={setWhatsapp} placeholder="772 145 908" />
                </div>
                <label className="by-field">
                  <span className="by-label">Delivery area</span>
                  <input
                    className="inp"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={recall?.area || defaultArea || "Ntinda"}
                  />
                </label>
              </div>
            )}

            <div className="by-chat">
              <span className="by-label">What gets sent</span>
              <div className="by-bubble by-cart-bubble">
                {message}
                <div className="by-bubble-time">
                  <ReadTicks />
                </div>
              </div>
            </div>

            <div className="by-ask-actions">
              <WhatsAppTargetPicker />
              <a
                className="btn by-order"
                href={href ?? "#"}
                target={target === "app" ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-disabled={!buyer}
                onClick={(e) => {
                  if (!buyer) {
                    e.preventDefault();
                    setChanging(true);
                    requestAnimationFrame(() => phoneWrap.current?.querySelector("input")?.focus());
                    return;
                  }
                  save({ whatsapp: buyer, area: where || undefined });
                  setTimeout(() => setSent(true), 150);
                }}
              >
                Send order on WhatsApp · {totalText(items)}
              </a>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
