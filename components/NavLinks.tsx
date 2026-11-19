"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SHOP_SLUG = process.env.NEXT_PUBLIC_SHOP_SLUG || "shania";

const LINKS = [
  { href: `/shop/${SHOP_SLUG}`, label: "View shop" },
  { href: "/products", label: "Products" },
  { href: "/drops/new", label: "New drop" },
  { href: "/templates", label: "Templates" },
  { href: "/brand-kit", label: "Brand kit" },
  { href: "/settings", label: "Settings" },
];

/** Inline admin links; the current section is marked like the atlas sidebar. */
export default function NavLinks() {
  const path = usePathname() ?? "";
  return (
    <nav className="app-nav-links" aria-label="Manage">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={path === l.href || path.startsWith(`${l.href}/`) ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
