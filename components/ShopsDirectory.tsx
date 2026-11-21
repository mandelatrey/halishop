"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { ShopCard } from "@/lib/types";

/** Search over the shop cards (rendered on the server and passed in by slug). */
export default function ShopsDirectory({ shops, cards }: { shops: ShopCard[]; cards: Record<string, ReactNode> }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? shops.filter((s) => `${s.name} ${s.city ?? ""} ${s.slug}`.toLowerCase().includes(t)) : shops;
  }, [q, shops]);
  return (
    <>
      <label className="st-search">
        <Search size={16} aria-hidden />
        <input className="inp" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shops or cities" aria-label="Search shops" />
      </label>
      {shown.length === 0 ? (
        <p className="st-empty">No shop matches “{q}”.</p>
      ) : (
        <div className="st-shops">{shown.map((s) => <div key={s.slug}>{cards[s.slug]}</div>)}</div>
      )}
    </>
  );
}
