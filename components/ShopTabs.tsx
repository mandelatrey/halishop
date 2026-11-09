"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "./ShopContext";

const TABS = [
  { path: "", label: "Overview", exact: true },
  { path: "/products", label: "Products" },
  { path: "/drops/new", label: "New drop", match: "/drops" },
  { path: "/templates", label: "Templates" },
  { path: "/brand-kit", label: "Brand kit" },
  { path: "/settings", label: "Shop info" },
];

/** Shop name + tab bar across the top of every /dashboard/[slug] page. */
export default function ShopTabs() {
  const { name, dash, shop } = useShop();
  const pathname = usePathname();
  return (
    <div className="shop-tabs">
      <div className="shop-tabs-inner">
        <div className="shop-tabs-head">
          <Link href="/dashboard" className="shop-tabs-back" aria-label="All shops">
            All shops
          </Link>
          <span className="shop-tabs-sep" aria-hidden>/</span>
          <span className="shop-tabs-name">{name}</span>
          <a href={shop()} target="_blank" rel="noopener noreferrer" className="shop-tabs-view">
            View shop ↗
          </a>
        </div>
        <nav className="shop-tabs-nav" aria-label={`${name} tools`}>
          {TABS.map((t) => {
            const href = dash(t.path);
            const base = dash(t.match ?? t.path);
            const on = t.exact ? pathname === href : pathname === base || pathname.startsWith(`${base}/`);
            return (
              <Link key={t.path} href={href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
