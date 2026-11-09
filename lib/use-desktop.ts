"use client";

import { useEffect, useState } from "react";

/**
 * True on desktop browsers (no touch-first pointer, not a phone/tablet UA).
 * Starts false so server and first client render agree; flips after mount.
 * Used to send WhatsApp links straight to WhatsApp Web on desktop instead of
 * wa.me's "Open app / Continue to WhatsApp Web" page.
 */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Silk|Opera Mini/i.test(ua);
    // iPadOS reports a Mac UA but has touch points.
    const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    setDesktop(!mobileUa && !iPadOs && !coarse);
  }, []);
  return desktop;
}
