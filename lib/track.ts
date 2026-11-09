"use client";

import type { ShopEventType } from "./types";

/** Fire-and-forget buyer event. Uses sendBeacon so it survives navigating away to WhatsApp. */
export function track(slug: string, type: ShopEventType, extra?: { code?: string; dropId?: string }) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ slug, type, ...extra });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall back to fetch */
  }
  void fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(
    () => {}
  );
}
