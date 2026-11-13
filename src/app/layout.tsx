import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { headers } from "next/headers";
import { getAdSettings } from "@/lib/content/queries";
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

// Runs before paint so the saved theme and 2D/3D scene never flash. Static string, no user input.
// Scene: the visitor's saved choice, else 2D for reduced motion, else 3D.
const THEME_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('mp-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.setAttribute('data-theme',t)}catch(e){d.setAttribute('data-theme','dark')}try{var s=localStorage.getItem('mp-scene');if(s!=='2d'&&s!=='3d'){s=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'2d':'3d'}d.setAttribute('data-scene',s)}catch(e){d.setAttribute('data-scene','3d')}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Tells Google which AdSense account this site belongs to (site verification). It loads no script and sets no cookie.
  let adsenseAccount: string | null = null;
  try {
    const client = (await getAdSettings())?.adsense_client ?? null;
    adsenseAccount = client && /^ca-pub-\d{16}$/.test(client) ? client : null;
  } catch {
    adsenseAccount = null;
  }
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        {adsenseAccount ? <meta name="google-adsense-account" content={adsenseAccount} /> : null}
        {/* eslint-disable-next-line react/no-danger -- constant script, nonce-protected */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
