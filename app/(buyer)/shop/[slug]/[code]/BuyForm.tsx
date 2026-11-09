"use client";

import { useMemo, useState } from "react";
import PhoneInput from "@/components/PhoneInput";
import { useBuyerRecall } from "@/lib/buyer-recall";
import { formatPrice } from "@/lib/format";
import { buildRef } from "@/lib/ref";
import { buildWhatsAppHref, composeOrderMessage } from "@/lib/wa";
import { useIsDesktop } from "@/lib/use-desktop";
import AskWhatsApp from "@/components/AskWhatsApp";
import ReadTicks from "@/components/ReadTicks";
import type { Product, Shop } from "@/lib/types";
import { getOptions } from "@/lib/variants";

export default function BuyForm({ shop, product }: { shop: Shop; product: Product }) {
  const { recall, save, clear, ready } = useBuyerRecall();
  const [compact, setCompact] = useState(true);
  // One pick per option (Size, Colour, Storage…), defaulting to the first value.
  const options = useMemo(() => getOptions(product), [product]);
  const [picks, setPicks] = useState<string[]>(() => options.map((o) => o.values[0] ?? ""));
  // One option: "(M)". Several: name each so "12GB" can't be mistaken for
  // storage — "(Colour: Blue, Storage: 256GB, RAM: 12GB)".
  const variant =
    options.length > 1
      ? options.map((o, i) => (picks[i] ? `${o.label}: ${picks[i]}` : "")).filter(Boolean).join(", ")
      : picks.filter(Boolean).join(", ");
  const [qty, setQty] = useState(1);
  const [area, setArea] = useState<string>(shop.contact.area ?? "");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [expanded, setExpanded] = useState(false);

  // Once recall is ready, decide whether to run the compact 1h layout or the full 1f layout.
  const hasRecall = ready && !!recall?.whatsapp;
  const showCompact = compact && hasRecall && !expanded;

  const effectiveWhatsapp = whatsapp || recall?.whatsapp || "";
  const effectiveArea = area || recall?.area || shop.contact.area || "";

  const ref = useMemo(() => buildRef(shop, product.code, "full"), [shop, product.code]);
  const orderText = useMemo(
    () =>
      composeOrderMessage({
        shopName: shop.brandKit.shopName,
        productTitle: product.title,
        variant: variant || undefined,
        quantity: qty,
        formattedPrice: formatPrice(product.price * qty, product.currency),
        area: effectiveArea || undefined,
        ref,
      }),
    [shop.brandKit.shopName, product.title, variant, qty, product.price, product.currency, effectiveArea, ref]
  );

  // Desktop browsers go straight to WhatsApp Web; wa.me would first show an
  // "Open app / Continue to WhatsApp Web" page. Phones keep wa.me (opens the app).
  const desktop = useIsDesktop();
  const orderLink =
    effectiveWhatsapp
      ? buildWhatsAppHref(shop.contact.whatsapp, orderText, desktop ? "web" : "wa.me")
      : "";

  const askButton = (label: string) => (
    <AskWhatsApp
      number={shop.contact.whatsapp}
      shopName={shop.brandKit.shopName}
      productTitle={product.title}
      refCode={ref}
      className="btn gh"
    >
      {label}
    </AskWhatsApp>
  );

  function persistRecall() {
    if (!effectiveWhatsapp) return;
    save({ whatsapp: effectiveWhatsapp, area: effectiveArea || undefined });
  }

  function handleOrder(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!effectiveWhatsapp) {
      e.preventDefault();
      setExpanded(true);
      return;
    }
    persistRecall();
    // Browser opens wa.me in a new tab via target=_blank
  }

  // Option pickers (Size, Colour, Storage…) — shared by the compact and full layouts.
  const optionPickers =
    options.map((o, i) => (
      <div className="by-field" key={o.label}>
        <span className="by-label">{o.label}</span>
        <div className="seg by-sizes" role="radiogroup" aria-label={o.label}>
          {o.values.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={picks[i] === v}
              className={picks[i] === v ? "on" : ""}
              onClick={() => setPicks((prev) => prev.map((p, j) => (j === i ? v : p)))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    ));

  return (
    <div className="by-form">
      <div className="by-form-head">
        <h1 className="by-h1 by-h1-sm">{product.title}</h1>
        <div className="by-price">
          <small>{product.currency}</small>
          {product.price.toLocaleString()}
        </div>
        {((typeof product.stock === "number" && product.stock > 0) ||
          (product.category && product.category !== "general")) && (
          <div className="by-tags">
            {typeof product.stock === "number" && product.stock > 0 && (
              <span className={product.stock <= 2 ? "tag acc" : "tag"}>
                {product.stock <= 2 ? `Only ${product.stock} left` : `${product.stock} in stock`}
              </span>
            )}
            {product.category && product.category !== "general" && (
              <span className="tag">{product.category}</span>
            )}
          </div>
        )}
      </div>

      {showCompact ? (
        // Screen 1h — compact returning-buyer layout
        <div className="by-form-body">
          {optionPickers}

          <div className="by-recall">
            <div className="by-field" style={{ gap: 6 }}>
              <span className="by-label">Sending as</span>
              <span className="by-recall-v">
                {recall?.whatsapp}
                {recall?.area ? ` · ${recall.area}` : ""}
              </span>
            </div>
            <button
              type="button"
              className="btn gh"
              onClick={() => {
                setExpanded(true);
                clear();
              }}
            >
              Change
            </button>
          </div>

          <div className="by-cta">
            <a
              href={orderLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOrder}
              className="btn by-order"
            >
              Order — 1 tap · {formatPrice(product.price * qty, product.currency)}
            </a>

            {askButton("Ask a question first →")}
          </div>
        </div>
      ) : (
        // Screen 1f + 1g — full form + message preview
        <div className="by-form-body">
          {optionPickers}

          <div className="by-field-row">
            <div className="by-field">
              <span className="by-label">Quantity</span>
              <div className="seg by-qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">
                  −
                </button>
                <button type="button" className="on" aria-live="polite">
                  {qty}
                </button>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="One more">
                  +
                </button>
              </div>
            </div>
            <label className="by-field">
              <span className="by-label">Delivery area</span>
              <input
                className="inp"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder={shop.contact.area ?? "Ntinda"}
              />
            </label>
          </div>

          <div className="by-field">
            <span className="by-label">Your WhatsApp number *</span>
            <PhoneInput
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="772 145 908"
            />
            <p className="by-hint">
              Only {shop.brandKit.shopName.split(/\s+/)[0]} sees this. Saved on this phone for next time.
            </p>
          </div>

          {/* Screen 1g — message preview, shown as the WhatsApp bubble it becomes */}
          <div className="by-chat">
            <span className="by-label">What gets sent</span>
            <div className="by-bubble">
              {orderText}
              <div className="by-bubble-time"><ReadTicks /></div>
            </div>
          </div>

          <div className="by-cta">
            <a
              href={orderLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOrder}
              className="btn by-order"
              aria-disabled={!effectiveWhatsapp}
            >
              Order on WhatsApp — {formatPrice(product.price * qty, product.currency)}
            </a>
            {askButton("Or just ask a question first →")}
          </div>
        </div>
      )}
    </div>
  );
}
