"use client";

import { useMemo, useState } from "react";
import PhoneInput from "@/components/PhoneInput";
import { useBuyerRecall } from "@/lib/buyer-recall";
import { formatPrice } from "@/lib/format";
import { buildRef } from "@/lib/ref";
import { buildWaLink, composeOrderMessage, composeAskMessage } from "@/lib/wa";
import type { Product, Shop } from "@/lib/types";

export default function BuyForm({ shop, product }: { shop: Shop; product: Product }) {
  const { recall, save, clear, ready } = useBuyerRecall();
  const [compact, setCompact] = useState(true);
  const variants = product.variants ?? [];
  const [variant, setVariant] = useState<string>(variants.includes("L") ? "L" : variants[0] ?? "");
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

  const askText = useMemo(
    () => composeAskMessage({ shopName: shop.brandKit.shopName, productTitle: product.title, ref }),
    [shop.brandKit.shopName, product.title, ref]
  );

  const orderLink =
    effectiveWhatsapp
      ? buildWaLink(shop.contact.whatsapp, orderText)
      : "";

  const askLink = buildWaLink(shop.contact.whatsapp, askText);

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

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "16px 14px 12px", borderBottom: "1px solid var(--stroke-hair)" }}>
        <div className="col" style={{ gap: 6 }}>
          <div className="bp-title">{product.title}</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {typeof product.stock === "number" && product.stock > 0 && (
              <span className={product.stock <= 2 ? "tag acc" : "tag"}>
                {product.stock <= 2 ? `Only ${product.stock} left` : `${product.stock} in stock`}
              </span>
            )}
            {product.category && product.category !== "general" && (
              <span className="tag">{product.category}</span>
            )}
          </div>
        </div>
        <div className="bp-price">
          {product.currency}
          <br />
          {product.price.toLocaleString()}
        </div>
      </div>

      {showCompact ? (
        // Screen 1h — compact returning-buyer layout
        <div className="col" style={{ gap: 12, padding: "16px 14px" }}>
          {variants.length > 0 && (
            <div className="col" style={{ gap: 6 }}>
              <span className="k">Size</span>
              <div className="seg">
                {variants.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={variant === v ? "on" : ""}
                    onClick={() => setVariant(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="row" style={{ justifyContent: "space-between", padding: "10px 12px", background: "var(--color-surface)", borderRadius: 8 }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="k">Sending as</span>
              <span className="t2">
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
              style={{ padding: "4px 8px" }}
            >
              Change
            </button>
          </div>

          <a
            href={orderLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOrder}
            className="btn"
            style={{ display: "block", textAlign: "center" }}
          >
            Order — 1 tap · {formatPrice(product.price * qty, product.currency)}
          </a>

          <a href={askLink} target="_blank" rel="noopener noreferrer" className="btn gh" style={{ textAlign: "center", width: "auto" }}>
            Ask a question first →
          </a>
        </div>
      ) : (
        // Screen 1f + 1g — full form + message preview
        <div className="col" style={{ gap: 16, padding: "16px 14px" }}>
          {variants.length > 0 && (
            <div className="col" style={{ gap: 6 }}>
              <span className="k">{product.variantLabel ?? "Size"}</span>
              <div className="seg">
                {variants.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={variant === v ? "on" : ""}
                    onClick={() => setVariant(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 6 }}>
              <span className="k">Quantity</span>
              <div className="seg" style={{ width: "auto" }}>
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ padding: "7px 14px", flex: "none" }}>
                  −
                </button>
                <button type="button" className="on" style={{ padding: "7px 16px", flex: "none" }}>
                  {qty}
                </button>
                <button type="button" onClick={() => setQty((q) => q + 1)} style={{ padding: "7px 14px", flex: "none" }}>
                  +
                </button>
              </div>
            </div>
            <div className="col" style={{ gap: 6, flex: 1 }}>
              <span className="k">Delivery area</span>
              <input
                className="inp"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder={shop.contact.area ?? "Ntinda"}
              />
            </div>
          </div>

          <div className="col" style={{ gap: 6 }}>
            <span className="k">Your WhatsApp number *</span>
            <PhoneInput
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="772 145 908"
            />
            <div className="p" style={{ fontSize: 11 }}>
              Only {shop.brandKit.shopName.split(/\s+/)[0]} sees this. Saved on this phone for next time.
            </div>
          </div>

          {/* Screen 1g — message preview */}
          <div
            className="col"
            style={{
              gap: 6,
              padding: 12,
              background: "var(--color-surface)",
              borderLeft: "2px solid var(--color-accent)",
              borderRadius: 4,
            }}
          >
            <span className="k">What gets sent</span>
            <div className="p" style={{ fontSize: 12.5, color: "var(--color-text)" }}>{orderText}</div>
          </div>

          <div className="col" style={{ gap: 8 }}>
            <a
              href={orderLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOrder}
              className="btn"
              style={{ display: "block", textAlign: "center" }}
              aria-disabled={!effectiveWhatsapp}
            >
              Order on WhatsApp — {formatPrice(product.price * qty, product.currency)}
            </a>
            <a
              href={askLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn gh"
              style={{ textAlign: "center", width: "auto", alignSelf: "flex-start" }}
            >
              Or just ask a question first →
            </a>
          </div>
        </div>
      )}

      <style>{`
        .bp-title {
          font: 800 21px/1.05 "DM Sans", sans-serif;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }
        .bp-price {
          font: 800 22px/1 "DM Sans", sans-serif;
          letter-spacing: -0.02em;
          text-align: right;
        }
        .seg > button.on { background: var(--color-accent); color: #fff; }
      `}</style>
    </div>
  );
}
