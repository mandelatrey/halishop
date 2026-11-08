"use client";

import type { ReactNode } from "react";

type Props = {
  title?: string;
  time?: string;
  width?: number;
  children: ReactNode;
};

/** Rounded phone-style frame (v2 direction) — used to stage the card generator. */
export default function Frame({
  title = "MAKE STATUS CARDS",
  time = "13:58",
  width = 390,
  children,
}: Props) {
  return (
    <div className="ad-phone" style={{ width }}>
      <div className="ad-phone-bar">
        <span>{time}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
