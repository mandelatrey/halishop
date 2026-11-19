"use client";

import type { ReactNode } from "react";
import { useTheme, type ThemeChoice } from "@/lib/theme";

const svg = (children: ReactNode) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const THEMES: { value: ThemeChoice; label: string; icon: ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>),
  },
  {
    value: "auto",
    label: "Match system",
    icon: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" /></>),
  },
  {
    value: "dark",
    label: "Dark",
    icon: svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />),
  },
];

/** Light / match system / dark — the same three-way switch as the Kampala Heat Atlas. */
export default function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="theme-switch" role="group" aria-label="Colour theme">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={theme === t.value}
          title={t.label}
          aria-label={t.label}
          onClick={() => setTheme(t.value)}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
