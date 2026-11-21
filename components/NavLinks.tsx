"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavModel } from "./nav-model";
import AccountMenu from "./AccountMenu";

/** Desktop: inline links, then sign in / the filled action / the account menu. */
export default function NavLinks({ nav }: { nav: NavModel }) {
  const path = usePathname() ?? "";
  const current = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <nav className="app-nav-links" aria-label="Main">
      {nav.links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={current(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
      {nav.cta && nav.account && (
        <Link href={nav.cta.href} aria-current={current(nav.cta.href) ? "page" : undefined}>
          {nav.cta.label}
        </Link>
      )}
      {nav.signIn && (
        <Link href={nav.signIn.href} aria-current={current(nav.signIn.href) ? "page" : undefined}>
          {nav.signIn.label}
        </Link>
      )}
      {nav.cta && !nav.account && (
        <Link href={nav.cta.href} className="app-nav-cta">
          {nav.cta.label}
        </Link>
      )}
      {nav.account && <AccountMenu account={nav.account} />}
    </nav>
  );
}
