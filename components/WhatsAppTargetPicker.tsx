"use client";

import { useWhatsAppTarget } from "@/lib/wa-target";
import "./wa-target.css";

/**
 * "Open in: WhatsApp Web | Desktop app" — desktop only (renders nothing on
 * phones). The choice is remembered and applies to every send button.
 */
export default function WhatsAppTargetPicker() {
  const { desktop, choice, setChoice } = useWhatsAppTarget();
  if (!desktop) return null;
  return (
    <div className="by-watarget" role="radiogroup" aria-label="Open WhatsApp in">
      <span className="by-watarget-l">Open in</span>
      {(
        [
          ["web", "WhatsApp Web"],
          ["app", "Desktop app"],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={choice === v}
          className={choice === v ? "on" : ""}
          onClick={() => setChoice(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
