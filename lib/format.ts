/**
 * Currency formatting. Wireframes render prices as "UGX 35,000" — currency label
 * before the number, comma thousand separator, no decimal for round numbers.
 */
export function formatPrice(amount: number, currency = "UGX"): string {
  const rounded = Math.round(amount);
  const grouped = rounded.toLocaleString("en-US");
  return `${currency} ${grouped}`;
}
