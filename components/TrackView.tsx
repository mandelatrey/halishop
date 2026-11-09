"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";
import type { ShopEventType } from "@/lib/types";

/** Records one page view per mount. Renders nothing. */
export default function TrackView({
  slug,
  type,
  code,
  dropId,
}: {
  slug: string;
  type: ShopEventType;
  code?: string;
  dropId?: string;
}) {
  useEffect(() => {
    track(slug, type, { code, dropId });
  }, [slug, type, code, dropId]);
  return null;
}
