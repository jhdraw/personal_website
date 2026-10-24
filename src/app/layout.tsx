import type { Metadata } from "next";
import { Pixelify_Sans, VT323 } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { themeVars } from "@/lib/theme";
import { getTheme } from "@/lib/theme-server";

const pixel = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
});

const term = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-term",
});

export const metadata: Metadata = {
  // metadataBase lets Next resolve canonical/OG URLs to absolute ones, which
  // search engines and link previews require.
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Admin-chosen colors override the defaults in globals.css.
  const theme = await getTheme();

  return (
    <html lang="en" style={themeVars(theme) as React.CSSProperties}>
      <body
        className={`${pixel.variable} ${term.variable} flex min-h-screen flex-col antialiased`}
      >
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <Footer />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
