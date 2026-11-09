"use client";

import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Account menu in the vendor nav: switch between shops (one per hustle), add
 * a shop, edit the profile, log out.
 */
export default function VendorMenu({
  name,
  email,
  avatar,
  shops,
}: {
  name: string;
  email: string;
  avatar?: string;
  shops: { slug: string; name: string }[];
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <>
      <form id="vendor-logout" action="/logout" method="post" hidden />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button aria-label="Account and shops" className="vendor-menu-button">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="vendor-menu-avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="vendor-menu-avatar vendor-menu-initials">{initials || "?"}</span>
              )}
              <ChevronDownIcon className="vendor-menu-chev" />
            </button>
          }
        />
        <DropdownMenuContent align="end" sideOffset={8} className="vendor-menu-content">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="vendor-menu-name">{name}</span>
              <span className="vendor-menu-email">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/dashboard">All shops &amp; metrics</Link>} />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Your shops</DropdownMenuLabel>
            {shops.map((s) => (
              <DropdownMenuItem key={s.slug} render={<Link href={`/dashboard/${s.slug}`}>{s.name}</Link>} />
            ))}
            <DropdownMenuItem render={<Link href="/dashboard/new">+ Add a shop</Link>} />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/dashboard/account">Account</Link>} />
            <DropdownMenuItem
              render={
                <button type="submit" form="vendor-logout" className="vendor-menu-logout">
                  Log out
                </button>
              }
            />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <style jsx global>{`
        .vendor-menu-button {
          height: 40px;
          border: 0;
          background: transparent;
          padding: 0 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          color: var(--color-mute);
          border-radius: 999px;
        }
        .vendor-menu-button:hover { color: var(--color-text); }
        .vendor-menu-button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
        .vendor-menu-avatar {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          object-fit: cover;
          border: 1px solid var(--stroke-soft);
          background: var(--color-surface);
        }
        .vendor-menu-initials {
          display: inline-grid;
          place-items: center;
          font: 600 12px/1 "DM Sans", sans-serif;
          color: var(--color-mute);
        }
        .vendor-menu-chev { width: 16px; height: 16px; }
        .vendor-menu-content { min-width: 240px; font-family: "DM Sans", sans-serif; }
        .vendor-menu-content a,
        .vendor-menu-logout {
          color: inherit;
          text-decoration: none;
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: 0;
          font: inherit;
        }
        .vendor-menu-content a:hover { color: inherit; }
        .vendor-menu-name { display: block; font-weight: 600; color: var(--color-text); }
        .vendor-menu-email { display: block; font-weight: 400; overflow-wrap: anywhere; }
      `}</style>
    </>
  );
}
