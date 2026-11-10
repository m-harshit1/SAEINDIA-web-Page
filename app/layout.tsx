import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Inter_Tight, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import SmoothScroll from "@/components/cinema/SmoothScroll";

/* ── Google Fonts ──────────────────────────────────────────────────────── */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

/* Cinematic home: sharp grotesk for display, serif italic for emphasis */
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: "italic", // only ever used in italic (.font-serif-i)
});

/* ── SEO Metadata ──────────────────────────────────────────────────────── */
const SITE = "https://sae-iiitdm-kurnool.web.app";
const DESC =
  "SAEINDIA collegiate chapter at IIITDM Kurnool, founded 2025. We are designing and building the B-26 off-roader for our BAJA SAEINDIA debut in 2027.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "SAEINDIA IIITDM Kurnool · B-26 BAJA team",
  description: DESC,
  keywords: [
    "SAEINDIA",
    "IIITDM Kurnool",
    "BAJA SAEINDIA",
    "B-26",
    "ATV",
    "Student Engineering Club",
    "SolidWorks",
    "ANSYS",
  ],
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SAEINDIA IIITDM Kurnool · Design. Build. Race.",
    description: DESC,
    url: SITE,
    siteName: "SAEINDIA IIITDM Kurnool",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "The B-26 off-roader, with the words Design. Build. Race." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SAEINDIA IIITDM Kurnool · Design. Build. Race.",
    description: DESC,
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

/* ── Root Layout ───────────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${jetbrainsMono.variable} ${interTight.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-full flex flex-col bg-carbon-900 text-alloy-100 selection:bg-apex-red selection:text-white">
        <SmoothScroll />
        <ScrollProgressBar />
        {/* Analytics: the old tag used a placeholder ID ("G-SAEINDIA26") and only cost 430 KB of
            script. Add a real GA4 measurement ID here (with strategy="lazyOnload") when there is one. */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
