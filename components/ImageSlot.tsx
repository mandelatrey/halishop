"use client";

import { useId, useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/render-card";
import { useFileDrop } from "@/lib/use-file-drop";
import { prepareProductImage } from "@/lib/image-prep";
import type { ImageMeta } from "@/lib/types";

type Props = {
  value?: string;
  /** `meta` is set when `prepare` is on (product photos). */
  onChange: (dataUrl: string | undefined, meta?: ImageMeta) => void;
  /** Downscale, detect plain backgrounds and trim empty margins on upload. */
  prepare?: boolean;
  label?: string;
  width?: number;
  height?: number;
};

/** Square image upload (logo, product photo): click or drag an image onto it. */
export default function ImageSlot({
  value,
  onChange,
  label = "Upload image",
  width = 96,
  height = 96,
  prepare = false,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const { dragging, error, setError, take, dropProps } = useFileDrop(async (f) => {
    const raw = await fileToDataUrl(f);
    if (!prepare) return onChange(raw);
    setBusy(true);
    try {
      const { dataUrl, meta } = await prepareProductImage(raw);
      onChange(dataUrl, meta);
    } catch {
      setError("Couldn't read that image — try a PNG or JPG.");
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="ad-field">
      <label htmlFor={id} className="k">{label}</label>
      <div className="ad-slot">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ width, height }}
          className={`ad-slot-box${value ? " filled" : ""}${dragging ? " dragging" : ""}`}
          aria-label={value ? `Replace ${label} (or drop an image)` : `Upload ${label} (or drop an image)`}
          {...dropProps}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" />
          ) : (
            <span className="ad-slot-empty"><b>+</b>Upload</span>
          )}
          {dragging && <span className="ad-slot-drop">Drop to {value ? "replace" : "upload"}</span>}
          {busy && <span className="ad-slot-drop">Preparing…</span>}
        </button>
        <div className="ad-slot-side">
          {value && (
            <button type="button" className="btn gh" onClick={() => onChange(undefined)}>
              Remove
            </button>
          )}
          <span className="ad-hint">{value ? "Click or drop an image to replace." : "Click or drag an image here."}</span>
        </div>
      </div>
      {error && <span className="ad-upload-error" role="alert">{error}</span>}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = ""; // allow re-picking the same file
        }}
      />
    </div>
  );
}
