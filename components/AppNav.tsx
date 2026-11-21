import Image from "next/image";
import Link from "next/link";
import AdminMenu from "./AdminMenu";
import NavLinks from "./NavLinks";
import ThemeSwitch from "./ThemeSwitch";
import "./app-nav.css";

/**
 * Global top nav — Haali wordmark on the left, admin links and the theme
 * switch on the right. Desktop shows the links inline; mobile collapses them
 * behind the hamburger from `AdminMenu`.
 */
export default function AppNav() {
  return (
    <header className="app-nav">
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

        <NavLinks />

        <div className="app-nav-theme">
          <ThemeSwitch />
        </div>

        <div className="app-nav-hamburger">
          <AdminMenu />
        </div>
      </div>
    </header>
  );
}
