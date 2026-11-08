"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "sec" | "gh" | "sm";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export default function Button({ variant = "primary", className, children, ...rest }: Props) {
  const cls = ["btn"];
  if (variant === "sec") cls.push("sec");
  if (variant === "gh") cls.push("gh");
  if (variant === "sm") cls.push("sm");
  if (className) cls.push(className);
  return (
    <button className={cls.join(" ")} {...rest}>
      {children}
    </button>
  );
}
