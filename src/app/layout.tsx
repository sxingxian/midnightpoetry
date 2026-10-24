import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { headers } from "next/headers";
import "./globals.css";

const instrument = localFont({
  src: [
    { path: "./fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://midnightpoetry.studio";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Midnight Poetry Studio", template: "%s · Midnight Poetry Studio" },
  description: "Ideas arrive late. Midnight Poetry Studio makes small, careful apps after dark — Zyra for rosters and Zeno for splitting the bill.",
  openGraph: { siteName: "Midnight Poetry Studio", type: "website" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#04060F" },
    { media: "(prefers-color-scheme: light)", color: "#F6F1E7" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before paint so the saved theme never flashes. Static string, no user input.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('mp-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','dark')}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger -- constant script, nonce-protected */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
