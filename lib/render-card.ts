"use client";

import { toPng } from "html-to-image";

export async function downloadCardAsPng(node: HTMLElement, filename: string) {
  // pixelRatio 3 → a 360×640 preview becomes a ~1080×1920 PNG, i.e. a real 9:16 status image
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
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
