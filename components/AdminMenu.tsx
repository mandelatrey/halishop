"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SHOP_SLUG = process.env.NEXT_PUBLIC_SHOP_SLUG || "shania";

/**
 * Floating hamburger in the top-right corner of every page. Exposes admin
 * routes without cluttering the buyer-facing storefront chrome.
 */
export default function AdminMenu() {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button aria-label="Store menu" className="admin-menu-button">
              <MenuIcon className="admin-menu-icon" />
            </button>
          }
        />
        <DropdownMenuContent align="end" sideOffset={8} className="admin-menu-content">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Storefront</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href={`/shop/${SHOP_SLUG}`}>View shop</Link>} />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Manage</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/products">Products</Link>} />
            <DropdownMenuItem render={<Link href="/drops/new">New drop</Link>} />
            <DropdownMenuItem render={<Link href="/templates">Templates</Link>} />
            <DropdownMenuItem render={<Link href="/brand-kit">Brand kit</Link>} />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <style jsx>{`
        .admin-menu-button {
          width: 40px;
          height: 40px;
          border: 0;
          background: transparent;
          padding: 0;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: var(--color-mute);
          transition: color 0.15s ease;
        }
        .admin-menu-button:hover {
          color: var(--color-text);
        }
        .admin-menu-button:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      `}</style>
      <style jsx global>{`
        .admin-menu-icon { width: 20px; height: 20px; }
        .admin-menu-content {
          min-width: 200px;
          font-family: "DM Sans", sans-serif;
        }
        .admin-menu-content a {
          color: inherit;
          text-decoration: none;
          display: block;
        }
        .admin-menu-content a:hover {
          color: inherit;
        }
      `}</style>
    </>
  );
}
