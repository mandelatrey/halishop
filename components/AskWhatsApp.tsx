"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { buildWhatsAppHref, composeQuestionMessage, MAX_PREFILL_CHARS } from "@/lib/wa";
import { useIsDesktop } from "@/lib/use-desktop";
import { track } from "@/lib/track";
import ReadTicks from "./ReadTicks";

/**
 * "Ask a question" button + on-site sheet. The buyer types their question
 * here, sees exactly what will be sent, then Send opens WhatsApp with that
 * text — instead of opening WhatsApp with a canned message.
 *
 * On phones Send uses wa.me (opens the app directly). On desktop it goes
 * straight to WhatsApp Web, skipping wa.me's "Open app / Continue to WhatsApp
 * Web" page, with the desktop app offered as an alternative.
 */
export default function AskWhatsApp({
  number,
  shopName,
  productTitle,
  refCode,
  area,
  className = "btn sec",
  children = "Ask a question on WhatsApp",
  trackSlug,
  trackCode,
}: {
  /** Seller's WhatsApp number (shop.contact.whatsapp). */
  number: string;
  shopName: string;
  /** When asking from a product page, the product the question is about. */
  productTitle?: string;
  refCode?: string;
  /** Seller's delivery area, used in a quick suggestion. */
  area?: string;
  className?: string;
  children?: ReactNode;
  /** Shop slug to count this as an `ask_tap` in the seller's metrics. */
  trackSlug?: string;
  trackCode?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState("");
  const desktop = useIsDesktop();
  const titleId = useId();
  const first = shopName.split(/\s+/)[0];

  const suggestions = productTitle
    ? ["Is it still available?", "Do you have other sizes or colours?", "Can I see more photos?"]
    : [
        "What's new this week?",
        area ? `Do you deliver outside ${area}?` : "Where do you deliver?",
        "Can I pay with mobile money?",
      ];

  const message = composeQuestionMessage({ shopName, question, productTitle, ref: refCode });
  const tooLong = message.length > MAX_PREFILL_CHARS;
  const canSend = question.trim().length > 0;

  function open() {
    dialogRef.current?.showModal();
    // Focus after the dialog paints so mobile keyboards open reliably.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function close() {
    dialogRef.current?.close();
  }

  function pick(s: string) {
    setQuestion(s);
    inputRef.current?.focus();
  }

  function sent() {
    if (trackSlug) track(trackSlug, "ask_tap", { code: trackCode });
    // Let the link open first, then tidy up for next time.
    setTimeout(() => {
      close();
      setQuestion("");
    }, 150);
  }

  const primaryHref = canSend ? buildWhatsAppHref(number, message, desktop ? "web" : "wa.me") : undefined;
  const appHref = canSend ? buildWhatsAppHref(number, message, "app") : undefined;

  return (
    <>
      <button type="button" className={className} onClick={open}>
        {children}
      </button>

      <dialog
        ref={dialogRef}
        className="by-ask"
        aria-labelledby={titleId}
        // Click on the backdrop (the dialog element itself, outside the panel) closes it.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="by-ask-panel">
          <div className="by-ask-head">
            <div>
              <span className="by-label">Message {first}</span>
              <h2 id={titleId} className="by-ask-title">
                {productTitle ? (
                  <>
                    Ask about <span className="soft">{productTitle}</span>
                  </>
                ) : (
                  <>
                    Ask <span className="soft">a question</span>
                  </>
                )}
              </h2>
            </div>
            <button type="button" className="by-ask-close" onClick={close} aria-label="Close">
              ×
            </button>
          </div>

          <label className="by-ask-field">
            <span className="by-label">Your question</span>
            <textarea
              ref={inputRef}
              className="inp by-ask-input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={productTitle ? "e.g. Do you have it in XL?" : "Type your question…"}
              maxLength={240}
            />
          </label>

          <div className="by-ask-chips" role="group" aria-label="Quick questions">
            {suggestions.map((s) => (
              <button key={s} type="button" className="by-ask-chip" onClick={() => pick(s)}>
                {s}
              </button>
            ))}
          </div>

          <div className="by-chat">
            <span className="by-label">What gets sent</span>
            <div className={`by-bubble${canSend ? "" : " by-bubble-empty"}`}>
              {canSend ? message : "Your question will appear here."}
              <div className="by-bubble-time"><ReadTicks /></div>
            </div>
            {tooLong && (
              <span className="by-ask-warn">Long messages may be cut short by WhatsApp — try trimming it.</span>
            )}
          </div>

          <div className="by-ask-actions">
            <a
              className="btn by-order"
              href={primaryHref ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!canSend}
              onClick={(e) => {
                if (!canSend) {
                  e.preventDefault();
                  inputRef.current?.focus();
                  return;
                }
                sent();
              }}
            >
              {desktop ? "Send on WhatsApp Web" : "Send on WhatsApp"}
            </a>
            {desktop && canSend && (
              <a className="btn gh" href={appHref} onClick={sent}>
                Use the WhatsApp desktop app instead
              </a>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
