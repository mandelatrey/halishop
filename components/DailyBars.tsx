"use client";

import { useState } from "react";

/**
 * Single-series daily bar chart (one measure per chart — never two scales on
 * one axis). Bars have 4px rounded tops anchored to the baseline, a 2px gap,
 * recessive gridlines, and a hover readout with a full-height hit target.
 */
export default function DailyBars({
  points,
  label,
  unit,
  color = "var(--color-accent)",
}: {
  points: { day: string; value: number }[];
  /** Accessible name, e.g. "Visits per day". */
  label: string;
  /** Singular/plural unit for the readout, e.g. ["visit", "visits"]. */
  unit: [string, string];
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 440;
  const H = 140;
  const top = 8;
  const bottom = 20;
  const left = 28;
  const plotH = H - top - bottom;
  const plotW = W - left;
  const n = Math.max(points.length, 1);
  const slot = plotW / n;
  const gap = 2;
  const barW = Math.max(slot - gap, 1);

  const max = Math.max(...points.map((p) => p.value), 0);
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const ticks = [0, niceMax / 2, niceMax];
  const total = points.reduce((s, p) => s + p.value, 0);

  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const shown = hover !== null ? points[hover] : null;
  const readout = shown
    ? `${fmtDay(shown.day)} · ${shown.value} ${shown.value === 1 ? unit[0] : unit[1]}`
    : `${total} ${total === 1 ? unit[0] : unit[1]} in ${points.length} days`;

  return (
    <figure style={{ margin: 0 }}>
      <div className="db-delta" aria-live="polite" style={{ minHeight: 14, marginBottom: 8 }}>
        {readout}
      </div>
      <svg
        className="db-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label}: ${total} total over ${points.length} days`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => {
          const y = top + plotH - (t / niceMax) * plotH;
          return (
            <g key={t}>
              <line className="grid" x1={left} x2={W} y1={y} y2={y} />
              <text x={left - 6} y={y + 3} textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const h = niceMax ? (p.value / niceMax) * plotH : 0;
          const x = left + i * slot + gap / 2;
          const y = top + plotH - h;
          const r = Math.min(4, barW / 2, h);
          const d =
            h > 0
              ? `M${x},${top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${top + plotH} Z`
              : "";
          return (
            <g key={p.day}>
              {d && <path d={d} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />}
              <rect
                x={left + i * slot}
                y={top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${fmtDay(p.day)}: ${p.value}`}
              />
            </g>
          );
        })}
        {[0, points.length - 1].filter((i, k, a) => points[i] && a.indexOf(i) === k).map((i) => (
          <text key={i} x={left + i * slot + slot / 2} y={H - 4} textAnchor={i === 0 ? "start" : "end"}>
            {fmtDay(points[i].day)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
