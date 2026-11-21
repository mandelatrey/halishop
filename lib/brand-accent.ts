import type { CSSProperties } from "react";
import { contrastRatio, hexToHsl, hslToHex, normalizeHex } from "./palette";
import type { BrandKit, Storefront } from "./types";

/**
 * Button colour for the buyer pages. The seller picks Haali orange or one of
 * their brand colours (Storefront.buttons); this turns that into the accent
 * tokens the buyer CSS already reads (--color-accent-fill, -soft, -dark, …),
 * scoped to the page by the `.brand-buttons` class (app/globals.css).
 *
 * Buttons always carry white text, so the fill is darkened until white reads
 * on it (WCAG AA, 4.5:1). Text-coloured uses get their own tones for light and
 * dark mode, and in dark mode a very dark fill is lifted so buttons don't sink
 * into the page.
 */

const WHITE = "#ffffff";
const DARK_PANEL = "#17191c"; // --color-panel in dark mode

/** Step lightness in `dir` until `ok` holds (or it runs out of room). */
function walk(hex: string, dir: -1 | 1, ok: (c: string) => boolean): string {
  const [h, s, l0] = hexToHsl(hex);
  let l = l0;
  let c = normalizeHex(hex);
  while (!ok(c) && (dir < 0 ? l > 0 : l < 100)) {
    l = Math.max(0, Math.min(100, l + dir * 1.5));
    c = hslToHex(h, s, l);
  }
  return c;
}

function shift(hex: string, by: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + by)));
}

export type AccentTones = {
  /** Button fill (white text), light and dark mode. */
  fill: string;
  fillDark: string;
  /** Accent-coloured text on white / soft backgrounds. */
  ink: string;
  /** Accent-coloured text on dark panels. */
  inkDark: string;
  /** True when the seller's colour had to be darkened for white text. */
  adjusted: boolean;
};

export function accentTones(raw: string): AccentTones {
  const base = normalizeHex(raw);
  const readable = (c: string) => contrastRatio(c, WHITE) >= 4.5;
  const fill = walk(base, -1, readable);
  // Dark mode: lift near-black fills off the page while white text still reads.
  let fillDark = fill;
  if (contrastRatio(fill, DARK_PANEL) < 3) {
    const lifted = walk(fill, 1, (c) => contrastRatio(c, DARK_PANEL) >= 3);
    if (readable(lifted)) fillDark = lifted;
  }
  return {
    fill,
    fillDark,
    ink: walk(base, -1, (c) => contrastRatio(c, WHITE) >= 5.2),
    inkDark: walk(base, 1, (c) => contrastRatio(c, DARK_PANEL) >= 5),
    adjusted: fill !== base,
  };
}

/** The seller's chosen colour, or null for Haali orange. */
export function buttonColour(brand: BrandKit, buttons: Storefront["buttons"] | undefined): string | null {
  if (buttons === "accent") return brand.palette.accent;
  if (buttons === "primary") return brand.palette.primary;
  return null;
}

/**
 * Props for the element that scopes the colour (a page's <main>).
 * Spread onto it: `<main {...buttonScope(brand, buttons, "by-wrap")}>`.
 */
export function buttonScope(
  brand: BrandKit,
  buttons: Storefront["buttons"] | undefined,
  className: string
): { className: string; style?: CSSProperties } {
  return buttonScopeFor(buttonColour(brand, buttons), className);
}

/** Same, from a colour directly (null = Haali orange). */
export function buttonScopeFor(hex: string | null, className: string): { className: string; style?: CSSProperties } {
  if (!hex) return { className };
  const t = accentTones(hex);
  return {
    className: `${className} brand-buttons`,
    style: {
      "--bb-fill": t.fill,
      "--bb-fill-hover": shift(t.fill, t.fill === "#000000" || hexToHsl(t.fill)[2] < 14 ? 9 : -7),
      "--bb-ink": t.ink,
      "--bb-fill-d": t.fillDark,
      "--bb-fill-hover-d": shift(t.fillDark, 7),
      "--bb-ink-d": t.inkDark,
    } as CSSProperties,
  };
}
