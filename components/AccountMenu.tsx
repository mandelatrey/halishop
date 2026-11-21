"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { LogOut, Store, User } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { NavModel } from "./nav-model";
import { prettyPhone } from "@/lib/wa";

/** The signed-in person's menu (desktop): account, shops, sign out. */
export default function AccountMenu({ account }: { account: NonNullable<NavModel["account"]> }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="app-nav-avatar" aria-label={`Account: ${account.name}`}>
        {account.name.trim().slice(0, 1).toUpperCase() || "?"}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="mm-positioner" side="bottom" align="end" sideOffset={10}>
          <Menu.Popup className="mm-popup">
            <div className="mm-who">
              <b>{account.name}</b>
              <span>{prettyPhone(account.phone)}</span>
            </div>
            <Menu.Group className="mm-group">
              <Menu.Item className="mm-item" render={<Link href="/account" />}>
                <User className="mm-item-icon" aria-hidden />
                My orders &amp; favourites
              </Menu.Item>
              <Menu.Item className="mm-item" render={<Link href="/shops" />}>
                <Store className="mm-item-icon" aria-hidden />
                Browse shops
              </Menu.Item>
              <Menu.Item className="mm-item" onClick={() => void signOut()}>
                <LogOut className="mm-item-icon" aria-hidden />
                Sign out
              </Menu.Item>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
