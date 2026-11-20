"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import {
  LayoutTemplate,
  MenuIcon,
  Package,
  Palette,
  Settings,
  SquarePlus,
  Store,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import ThemeSwitch from "./ThemeSwitch";

const SHOP_SLUG = process.env.NEXT_PUBLIC_SHOP_SLUG || "shania";

const MANAGE: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/products", label: "Products", icon: Package },
  { href: "/drops/new", label: "New drop", icon: SquarePlus },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/brand-kit", label: "Brand kit", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Mobile menu: a round trigger that opens a floating card — icon links to
 * each admin page, the storefront as the one filled action, and the theme
 * switch at the foot (it is hidden from the bar on small screens).
 */
export default function AdminMenu() {
  const path = usePathname() ?? "";
  const isCurrent = (href: string) => path === href || path.startsWith(`${href}/`);

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
              {MANAGE.map(({ href, label, icon: Icon }) => (
                <Menu.Item
                  key={href}
                  className="mm-item"
                  render={<Link href={href} aria-current={isCurrent(href) ? "page" : undefined} />}
                >
                  <Icon className="mm-item-icon" aria-hidden />
                  {label}
                </Menu.Item>
              ))}
            </Menu.Group>

            <Menu.Item className="mm-cta" render={<Link href={`/shop/${SHOP_SLUG}`} />}>
              <Store className="mm-item-icon" aria-hidden />
              View shop
            </Menu.Item>

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
