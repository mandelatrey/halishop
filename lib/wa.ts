import { parsePhone } from "./country-codes";

/**
 * WhatsApp wa.me deep-link helpers.
 *
 * WhatsApp truncates long prefills on some builds, so we cap at ~300 chars.
 * All numbers become E.164 digits-only (no +) — that's what wa.me expects.
 */

export const MAX_PREFILL_CHARS = 300;
/** A cart order lists every item, so it gets more room. Links this long still open in WhatsApp. */
export const MAX_CART_PREFILL_CHARS = 1500;

/**
 * Normalize any user input to a wa.me-compatible phone: digits only, with
 * country code, no leading +.
 *
 * - "+256 772 145 908" → "256772145908"
 * - "0772 145 908" → "256772145908" (assumes Uganda default)
 * - "256772145908" → "256772145908"
 */
export function normalizePhone(raw: string, defaultCc = "256"): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith(defaultCc)) return digits;
  if (digits.startsWith("0")) return defaultCc + digits.slice(1);
  return digits;
}

/**
 * Readable display form of a stored number — "+256772145908" → "+256 772 145 908".
 * Splits off the country code using the same table as the phone input, then
 * groups the rest in threes. Display only — never use it to build links.
 */
export function prettyPhone(raw: string): string {
  const { cc, national } = parsePhone(raw);
  if (!national) return "";
  const grouped =
    national.length === 10
      ? national.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")
      : national.replace(/(\d{3})(?=\d)/g, "$1 ");
  return `+${cc} ${grouped}`;
}

/**
 * Build a wa.me link with a prefilled text body. The text is truncated to
 * MAX_PREFILL_CHARS with an ellipsis if it's too long.
 */
export function buildWaLink(number: string, text: string): string {
  return buildWhatsAppHref(number, text, "wa.me");
}

function capPrefill(text: string, max = MAX_PREFILL_CHARS): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/**
 * Where a WhatsApp link should open.
 * - "wa.me": universal link. On phones it opens the app directly; on desktop
 *   browsers it shows WhatsApp's "Open app / Continue to WhatsApp Web" page.
 * - "web":   WhatsApp Web directly — skips that interstitial on desktop.
 * - "app":   the installed desktop app via the whatsapp:// scheme.
 */
export type WhatsAppTarget = "wa.me" | "web" | "app";

export function buildWhatsAppHref(
  number: string,
  text: string,
  target: WhatsAppTarget,
  maxChars = MAX_PREFILL_CHARS
): string {
  const n = normalizePhone(number);
  const t = encodeURIComponent(capPrefill(text, maxChars));
  if (target === "web") return `https://web.whatsapp.com/send?phone=${n}&text=${t}`;
  if (target === "app") return `whatsapp://send?phone=${n}&text=${t}`;
  return `https://wa.me/${n}?text=${t}`;
}

/**
 * A buyer's own question, typed on the site. With a product it carries the
 * product name and ref so the seller knows what it's about.
 */
export function composeQuestionMessage(input: {
  shopName: string;
  question: string;
  productTitle?: string;
  ref?: string;
}): string {
  const first = input.shopName.split(/\s+/)[0];
  const q = input.question.trim();
  if (input.productTitle) {
    const ref = input.ref ? ` (Ref ${input.ref})` : "";
    return `Hi ${first}, a question about the ${input.productTitle}${ref}: ${q}`;
  }
  // Joined after "Hi Name, " — lowercase the first letter ("Do you…" → "do you…"),
  // but leave "I", acronyms ("MTN…") and names alone.
  const joined = /^[A-Z][a-z]/.test(q) && !/^I\b/.test(q) ? q[0].toLowerCase() + q.slice(1) : q;
  return `Hi ${first}, ${joined}`;
}

/**
 * Compose the standard "buyer places order" WhatsApp message. Matches template
 * 01 from wireframe 1y verbatim.
 *
 *   Hi {shop}, I'd like the {product} ({variant}) x{qty} — UGX {price}, {area}. Ref {ref}
 */
export function composeOrderMessage(input: {
  shopName: string;
  productTitle: string;
  variant?: string;
  quantity: number;
  formattedPrice: string;
  area?: string;
  ref: string;
}): string {
  const { shopName, productTitle, variant, quantity, formattedPrice, area, ref } = input;
  const variantPart = variant ? ` (${variant})` : "";
  const areaPart = area ? `, ${area}` : "";
  const shopFirstName = shopName.split(/\s+/)[0];
  return `Hi ${shopFirstName}, I'd like the ${productTitle}${variantPart} x${quantity} — ${formattedPrice}${areaPart}. Ref ${ref}`;
}

/**
 * Compose the "just asking" WhatsApp message (template 02 from wireframe 1y).
 *
 *   Hi {shop}, I saw the {product} on your page. Is it still there? {ref}
 */
export function composeAskMessage(input: {
  shopName: string;
  productTitle: string;
  ref: string;
}): string {
  const shopFirstName = input.shopName.split(/\s+/)[0];
  return `Hi ${shopFirstName}, I saw the ${input.productTitle} on your page. Is it still there? ${input.ref}`;
}

export type CartLine = {
  title: string;
  variant?: string;
  quantity: number;
  /** Already formatted line total, e.g. "UGX 70,000". */
  formattedTotal: string;
  ref: string;
};

/**
 * One WhatsApp message for a whole cart:
 *
 *   Hi Shania, I'd like to order:
 *   1. JBL Charge 6 (Orange) x1 — UGX 650,000 · Ref SH-4F2-B7
 *   2. T-shirt black (M) x2 — UGX 70,000 · Ref SH-4F2-B3
 *   Total: UGX 720,000
 *   Delivery: Ntinda
 */
export function composeCartMessage(input: {
  shopName: string;
  lines: CartLine[];
  /** Formatted total(s) — one per currency, joined by the caller. */
  formattedTotal: string;
  area?: string;
}): string {
  const first = input.shopName.split(/\s+/)[0];
  const items = input.lines.map((l, i) => {
    const variant = l.variant ? ` (${l.variant})` : "";
    return `${i + 1}. ${l.title}${variant} x${l.quantity} — ${l.formattedTotal} · Ref ${l.ref}`;
  });
  return [
    `Hi ${first}, I'd like to order:`,
    ...items,
    `Total: ${input.formattedTotal}`,
    ...(input.area ? [`Delivery: ${input.area}`] : []),
  ].join("\n");
}
