"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the top nav `data-scrolled` once the page has scrolled, so the nav can
 * stay transparent at the top (letting the page's background show through)
 * and only take its frosted background when content passes under it.
 */
export default function NavScrollState() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const nav = ref.current?.closest("header");
    if (!nav) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      nav.toggleAttribute("data-scrolled", window.scrollY > 4);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return <span ref={ref} hidden />;
}
