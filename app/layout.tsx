import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";

import { AuthSlot } from "@/components/auth/AuthSlot";
import { JsonLd } from "@/components/seo/JsonLd";
import { BackgroundParticles } from "@/components/layout/BackgroundParticles";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { activeAuthProvider } from "@/lib/auth-provider";
import { publicEnv } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_GITHUB, SITE_NAME, graph, organizationJsonLd, websiteJsonLd, type SiteFacts } from "@/lib/seo";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Sora ships as a variable font: omitting `weight` downloads one file that
// covers 100–800 instead of four static instances (~4× the payload).
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

const SITE_TITLE = "Kami3D — 3D World Wildlife Encyclopedia";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s · Kami3D",
  },
  description: SITE_DESCRIPTION,
  keywords: ["3D animals", "wildlife encyclopedia", "animal models", "conservation", "Kami3D", "nature education"],
  applicationName: "Kami3D",
  authors: [{ name: "Kami3D" }],
  creator: "Kami3D",
  publisher: "Kami3D",
  category: "education",
  alternates: {
    // Absolute canonical on every page; child routes override the path.
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: publicEnv.siteUrl,
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
};

/**
 * Site-level structured data, emitted once in the root layout.
 *
 * Species pages and `/explore` add their own nodes and reference these by `@id`,
 * so the whole site reads as one graph rather than a pile of unrelated snippets.
 */
const siteJsonLd = (() => {
  const facts: SiteFacts = {
    siteUrl: publicEnv.siteUrl,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    githubUrl: SITE_GITHUB,
  };
  return graph([websiteJsonLd(facts), organizationJsonLd(facts)]);
})();

export const viewport: Viewport = {
  themeColor: "#04060f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // One decision point shared with the server-side auth helpers, so the UI can
  // never offer a provider the database does not understand.
  //
  // The layout reads no cookies and imports no auth SDK, which keeps every route
  // statically renderable **and** keeps Clerk's and Supabase's client runtimes out
  // of the payload: `AuthSlot` mounts the account UI with `import()` on the
  // client, and only when there is a session to show it for.
  const provider = activeAuthProvider();

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} dark`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <JsonLd data={siteJsonLd} />
        <BackgroundParticles />
        <Navbar authSlot={<AuthSlot provider={provider} />} />
        <main className="relative z-10 pb-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
