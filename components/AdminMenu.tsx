"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import {
  GalleryHorizontal,
  Inbox,
  LayoutTemplate,
  LogIn,
  LogOut,
  MenuIcon,
  Package,
  Palette,
  Settings,
  SquarePlus,
  Store,
  User,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import ThemeSwitch from "./ThemeSwitch";
import { signOut } from "@/lib/actions/auth";
import type { NavIcon, NavModel } from "./nav-model";

const ICONS: Record<NavIcon, LucideIcon> = {
  store: Store,
  user: User,
  inbox: Inbox,
  package: Package,
  plus: SquarePlus,
  template: LayoutTemplate,
  gallery: GalleryHorizontal,
  palette: Palette,
  settings: Settings,
  login: LogIn,
};

/**
 * Phone menu (and sellers' on mid-size screens): a round trigger that opens a
 * floating card — the visitor's links, the one filled action (View shop /
 * Sell on Haali), sign in or out, and the theme switch at the foot.
 */
export default function AdminMenu({ nav }: { nav: NavModel }) {
  const path = usePathname() ?? "";
  const isCurrent = (href: string) => path === href || path.startsWith(`${href}/`);
  // The visitor's links; then sign in, or (sellers) their own buyer account.
  const items = [
    ...nav.links,
    ...(nav.signIn ? [nav.signIn] : []),
    ...(nav.account?.seller ? [{ href: "/account", label: "My orders & favourites", icon: "user" as const }] : []),
  ];

  return (
    <Menu.Root>
      <Menu.Trigger aria-label="Menu" className="mm-trigger">
        <MenuIcon className="mm-icon-closed" aria-hidden />
        <XIcon className="mm-icon-open" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="mm-positioner" side="bottom" align="end" sideOffset={10}>
          <Menu.Popup className="mm-popup">
            <Menu.Group className="mm-group">
              {items.map(({ href, label, icon }) => {
                const Icon = ICONS[icon];
                return (
                <Menu.Item
                  key={href}
                  className="mm-item"
                  render={<Link href={href} aria-current={isCurrent(href) ? "page" : undefined} />}
                >
                  <Icon className="mm-item-icon" aria-hidden />
                  {label}
                </Menu.Item>
                );
              })}
              {nav.account && (
                <Menu.Item className="mm-item" onClick={() => void signOut()}>
                  <LogOut className="mm-item-icon" aria-hidden />
                  Sign out
                </Menu.Item>
              )}
            </Menu.Group>

            {nav.cta && (
              <Menu.Item className="mm-cta" render={<Link href={nav.cta.href} />}>
                <Store className="mm-item-icon" aria-hidden />
                {nav.cta.label}
              </Menu.Item>
            )}

            <div className="mm-foot">
              <span className="mm-foot-label">Theme</span>
              <ThemeSwitch />
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
