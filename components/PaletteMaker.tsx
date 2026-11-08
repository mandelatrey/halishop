"use client";

import { useMemo, useRef } from "react";
import {
  contrastRatio,
  derivePalette,
  HARMONY_HINT,
  HARMONY_LABEL,
  normalizeHex,
  type Harmony,
} from "@/lib/palette";
import type { BrandPalette } from "@/lib/types";

const HARMONIES: Harmony[] = [
  "complementary",
  "analogous",
  "triadic",
  "split-complementary",
  "monochrome",
];

type Props = {
  value: BrandPalette;
  onChange: (next: BrandPalette) => void;
};

export default function PaletteMaker({ value, onChange }: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const primary = normalizeHex(value.primary);

  function scrollToPreview() {
    // Wait a tick so the accent update lands before the scroll animates.
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
  const derived = useMemo(
    () => derivePalette(primary, value.harmony, value.accent),
    [primary, value.harmony, value.accent]
  );

  const contrastPrimary = contrastRatio(derived.primary, derived.primaryFg);
  const contrastAccent = contrastRatio(derived.accent, derived.accentFg);

  return (
    <div className="col" style={{ gap: 18 }}>
      {/* Primary picker */}
      <div className="col" style={{ gap: 8 }}>
        <span className="k">Brand colour</span>
        <div className="row" style={{ gap: 12 }}>
          <button
            type="button"
            className="pm-well"
            onClick={() => colorInputRef.current?.click()}
            aria-label="Pick brand colour"
            style={{ background: primary }}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={primary}
            onChange={(e) => onChange({ ...value, primary: normalizeHex(e.target.value) })}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
          />
          <div className="col" style={{ gap: 4 }}>
            <input
              className="inp"
              value={primary.toUpperCase()}
              onChange={(e) => onChange({ ...value, primary: normalizeHex(e.target.value) })}
              style={{ width: 118, fontFamily: "ui-monospace, Menlo, monospace" }}
            />
            <span className="s" style={{ fontSize: 10.5 }}>
              Card footer background · text is auto-picked for contrast
            </span>
          </div>
        </div>
      </div>

      {/* Harmony strategy */}
      <div className="col" style={{ gap: 6 }}>
        <span className="k">Harmony</span>
        <div className="pm-harmony">
          {HARMONIES.map((h) => (
            <button
              key={h}
              type="button"
              className={`pm-harmony-chip${value.harmony === h ? " on" : ""}`}
              onClick={() =>
                onChange({
                  ...value,
                  harmony: h,
                  // If the current accent is one of the previous harmony's suggestions, replace it.
                  accent: derived.suggestions.includes(value.accent)
                    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      derivePalette(primary, h, "#000").suggestions[0]!
                    : value.accent,
                })
              }
              aria-pressed={value.harmony === h}
            >
              {HARMONY_LABEL[h]}
            </button>
          ))}
        </div>
        <span className="s">{HARMONY_HINT[value.harmony]}</span>
      </div>

      {/* Accent suggestions from the wheel */}
      <div className="col" style={{ gap: 8 }}>
        <div className="pm-accent-header">
          <span className="k">Accent (price / CTAs)</span>
          <span className="s pm-accent-hint">
            {derived.suggestions.length} suggestion{derived.suggestions.length === 1 ? "" : "s"} from the wheel
          </span>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {derived.suggestions.map((s) => {
            const chosen = normalizeHex(value.accent) === normalizeHex(s);
            return (
              <button
                key={s}
                type="button"
                className={`pm-chip${chosen ? " on" : ""}`}
                style={{ background: s }}
                onClick={() => {
                  onChange({ ...value, accent: s });
                  scrollToPreview();
                }}
                aria-label={`Use accent ${s}`}
                title={s}
              />
            );
          })}
          <label className="pm-custom" aria-label="Custom accent" title="Custom accent">
            <input
              type="color"
              value={normalizeHex(value.accent)}
              onChange={(e) => onChange({ ...value, accent: normalizeHex(e.target.value) })}
              onBlur={scrollToPreview}
              style={{ opacity: 0, position: "absolute", width: 0, height: 0 }}
            />
            <span style={{ background: normalizeHex(value.accent) }} />
            <span className="pm-custom-icon">✎</span>
          </label>
        </div>
      </div>

      {/* Live palette preview */}
      <div ref={previewRef} className="col" style={{ gap: 8, scrollMarginTop: 80 }}>
        <span className="k">Preview</span>
        <div className="pm-preview">
          <div className="pm-swatch" style={{ background: derived.primary, color: derived.primaryFg }}>
            <span className="pm-swatch-role">Primary</span>
            <span className="pm-swatch-hex">{derived.primary.toUpperCase()}</span>
            <span className="pm-swatch-contrast">
              {contrastPrimary.toFixed(1)}:1 · {contrastLabel(contrastPrimary)}
            </span>
          </div>
          <div className="pm-swatch" style={{ background: derived.accent, color: derived.accentFg }}>
            <span className="pm-swatch-role">Accent</span>
            <span className="pm-swatch-hex">{derived.accent.toUpperCase()}</span>
            <span className="pm-swatch-contrast">
              {contrastAccent.toFixed(1)}:1 · {contrastLabel(contrastAccent)}
            </span>
          </div>
          <div className="pm-swatch" style={{ background: derived.primary, color: derived.primaryFg }}>
            <span className="pm-swatch-role">Card sample</span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize: 13,
                lineHeight: 1.1,
              }}
            >
              T-SHIRT BLACK
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize: 16,
                color: derived.accent,
              }}
            >
              UGX 35,000
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pm-harmony {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pm-harmony-chip {
          flex: 0 0 auto;
          padding: 7px 12px;
          border: 1px solid var(--stroke-soft);
          background: transparent;
          border-radius: 999px;
          font: 600 10.5px/1 "DM Sans", sans-serif;
          letter-spacing: 0.01em;
          color: var(--color-mute);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .pm-harmony-chip:hover {
          color: var(--color-text);
          border-color: var(--stroke-strong);
        }
        .pm-harmony-chip.on {
          background: var(--color-text);
          color: #fff;
          border-color: var(--color-text);
        }
        .pm-accent-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .pm-accent-hint {
          text-align: right;
        }
        @media (max-width: 480px) {
          .pm-accent-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          .pm-accent-hint {
            text-align: left;
          }
        }
        .pm-well {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          border: 1px solid rgba(32, 30, 29, 0.14);
          padding: 3px;
          background-clip: content-box;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .pm-well:hover { transform: scale(1.04); border-color: rgba(32, 30, 29, 0.28); }
        .pm-chip {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(32, 30, 29, 0.14);
          padding: 3px;
          background-clip: content-box;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .pm-chip:hover { transform: scale(1.05); }
        .pm-chip.on { border-color: #135aed; border-width: 2px; padding: 2px; }
        .pm-custom {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px dashed rgba(32, 30, 29, 0.28);
          display: grid;
          place-items: center;
          position: relative;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .pm-custom:hover { border-color: #135aed; }
        .pm-custom > span:first-of-type {
          width: 30px;
          height: 30px;
          border-radius: 999px;
        }
        .pm-custom-icon {
          position: absolute;
          right: -2px;
          bottom: -2px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid rgba(32, 30, 29, 0.14);
          display: grid;
          place-items: center;
          font: 700 10px/1 ui-monospace, Menlo, monospace;
          color: #201e1d;
        }
        .pm-preview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        @media (max-width: 640px) {
          .pm-preview { grid-template-columns: 1fr; }
        }
        .pm-swatch {
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 108px;
          border: 1px solid rgba(32, 30, 29, 0.08);
        }
        .pm-swatch-role {
          font: 700 8.5px/1 ui-monospace, Menlo, monospace;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.78;
        }
        .pm-swatch-hex {
          font: 700 12px/1 ui-monospace, Menlo, monospace;
          letter-spacing: 0.02em;
        }
        .pm-swatch-contrast {
          font: 400 10px/1.3 ui-monospace, Menlo, monospace;
          opacity: 0.7;
          margin-top: auto;
        }
      `}</style>
    </div>
  );
}

function contrastLabel(ratio: number): string {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Low contrast";
}
