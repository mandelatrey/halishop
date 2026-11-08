/**
 * Country calling codes. Kept small and Africa-focused — this is a WhatsApp
 * commerce tool for Ugandan resellers with occasional cross-border needs.
 */
export type CountryCode = {
  /** ISO 3166-1 alpha-2 (used for the flag emoji). */
  iso: string;
  /** Full name. */
  name: string;
  /** International dialling prefix without the +. */
  cc: string;
};

export const COUNTRY_CODES: CountryCode[] = [
  { iso: "UG", name: "Uganda", cc: "256" },
  { iso: "KE", name: "Kenya", cc: "254" },
  { iso: "TZ", name: "Tanzania", cc: "255" },
  { iso: "RW", name: "Rwanda", cc: "250" },
  { iso: "BI", name: "Burundi", cc: "257" },
  { iso: "SS", name: "South Sudan", cc: "211" },
  { iso: "ET", name: "Ethiopia", cc: "251" },
  { iso: "SO", name: "Somalia", cc: "252" },
  { iso: "SD", name: "Sudan", cc: "249" },
  { iso: "DZ", name: "Algeria", cc: "213" },
  { iso: "EG", name: "Egypt", cc: "20" },
  { iso: "GH", name: "Ghana", cc: "233" },
  { iso: "NG", name: "Nigeria", cc: "234" },
  { iso: "ZA", name: "South Africa", cc: "27" },
  { iso: "ZM", name: "Zambia", cc: "260" },
  { iso: "ZW", name: "Zimbabwe", cc: "263" },
  { iso: "CD", name: "DR Congo", cc: "243" },
  { iso: "CI", name: "Côte d'Ivoire", cc: "225" },
  { iso: "SN", name: "Senegal", cc: "221" },
  { iso: "MA", name: "Morocco", cc: "212" },
  { iso: "GB", name: "United Kingdom", cc: "44" },
  { iso: "US", name: "United States", cc: "1" },
  { iso: "IN", name: "India", cc: "91" },
  { iso: "AE", name: "United Arab Emirates", cc: "971" },
  { iso: "CN", name: "China", cc: "86" },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0]; // Uganda

/** Convert an ISO 3166-1 alpha-2 code to its flag emoji. */
export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

/**
 * Parse an E.164-ish string into `{ cc, national }`. Handles:
 *   "+256772145908" → { cc: "256", national: "772145908" }
 *   "256772145908"  → { cc: "256", national: "772145908" }
 *   "0772145908"    → { cc: "256", national: "772145908" }  (assumes UG when defaultCc is "256")
 *   ""              → { cc: defaultCc, national: "" }
 */
export function parsePhone(
  raw: string | undefined,
  defaultCc = DEFAULT_COUNTRY.cc
): { cc: string; national: string } {
  if (!raw) return { cc: defaultCc, national: "" };
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return { cc: defaultCc, national: "" };

  // Leading 0 → national number, prepend default cc.
  if (digits.startsWith("0")) {
    return { cc: defaultCc, national: digits.slice(1) };
  }

  // Try to match the longest known cc as a prefix.
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.cc.length - a.cc.length);
  for (const c of sorted) {
    if (digits.startsWith(c.cc)) {
      return { cc: c.cc, national: digits.slice(c.cc.length) };
    }
  }

  // Otherwise fall back — assume the whole thing is the national part.
  return { cc: defaultCc, national: digits };
}

/** Format `{ cc, national }` back into a canonical E.164 string with leading +. */
export function formatE164(cc: string, national: string): string {
  const nat = national.replace(/[^\d]/g, "");
  const cleanCc = cc.replace(/[^\d]/g, "");
  if (!nat) return "";
  return `+${cleanCc}${nat}`;
}
