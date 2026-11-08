"use client";

import { useId, useRef } from "react";
import { fileToDataUrl } from "@/lib/render-card";

type Props = {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
  width?: number;
  height?: number;
};

export default function ImageSlot({
  value,
  onChange,
  label = "Upload image",
  width = 96,
  height = 96,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File | undefined) {
    if (!f) return;
    const url = await fileToDataUrl(f);
    onChange(url);
  }

  return (
    <div className="ad-field">
      <label htmlFor={id} className="k">{label}</label>
      <div className="ad-slot">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ width, height }}
          className={`ad-slot-box${value ? " filled" : ""}`}
          aria-label={value ? `Replace ${label}` : `Upload ${label}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" />
          ) : (
            <span className="ad-slot-empty"><b>+</b>Upload</span>
          )}
        </button>
        {value && (
          <button type="button" className="btn gh" onClick={() => onChange(undefined)}>
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
