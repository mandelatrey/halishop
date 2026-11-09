import Image from "next/image";
import Link from "next/link";
import AdminMenu from "./AdminMenu";

const SHOP_SLUG = process.env.NEXT_PUBLIC_SHOP_SLUG || "shania";

/**
 * Global top nav — Haali wordmark on the left, admin links on the right.
 * Desktop shows the links inline; mobile collapses them behind the hamburger
 * from `AdminMenu`.
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
            className="app-nav-brand-mark"
          />
        </Link>

        <nav className="app-nav-links" aria-label="Manage">
          <Link href={`/shop/${SHOP_SLUG}`}>View shop</Link>
          <Link href="/products">Products</Link>
          <Link href="/drops/new">New drop</Link>
          <Link href="/templates">Templates</Link>
          <Link href="/brand-kit">Brand kit</Link>
          <Link href="/settings">Settings</Link>
        </nav>

        <div className="app-nav-hamburger">
          <AdminMenu />
        </div>
      </div>

      <style>{`
        .app-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          background: color-mix(in srgb, var(--color-bg) 88%, transparent);
          backdrop-filter: saturate(1.4) blur(10px);
          -webkit-backdrop-filter: saturate(1.4) blur(10px);
          border-bottom: 1px solid var(--stroke-hair);
        }
        .app-nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .app-nav-brand {
          display: inline-flex;
          align-items: center;
          padding: 4px 6px;
          border-radius: var(--radius-sm);
          flex: none;
          margin-right: auto;
        }
        .app-nav-brand:hover {
          background: var(--color-surface);
        }
        .app-nav-brand-mark {
          height: 30px;
          width: auto;
          display: block;
        }

        /* Desktop inline links */
        .app-nav-links {
          display: none;
          gap: 4px;
        }
        .app-nav-links a {
          font: 500 12px/1 "DM Sans", sans-serif;
          letter-spacing: 0.01em;
          color: var(--color-mute);
          padding: 8px 12px;
          border-radius: var(--radius);
          white-space: nowrap;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .app-nav-links a:hover {
          color: var(--color-text);
          background: var(--color-surface);
        }

        /* Mobile hamburger container — AdminMenu absorbs its own positioning */
        .app-nav-hamburger {
          display: block;
          position: relative;
          width: 40px;
          height: 40px;
        }

        @media (min-width: 720px) {
          .app-nav-links { display: flex; }
          .app-nav-hamburger { display: none; }
        }
      `}</style>
    </header>
  );
}
