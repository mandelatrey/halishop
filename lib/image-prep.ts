"use client";

import type { ImageMeta } from "./types";

/**
 * Product-photo preparation, run in the browser at upload time.
 *
 * 1. Downscale to at most MAX_EDGE px (keeps Mongo documents small).
 * 2. Look at the border pixels. If they're one flat colour (studio / white
 *    background) or transparent, it's a "cutout": record the background colour
 *    and trim the empty margin around the product, keeping a little air.
 *    Otherwise it's a "photo" (a scene) and is left uncropped.
 * 3. Re-encode (JPEG, or WebP/PNG when there's transparency), shrinking until
 *    it fits MAX_DATA_URL so the save request stays small.
 *
 * Frames then show cutouts whole on their own background colour and let scene
 * photos fill — see components/ProductPhoto.tsx.
 */

const MAX_EDGE = 1600;
/**
 * Upper bound for the stored data URL. Products are saved through a Server
 * Action, whose request body is capped (next.config.ts); a phone photo or a
 * detailed transparent PNG can blow well past that at full size.
 */
const MAX_DATA_URL = 900_000;
/** Max per-channel distance for a pixel to count as "background". */
const TOLERANCE = 26;
/** Share of border samples that must match for a flat background. */
const UNIFORM_SHARE = 0.88;
/** Air kept around a trimmed product, as a share of the product's size. */
const TRIM_MARGIN = 0.06;

type RGBA = [number, number, number, number];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image."));
    img.src = src;
  });
}

function toHex([r, g, b]: RGBA): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function near(a: RGBA, b: RGBA, tol = TOLERANCE) {
  return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
}

/** Sample the outer band of the image and decide if it's a flat or transparent background. */
function readBackground(data: Uint8ClampedArray, w: number, h: number): { bg: RGBA | null; transparent: boolean } {
  const samples: RGBA[] = [];
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.015));
  const step = Math.max(1, Math.round(Math.max(w, h) / 120));
  const px = (x: number, y: number): RGBA => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  for (let x = 0; x < w; x += step) {
    for (let d = 0; d < band; d++) {
      samples.push(px(x, d), px(x, h - 1 - d));
    }
  }
  for (let y = 0; y < h; y += step) {
    for (let d = 0; d < band; d++) {
      samples.push(px(d, y), px(w - 1 - d, y));
    }
  }
  const clear = samples.filter((s) => s[3] < 24).length;
  if (clear / samples.length >= UNIFORM_SHARE) return { bg: null, transparent: true };

  // Median per channel of opaque samples = candidate background colour.
  const opaque = samples.filter((s) => s[3] >= 24);
  const med = (k: 0 | 1 | 2) => opaque.map((s) => s[k]).sort((a, b) => a - b)[Math.floor(opaque.length / 2)];
  const cand: RGBA = [med(0), med(1), med(2), 255];
  const matching = opaque.filter((s) => near(s, cand)).length;
  return matching / samples.length >= UNIFORM_SHARE ? { bg: cand, transparent: false } : { bg: null, transparent: false };
}

/** Bounding box of pixels that aren't background. */
function subjectBox(data: Uint8ClampedArray, w: number, h: number, bg: RGBA | null, transparent: boolean) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  const step = Math.max(1, Math.round(Math.max(w, h) / 600));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      const isBg = transparent ? a < 24 : bg ? a < 24 || near([data[i], data[i + 1], data[i + 2], a], bg) : false;
      if (!isBg) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export type PreparedImage = { dataUrl: string; meta: ImageMeta };

/**
 * Analyse without modifying — used for photos uploaded before preparation
 * existed. Works for data URLs and same-origin images.
 */
export async function analyzeImage(src: string): Promise<ImageMeta> {
  const img = await loadImage(src);
  const scale = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const { bg, transparent } = readBackground(data, w, h);
  const cutout = transparent || !!bg;
  return { w: img.naturalWidth, h: img.naturalHeight, kind: cutout ? "cutout" : "photo", bg: bg ? toHex(bg) : null };
}

/** Full preparation for a new upload: downscale, detect, trim, re-encode. */
export async function prepareProductImage(src: string): Promise<PreparedImage> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const { bg, transparent } = readBackground(data, w, h);
  const cutout = transparent || !!bg;

  let crop = { x: 0, y: 0, w, h };
  if (cutout) {
    const box = subjectBox(data, w, h, bg, transparent);
    // Only trim when there's real empty margin; leave near-full-bleed shots alone.
    if (box && box.w * box.h < w * h * 0.85) {
      const mx = Math.round(box.w * TRIM_MARGIN);
      const my = Math.round(box.h * TRIM_MARGIN);
      const x = Math.max(0, box.x - mx);
      const y = Math.max(0, box.y - my);
      crop = { x, y, w: Math.min(w, box.x + box.w + mx) - x, h: Math.min(h, box.y + box.h + my) - y };
    }
  }

  const out = document.createElement("canvas");
  out.width = crop.w;
  out.height = crop.h;
  const octx = out.getContext("2d")!;
  if (!transparent && bg) {
    octx.fillStyle = toHex(bg);
    octx.fillRect(0, 0, crop.w, crop.h);
  }
  octx.drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const { dataUrl, width, height } = encodeWithinBudget(out, transparent);

  return {
    dataUrl,
    meta: { w: width, h: height, kind: cutout ? "cutout" : "photo", bg: bg ? toHex(bg) : null },
  };
}

/**
 * Encode the canvas, stepping quality down and then size down until the data
 * URL fits MAX_DATA_URL. Transparent images use WebP (keeps alpha at a
 * fraction of PNG's size) where the browser can encode it, else PNG.
 */
function encodeWithinBudget(
  source: HTMLCanvasElement,
  transparent: boolean
): { dataUrl: string; width: number; height: number } {
  const encode = (c: HTMLCanvasElement, q: number) => {
    if (!transparent) return c.toDataURL("image/jpeg", q);
    const webp = c.toDataURL("image/webp", q);
    return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/png");
  };

  let canvas = source;
  for (let attempt = 0; attempt < 8; attempt++) {
    for (const q of [0.88, 0.78, 0.68]) {
      const dataUrl = encode(canvas, q);
      if (dataUrl.length <= MAX_DATA_URL) return { dataUrl, width: canvas.width, height: canvas.height };
    }
    // Still too big at low quality — shrink by 20% and try again.
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(canvas.width * 0.8));
    smaller.height = Math.max(1, Math.round(canvas.height * 0.8));
    smaller.getContext("2d")!.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    canvas = smaller;
  }
  return { dataUrl: encode(canvas, 0.68), width: canvas.width, height: canvas.height };
}
