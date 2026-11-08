/**
 * Palette math — HSL rotation for harmonies, luminance for contrast picking.
 * All hex strings are normalized to lowercase `#rrggbb`.
 */

export type Harmony =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "monochrome";

export const HARMONY_LABEL: Record<Harmony, string> = {
  complementary: "Complementary",
  analogous: "Analogous",
  triadic: "Triadic",
  "split-complementary": "Split-comp.",
  monochrome: "Monochrome",
};

export const HARMONY_HINT: Record<Harmony, string> = {
  complementary: "Opposite hue on the wheel — highest energy, use sparingly.",
  analogous: "Neighbours on the wheel — calm and cohesive.",
  triadic: "Three evenly-spaced hues — balanced, playful.",
  "split-complementary": "Opposite plus its two neighbours — softer than pure complementary.",
  monochrome: "Same hue, different lightness — quietly premium.",
};

/* -------------------------------------------------------------------------
 * Colour conversion
 * ------------------------------------------------------------------------- */

export function normalizeHex(hex: string): string {
  let h = hex.trim().toLowerCase();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/.test(h)) return "#000000";
  return `#${h}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const to = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/* -------------------------------------------------------------------------
 * Contrast — WCAG relative luminance
 * ------------------------------------------------------------------------- */

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick whichever of `light` / `dark` has higher contrast with `bg`. */
export function bestForeground(
  bg: string,
  light: string = "#f3f2f1",
  dark: string = "#201e1d"
): string {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

/* -------------------------------------------------------------------------
 * Harmony suggestions
 * ------------------------------------------------------------------------- */

export function suggestAccents(primary: string, harmony: Harmony): string[] {
  const [h, s, l] = hexToHsl(primary);

  // Boost saturation & lightness so accents actually pop when primary is dark/desaturated.
  const isNeutral = s < 12;
  const accentS = isNeutral ? 78 : Math.max(58, s);
  const accentL = isNeutral ? 50 : l < 42 ? 56 : Math.max(42, Math.min(58, l));

  const rot = (deg: number) => hslToHex(h + deg, accentS, accentL);

  switch (harmony) {
    case "complementary":
      // Neutral primaries have no meaningful complement — return a curated pair.
      if (isNeutral) return ["#135aed", "#ec6a13"];
      return [rot(180), rot(180 + 15), rot(180 - 15)];
    case "analogous":
      return [rot(30), rot(-30), rot(45)];
    case "triadic":
      return [rot(120), rot(-120), rot(60)];
    case "split-complementary":
      if (isNeutral) return ["#135aed", "#13ed6a", "#ed136a"];
      return [rot(150), rot(-150), rot(180)];
    case "monochrome":
      // Same hue, walk the lightness axis away from primary.
      return [
        hslToHex(h, Math.min(90, accentS), Math.max(30, l < 50 ? l + 34 : l - 34)),
        hslToHex(h, Math.min(90, accentS), Math.max(20, l < 50 ? l + 22 : l - 22)),
        hslToHex(h, Math.min(90, accentS), Math.min(70, l < 50 ? l + 50 : l - 50)),
      ];
  }
}

/* -------------------------------------------------------------------------
 * Derived palette used by cards / templates
 * ------------------------------------------------------------------------- */

export type DerivedPalette = {
  primary: string;
  primaryFg: string;
  primaryMuted: string;
  accent: string;
  accentFg: string;
  suggestions: string[];
};

export function derivePalette(
  primary: string,
  harmony: Harmony,
  accent: string
): DerivedPalette {
  const suggestions = suggestAccents(primary, harmony);
  const primaryFg = bestForeground(primary, "#f3f2f1", "#1a1a1a");
  const accentFg = bestForeground(accent, "#ffffff", "#1a1a1a");
  // Muted text on primary — a semi-transparent version of the foreground.
  const primaryMuted =
    primaryFg === "#1a1a1a"
      ? "rgba(26, 26, 26, 0.62)"
      : "rgba(243, 242, 241, 0.62)";
  return { primary, primaryFg, primaryMuted, accent, accentFg, suggestions };
}
