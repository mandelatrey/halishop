"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import "./storefront.css";

/**
 * Swipeable banner carousel. Scroll-snap does the swiping (native momentum on
 * phones, no drag library); buttons and dots scroll the track. Autoplay
 * advances every `interval` ms and holds while the pointer or focus is on it,
 * while the tab is hidden, and always under prefers-reduced-motion. A
 * pause/play toggle is offered whenever it's moving (WCAG 2.2.2).
 */
export default function BannerCarousel({
  children,
  autoplay = true,
  interval = 6000,
  label = "Featured",
}: {
  children: ReactNode;
  autoplay?: boolean;
  interval?: number;
  label?: string;
}) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const vis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el || n === 0) return;
      const next = ((i % n) + n) % n;
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [n, reduced]
  );

  // Index follows the scroll position, however it got there (swipe, button, focus).
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(Math.min(n - 1, Math.max(0, i)));
  };

  // Keep the current slide in place when the track's width changes.
  const indexRef = useRef(0);
  indexRef.current = index;
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.scrollTo({ left: indexRef.current * width, behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moving = autoplay && n > 1 && !reduced;
  useEffect(() => {
    if (!moving || paused || hold || hidden) return;
    const t = window.setTimeout(() => go(index + 1), interval);
    return () => window.clearTimeout(t);
  }, [moving, paused, hold, hidden, index, interval, go]);

  if (n === 0) return null;

  return (
    <section
      className="by-car"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => setHold(false)}
      onTouchStart={() => setHold(true)}
      onTouchEnd={() => window.setTimeout(() => setHold(false), 2500)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      }}
    >
      <div className="by-car-track" ref={track} onScroll={onScroll}>
        {slides.map((s, i) => (
          <div
            key={i}
            className="by-car-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${n}`}
          >
            {s}
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button type="button" className="by-car-arrow prev" onClick={() => go(index - 1)} aria-label="Previous slide">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" className="by-car-arrow next" onClick={() => go(index + 1)} aria-label="Next slide">
            <ChevronRight size={20} aria-hidden />
          </button>
          <div className="by-car-ctrl">
            <div className="by-car-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="by-car-dot"
                  aria-label={`Show slide ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            {moving && (
              <button
                type="button"
                className="by-car-pause"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              >
                {paused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
