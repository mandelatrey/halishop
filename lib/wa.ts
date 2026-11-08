/**
 * WhatsApp wa.me deep-link helpers.
 *
 * WhatsApp truncates long prefills on some builds, so we cap at ~300 chars.
 * All numbers become E.164 digits-only (no +) — that's what wa.me expects.
 */

export const MAX_PREFILL_CHARS = 300;

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
 * Build a wa.me link with a prefilled text body. The text is truncated to
 * MAX_PREFILL_CHARS with an ellipsis if it's too long.
 */
export function buildWaLink(number: string, text: string): string {
  const n = normalizePhone(number);
  const t = text.length > MAX_PREFILL_CHARS ? text.slice(0, MAX_PREFILL_CHARS - 1) + "…" : text;
  return `https://wa.me/${n}?text=${encodeURIComponent(t)}`;
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
