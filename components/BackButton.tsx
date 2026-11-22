"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { canGoBack, TRAIL_EVENT } from "@/lib/nav-history";

/**
 * Back: like the browser's back button when the previous page is on Haali (so
 * the page comes back as it was — scroll, filter); otherwise a plain link to
 * `fallbackHref` (e.g. someone who opened a shop from a WhatsApp status goes to
 * the shops directory, not out of the site). Works without JS as that link.
 */
export default function BackButton({
  fallbackHref,
  fallbackLabel,
  className = "by-back",
}: {
  fallbackHref: string;
  /** Shown when there's no Haali page to go back to, e.g. "All shops". */
  fallbackLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [back, setBack] = useState(false);
  useEffect(() => {
    const sync = () => setBack(canGoBack());
    sync();
    window.addEventListener(TRAIL_EVENT, sync); // the trail can update just after this mounts
    return () => window.removeEventListener(TRAIL_EVENT, sync);
  }, []);
  return (
    <a
      href={fallbackHref}
      className={className}
      onClick={(e) => {
        if (!canGoBack() || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        router.back();
      }}
    >
      <ArrowLeft size={15} aria-hidden />
      {back ? "Back" : fallbackLabel}
    </a>
  );
}
