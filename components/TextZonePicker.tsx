"use client";

import type { TextZone } from "@/lib/types";

const ZONES: TextZone[] = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

type Props = {
  value: TextZone;
  onChange: (z: TextZone) => void;
};

export default function TextZonePicker({ value, onChange }: Props) {
  return (
    <div className="zonepick" role="radiogroup" aria-label="Text zone">
      {ZONES.map((z) => (
        <button
          key={z}
          type="button"
          role="radio"
          aria-checked={z === value}
          className={z === value ? "on" : ""}
          onClick={() => onChange(z)}
          title={z}
        >
          {z === value ? "TEXT" : ""}
        </button>
      ))}
    </div>
  );
}
