"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useIsDesktop } from "./use-desktop";
import type { WhatsAppTarget } from "./wa";

/**
 * On desktop, buyers choose where WhatsApp links open: WhatsApp Web in the
 * browser, or the installed desktop app. The choice is remembered on this
 * computer (localStorage) and shared by every send button on the page.
 * Phones always use wa.me, which opens the app directly.
 */

const KEY = "hali:wa-target";
const EVENT = "hali:wa-target";

function read(): "web" | "app" {
  try {
    return window.localStorage.getItem(KEY) === "app" ? "app" : "web";
  } catch {
    return "web";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useWhatsAppTarget(): {
  desktop: boolean;
  /** Where links open: "web" / "app" on desktop, always "wa.me" on phones. */
  target: WhatsAppTarget;
  choice: "web" | "app";
  setChoice: (c: "web" | "app") => void;
} {
  const desktop = useIsDesktop();
  const choice = useSyncExternalStore(subscribe, read, () => "web" as const);
  const setChoice = useCallback((c: "web" | "app") => {
    try {
      window.localStorage.setItem(KEY, c);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { desktop, target: desktop ? choice : "wa.me", choice, setChoice };
}
