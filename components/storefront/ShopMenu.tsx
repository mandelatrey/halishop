"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { MENU_ICONS } from "./menu-icon-map";
import { ASK_EVENT, parseFilter, type MenuEntry, type ShopFilter } from "@/lib/storefront";
import type { MenuIconName } from "@/lib/menu-icons";
import "./storefront.css";

/** A menu icon's component by name (names: lib/menu-icons.ts). */
export function menuIcon(name: MenuIconName): LucideIcon {
  return MENU_ICONS[name] ?? MENU_ICONS.ShoppingBag;
}

/**
 * The "hanging" menu: a white bar that hangs off the bottom edge of the banner
 * carousel, one round icon per entry. Scrolls sideways on phones.
 *
 * `preview` renders inert items (the editor's live preview).
 */
export function ShopMenuBar({
  entries,
  active,
  dropHref,
  askHref,
  preview = false,
}: {
  entries: MenuEntry[];
  active: ShopFilter;
  dropHref?: string;
  askHref: string;
  preview?: boolean;
}) {
  if (entries.length === 0) return null;
  return (
    <nav className="by-menu" aria-label="Browse the shop">
      <ul className="by-menu-list">
        {entries.map((e) => {
          const Icon = menuIcon(e.icon);
          const on = e.kind === "filter" && e.filter === active;
          const body = (
            <>
              <span className="by-menu-ic">
                <Icon size={19} strokeWidth={1.8} aria-hidden />
                {e.kind === "drop" && <span className="by-menu-live" aria-hidden />}
              </span>
              <span className="by-menu-l">{e.label}</span>
            </>
          );
          const cls = `by-menu-item${on ? " on" : ""}${e.kind === "drop" ? " is-drop" : ""}`;
          let item: ReactNode;
          if (preview) item = <span className={cls}>{body}</span>;
          else if (e.kind === "filter")
            item = (
              <a
                href={e.filter === "all" ? "?#shop-items" : `?c=${e.filter}#shop-items`}
                data-shop-filter={e.filter}
                className={cls}
                aria-current={on ? "true" : undefined}
              >
                {body}
              </a>
            );
          else if (e.kind === "drop")
            item = (
              <a href={dropHref} className={cls}>
                {body}
              </a>
            );
          else
            item = (
              <a href={askHref} data-shop-ask="" className={cls} target="_blank" rel="noopener noreferrer">
                {body}
              </a>
            );
          return <li key={e.key}>{item}</li>;
        })}
      </ul>
    </nav>
  );
}

/**
 * Owns the shop's current filter. Renders the hanging menu, the section head
 * and the (server-rendered) grid passed as children, and narrows the grid with
 * a `data-filter` attribute — no product data crosses into the client.
 *
 * Any link on the page with `data-shop-filter` (menu items, banner buttons) or
 * `data-shop-ask` is handled here, so server-rendered banners stay plain links.
 */
export function ShopBrowse({
  entries,
  initialFilter,
  counts,
  labels,
  dropHref,
  askHref,
  children,
}: {
  entries: MenuEntry[];
  initialFilter: ShopFilter;
  /** In-stock items per filter. */
  counts: Partial<Record<ShopFilter, number>>;
  /** Section title per filter. */
  labels: Partial<Record<ShopFilter, string>>;
  dropHref?: string;
  askHref: string;
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<ShopFilter>(initialFilter);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    function pick(f: ShopFilter) {
      setFilter(f);
      const url = new URL(window.location.href);
      if (f === "all") url.searchParams.delete("c");
      else url.searchParams.set("c", f);
      url.hash = "";
      window.history.replaceState(window.history.state, "", url);
      const el = section.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.55) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      }
    }
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("[data-shop-filter],[data-shop-ask]");
      if (!a) return;
      e.preventDefault();
      if (a.hasAttribute("data-shop-ask")) window.dispatchEvent(new Event(ASK_EVENT));
      else pick(parseFilter(a.getAttribute("data-shop-filter")));
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const count = counts[filter] ?? 0;
  const title = filter === "all" ? labels.all ?? "In stock" : labels[filter] ?? "In stock";

  return (
    <>
      <ShopMenuBar entries={entries} active={filter} dropHref={dropHref} askHref={askHref} />

      <section id="shop-items" ref={section} className="by-browse" data-filter={filter}>
        <div className="by-sec-head">
          <h2 className="section-title">{title}</h2>
          <span className="by-count" aria-live="polite">
            {filter !== "all" && (
              <a href="?#shop-items" data-shop-filter="all" className="by-count-reset">
                Show all
              </a>
            )}
            {count} {count === 1 ? "item" : "items"}
          </span>
        </div>
        {count === 0 && filter !== "all" && (
          <div className="by-empty">
            <p>Nothing in stock here right now.</p>
            <a href="?#shop-items" data-shop-filter="all" className="btn sec">
              See everything in the shop
            </a>
          </div>
        )}
        {children}
      </section>
    </>
  );
}
