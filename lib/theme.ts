"use client";

import { useEffect, useState } from "react";

export type ThemeChoice = "auto" | "light" | "dark";
export const THEME_KEY = "haali-theme";

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

/**
 * Light, dark or follow the system; remembered per browser (a convenience only).
 * An explicit choice sets `data-theme` on <html>; "auto" removes it so the
 * `prefers-color-scheme` rules in globals.css apply.
 */
export function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  // Start at "auto" on the server and the first client render, then read the
  // saved choice — the inline script in app/layout.tsx has already applied it.
  const [theme, setTheme] = useState<ThemeChoice>("auto");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setTheme(read());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      if (theme === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode: the choice lasts for this visit only */
    }
  }, [theme, ready]);
  return [theme, setTheme];
}

/** Runs before first paint (see app/layout.tsx) so a saved dark theme does not flash light. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
