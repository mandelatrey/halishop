"use client";

import { useCallback, useEffect, useState } from "react";
import type { BuyerRecall } from "./types";

const KEY = "hali:buyer";

function read(): BuyerRecall | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuyerRecall;
    if (!parsed.whatsapp) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists the buyer's WhatsApp number + delivery area across visits to any
 * `/shop/[slug]/[code]` page. Powers the one-tap repeat-buyer flow (screen 1h).
 */
export function useBuyerRecall() {
  const [recall, setRecall] = useState<BuyerRecall | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecall(read());
    setReady(true);
  }, []);

  const save = useCallback((next: BuyerRecall) => {
    setRecall(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    }
  }, []);

  const clear = useCallback(() => {
    setRecall(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KEY);
    }
  }, []);

  return { recall, save, clear, ready };
}
