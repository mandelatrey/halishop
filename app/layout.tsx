import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import AppNav from "@/components/AppNav";
import NavHistory from "@/components/NavHistory";
import { DomEditor } from "domeditor/next";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// App UI type — the same pair as the Kampala Heat Atlas.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
// Status cards (components/StatusCard.tsx) are artwork sellers export and post;
// they keep their own typeface so existing templates render unchanged.
//
// Self-hosted (app/fonts, OFL), not next/font/google: Google now sometimes serves
// DM Sans from `fonts.gstatic.com/l/font?kit=…&skey=…` URLs, and Turbopack's
// next/font/google (Next 15.5) breaks on the `&`s ("next/font/google queries have
// exactly one entry"), stopping `next dev`. One variable file covers 100–1000.
const dmSans = localFont({
  src: [{ path: "./fonts/DMSans-latin-variable.woff2", weight: "100 1000", style: "normal" }],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Haali — commerce for social sellers",
  description:
    "A commerce platform for social-media-based businesses. One link buyers tap, one WhatsApp handoff, one place to manage your catalogue and drops.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceef0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1012" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <NavHistory />
        <AppNav />
        {children}
        {/* Development only: domeditor, the visual CSS editor (Shift+Alt+E) */}
        {process.env.NODE_ENV === "development" && <DomEditor />}
      </body>
    </html>
  );
}
