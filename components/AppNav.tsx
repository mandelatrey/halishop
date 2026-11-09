import Image from "next/image";
import Link from "next/link";
import VendorMenu from "./VendorMenu";

type NavVendor = { name: string; email: string; avatar?: string };

/**
 * Haali top nav for everything except buyer shop pages (those carry only the
 * seller's own branding). Signed out it offers log in / sign up; signed in
 * it shows the vendor's dashboard link and account menu with shop switcher.
 */
export default function AppNav({
  vendor,
  shops = [],
}: {
  vendor?: NavVendor | null;
  shops?: { slug: string; name: string }[];
}) {
  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link href={vendor ? "/dashboard" : "/"} className="app-nav-brand" aria-label="Haali — home">
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

        {vendor ? (
          <>
            <nav className="app-nav-links" aria-label="Account">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/account">Account</Link>
            </nav>
            <VendorMenu name={vendor.name} email={vendor.email} avatar={vendor.avatar} shops={shops} />
          </>
        ) : (
          <nav className="app-nav-public" aria-label="Account">
            <Link href="/login">Log in</Link>
            <Link href="/signup" className="btn app-nav-cta">
              Start selling
            </Link>
          </nav>
        )}
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
        .app-nav-brand:hover { background: var(--color-surface); }
        .app-nav-brand-mark { height: 30px; width: auto; display: block; }

        .app-nav-links { display: none; gap: 4px; }
        .app-nav-links a,
        .app-nav-public a:not(.btn) {
          font: 500 12px/1 "DM Sans", sans-serif;
          letter-spacing: 0.01em;
          color: var(--color-mute);
          padding: 8px 12px;
          border-radius: var(--radius);
          white-space: nowrap;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .app-nav-links a:hover,
        .app-nav-public a:not(.btn):hover { color: var(--color-text); background: var(--color-surface); }
        .app-nav-public { display: flex; align-items: center; gap: 6px; }
        .app-nav-cta { width: auto; padding: 10px 16px; font-size: 12px; }

        @media (min-width: 720px) {
          .app-nav-links { display: flex; }
        }
      `}</style>
    </header>
  );
}
