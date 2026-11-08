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
    <div className="col" style={{ gap: 6 }}>
      <label htmlFor={id} className="k">{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width,
            height,
            border: "2px solid #201e1d",
            background: value ? "#fff" : undefined,
            overflow: "hidden",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
          className={value ? "" : "ph"}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              style={{
                maxWidth: "82%",
                maxHeight: "82%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <span>tap to<br />upload</span>
          )}
        </div>
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
