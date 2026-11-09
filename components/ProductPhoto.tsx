"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { analyzeImage } from "@/lib/image-prep";
import type { ImageFit, ImageMeta } from "@/lib/types";

/**
 * One way to put a product photo in any frame, used site-wide (shop cards,
 * product page, admin thumbnails, status cards).
 *
 *   cutout (studio / plain background) → the whole product, centred with a
 *     little air, on the photo's own background colour so the frame extends it
 *     seamlessly. Never cropped.
 *   photo (a scene) → fills the frame. If the frame's shape is very different
 *     from the photo's (e.g. a landscape shot in a 9:16 card), it's shown whole
 *     over a soft blurred copy instead of being heavily cropped.
 *
 * Photos uploaded before upload-time analysis existed have no `meta`; they're
 * analysed here on load and default to "show whole" until then, so nothing is
 * ever clipped while we find out.
 *
 * The parent sets the frame size; this fills it (position: relative parent not
 * required — it positions itself absolutely inside a relative wrapper).
 * Inline styles only, so html-to-image can snapshot it for card exports.
 */
export default function ProductPhoto({
  src,
  meta,
  fit = "auto",
  label,
  padding = 0.07,
  reserveTop = 0,
  reserveBottom = 0,
  grayscale = false,
  style,
}: {
  src?: string;
  meta?: ImageMeta;
  fit?: ImageFit;
  /** Placeholder text when there's no photo. */
  label?: string;
  /** Air around a whole-product (contain) photo, as a share of the frame. */
  padding?: number;
  /** Share of the frame covered by overlays (text panels) — whole-product photos avoid it. */
  reserveTop?: number;
  reserveBottom?: number;
  grayscale?: boolean;
  style?: CSSProperties;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [learned, setLearned] = useState<ImageMeta | null>(null);
  const [frameRatio, setFrameRatio] = useState<number | null>(null);
  const m = meta ?? learned ?? undefined;

  // Older photos: work out cutout vs scene in the browser.
  useEffect(() => {
    if (!src || meta) return;
    let alive = true;
    analyzeImage(src)
      .then((r) => alive && setLearned(r))
      .catch(() => {
        /* cross-origin or undecodable — keep the safe "show whole" default */
      });
    return () => {
      alive = false;
    };
  }, [src, meta]);

  // Scene photos need the frame's shape to decide fill vs show-whole.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setFrameRatio(r.width / r.height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frame: CSSProperties = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    ...style,
  };

  if (!src) {
    return (
      <div ref={frameRef} style={frame}>
        <div className="ph" style={{ width: "100%", height: "100%", borderRadius: 0 }}>
          {label}
        </div>
      </div>
    );
  }

  // Decide the mode.
  let mode: "cover" | "contain-bg" | "contain-blur";
  if (fit === "cover") mode = "cover";
  else if (!m) mode = "contain-bg"; // unknown yet → never clip
  else if (m.kind === "cutout") mode = "contain-bg";
  else if (fit === "contain") mode = "contain-blur";
  else {
    // Auto scene photo: fill unless the shapes are far apart (>45% off).
    const imgRatio = m.w / m.h;
    const off = frameRatio ? Math.abs(Math.log(frameRatio / imgRatio)) : 0;
    mode = off > Math.log(1.45) ? "contain-blur" : "cover";
  }

  const filter = grayscale ? "grayscale(1)" : undefined;
  const bg = m?.kind === "cutout" ? m.bg ?? "#ffffff" : "#f3f2f1";

  if (mode === "cover") {
    return (
      <div ref={frameRef} style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter }} />
      </div>
    );
  }

  const pad = (n: number) => `${(n * 100).toFixed(2)}%`;
  const inset = `${pad(padding + reserveTop)} ${pad(padding)} ${pad(padding + reserveBottom)} ${pad(padding)}`;

  return (
    <div ref={frameRef} style={{ ...frame, background: mode === "contain-bg" ? bg : "#e9e7e5" }}>
      {mode === "contain-blur" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: `blur(18px) saturate(1.1)${grayscale ? " grayscale(1)" : ""}`,
            transform: "scale(1.2)",
            opacity: 0.55,
          }}
        />
      )}
      {/* The inset box is the area the whole product must fit in; the image
          fills it with object-fit: contain, scaling up or down as needed. */}
      <div
        style={{
          position: "absolute",
          inset: mode === "contain-blur" ? `${pad(reserveTop)} 0 ${pad(reserveBottom)} 0` : inset,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", filter }}
        />
      </div>
    </div>
  );
}
