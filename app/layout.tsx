import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import AppNav from "@/components/AppNav";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Haali — commerce for social sellers",
  description:
    "A commerce platform for social-media-based businesses. One link buyers tap, one WhatsApp handoff, one place to manage your catalogue and drops.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
