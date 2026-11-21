import Image from "next/image";
import Link from "next/link";
import AdminMenu from "./AdminMenu";
import NavLinks from "./NavLinks";
import ThemeSwitch from "./ThemeSwitch";
import { navFor } from "./nav-model";
import { getCurrentUser } from "@/lib/auth";
import "./app-nav.css";

/**
 * Global top nav — Haali wordmark on the left; on the right, what this visitor
 * can do (components/nav-model.ts): shops and sign in when signed out, their
 * account for buyers, their shop's tools for sellers. Desktop shows the links
 * inline (sellers' long list only on wide screens); otherwise the menu button.
 */
export default async function AppNav() {
  const nav = navFor(await getCurrentUser());
  return (
    <header className={`app-nav${nav.links.length > 3 ? " app-nav-many" : ""}`}>
      <div className="app-nav-inner">
        <Link href="/" className="app-nav-brand" aria-label="Haali — home">
          <Image
            src="/logos/haali-wordmark.svg"
            alt="Haali"
            width={500}
            height={200}
            priority
            unoptimized
            className="app-nav-brand-mark logo-on-light"
          />
          <Image
            src="/logos/haali-wordmark-on-dark.svg"
            alt=""
            width={500}
            height={200}
            priority
            unoptimized
            className="app-nav-brand-mark logo-on-dark"
          />
        </Link>

        <NavLinks nav={nav} />

        <div className="app-nav-theme">
          <ThemeSwitch />
        </div>

        <div className="app-nav-hamburger">
          <AdminMenu nav={nav} />
        </div>
      </div>
    </header>
  );
}
