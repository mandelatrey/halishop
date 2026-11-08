"use client";

import type { ReactNode } from "react";

type Props = {
  title?: string;
  time?: string;
  width?: number;
  children: ReactNode;
};

export default function Frame({
  title = "MAKE STATUS CARDS",
  time = "13:58",
  width = 390,
  children,
}: Props) {
  return (
    <div className="fr" style={{ width }}>
      <div className="sb">
        <span>{time}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
