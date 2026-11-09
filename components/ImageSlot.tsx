"use client";

import { useId, useRef } from "react";
import { fileToDataUrl } from "@/lib/render-card";
import { useFileDrop } from "@/lib/use-file-drop";

type Props = {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
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
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const { dragging, error, take, dropProps } = useFileDrop(async (f) => {
    onChange(await fileToDataUrl(f));
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
