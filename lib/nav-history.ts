"use client";

/**
 * This tab's trail of Haali pages (sessionStorage) and where we are in it, so
 * a Back button knows whether going back stays on the site. Someone who
 * landed on a shop straight from a WhatsApp status has nothing on Haali to go
 * back to — their Back button opens the shops directory instead.
 *
 * New pages are pushed; browser back/forward (popstate, or a page loaded by
 * it) moves the position instead, like the browser's own history.
 */

const KEY = "hali:trail";
const MAX = 50;
type Trail = { pages: string[]; pos: number };

function read(): Trail {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (v && Array.isArray(v.pages) && typeof v.pos === "number") return v;
  } catch {
    /* fall through */
  }
  return { pages: [], pos: -1 };
}

function write(t: Trail) {
  const drop = Math.max(0, t.pages.length - MAX);
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ pages: t.pages.slice(drop), pos: t.pos - drop }));
  } catch {
    /* storage off: Back always uses its fallback */
  }
}

/** A page change. `traversal`: it came from the browser's back/forward. */
export function recordVisit(path: string, traversal: boolean) {
  const t = read();
  if (t.pages[t.pos] === path) return; // same page (reload, filter change)
  if (traversal && t.pages[t.pos - 1] === path) t.pos -= 1;
  else if (traversal && t.pages[t.pos + 1] === path) t.pos += 1;
  else {
    t.pages = [...t.pages.slice(0, t.pos + 1), path];
    t.pos = t.pages.length - 1;
  }
  write(t);
  window.dispatchEvent(new Event(TRAIL_EVENT));
}

export const TRAIL_EVENT = "hali:trail";

/** Is there a Haali page to go back to? */
export const canGoBack = () => read().pos > 0;
