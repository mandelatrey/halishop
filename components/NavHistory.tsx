"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordVisit } from "@/lib/nav-history";

/** Mounted once (root layout): keeps the tab's trail of Haali pages for <BackButton>. */
export default function NavHistory() {
  const path = usePathname();
  // A page loaded fresh by back/forward counts as a traversal too.
  const traversal = useRef(
    typeof performance !== "undefined" &&
      (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "back_forward"
  );
  useEffect(() => {
    const onPop = () => {
      traversal.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!path) return;
    recordVisit(path, traversal.current);
    traversal.current = false;
  }, [path]);
  return null;
}
