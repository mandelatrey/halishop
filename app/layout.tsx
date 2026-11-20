import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import AppNav from "@/components/AppNav";
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
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
  display: "swap",
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
        <AppNav />
        {children}
        {/* Development only: domeditor, the visual CSS editor (Shift+Alt+E) */}
        {process.env.NODE_ENV === "development" && <DomEditor />}
      </body>
    </html>
  );
}
