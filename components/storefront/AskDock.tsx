"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Keeps the shop's "Ask on WhatsApp" button in reach. It sits in the shop bar
 * like any button; once the bar scrolls up under the site nav, the button
 * docks — fixed just below the nav, at the same distance from the right edge —
 * and goes back into the bar when you scroll up. The slot it leaves keeps its
 * size, so nothing in the bar shifts.
 */
export default function AskDock({ children }: { children: ReactNode }) {
  const slot = useRef<HTMLSpanElement>(null);
  const [dock, setDock] = useState<{ top: number; right: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const navHeight = () => (document.querySelector(".app-nav") as HTMLElement | null)?.offsetHeight ?? 0;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nav = navHeight();
        const r = el.getBoundingClientRect();
        // Dock once the button's own spot has gone up behind the nav.
        if (r.top < nav + 8) {
          setDock({
            top: nav + 10,
            right: document.documentElement.clientWidth - r.right,
            w: r.width,
            h: r.height,
          });
        } else setDock(null);
      });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <span
      ref={slot}
      className="by-ask-slot"
      style={dock ? ({ width: dock.w, height: dock.h } as CSSProperties) : undefined}
    >
      <span
        className={`by-ask-dock${dock ? " is-docked" : ""}`}
        style={dock ? ({ top: dock.top, right: dock.right } as CSSProperties) : undefined}
      >
        {children}
      </span>
    </span>
  );
}
