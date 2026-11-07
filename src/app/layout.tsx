import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono, Silkscreen } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: "400", variable: "--font-silkscreen", display: "swap" });
// handwriting on the walkman's cassette label only
const caveat = Caveat({ subsets: ["latin"], weight: "500", variable: "--font-hand", display: "swap" });

const url = "https://www.jomariexe.me";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: "Jomarie Esguerra, full-stack developer",
  description:
    "Portfolio of Jomarie Esguerra, a full-stack developer from Manila and Computer Science graduate of TUP Manila, building web apps and AI-backed tools.",
  authors: [{ name: "Jomarie Esguerra" }],
  openGraph: {
    title: "Jomarie Esguerra, full-stack developer",
    description: "Interactive websites and AI-backed tools, built in Manila.",
    url,
    siteName: "jomariexe",
    images: [{ url: "/images/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: url },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

// Runs before paint so the saved or system theme never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem('jx-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${silkscreen.variable} ${caveat.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
