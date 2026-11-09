"use client";

import { toPng } from "html-to-image";

/** Status images are exported at WhatsApp/Instagram story size: 1080×1920. */
export const EXPORT_WIDTH = 1080;

export async function downloadCardAsPng(node: HTMLElement, filename: string) {
  // Scale from whatever size the preview is drawn at (200px on desktop,
  // smaller on phones) up to exactly 1080px wide → a 1080×1920 PNG.
  // canvasWidth/Height fix the output to exactly 1080×1920 (a fractional
  // preview height would otherwise round to 1921/1922).
  const dataUrl = await toPng(node, {
    pixelRatio: 1,
    canvasWidth: EXPORT_WIDTH,
    canvasHeight: Math.round((EXPORT_WIDTH * 16) / 9),
    cacheBust: true,
    style: { transform: "none" },
    skipFonts: false,
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = dataUrl;
  });
}
