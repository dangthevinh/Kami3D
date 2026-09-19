import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";

import { SupabaseAuthSlot } from "@/components/auth/SupabaseAuthSlot";
import { BackgroundParticles } from "@/components/layout/BackgroundParticles";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { isClerkEnabled, publicEnv } from "@/lib/env";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "Kami3D — 3D World Wildlife Encyclopedia",
    template: "%s · Kami3D",
  },
  description:
    "Explore the animal kingdom in three dimensions: rotate real 3D models, compare your size against a blue whale, listen to calls, and take the silhouette quiz.",
  keywords: ["3D animals", "wildlife encyclopedia", "animal models", "conservation", "Kami3D", "nature education"],
  applicationName: "Kami3D",
  authors: [{ name: "Kami3D" }],
  openGraph: {
    type: "website",
    siteName: "Kami3D",
    title: "Kami3D — 3D World Wildlife Encyclopedia",
    description:
      "Rotate, compare and listen: a 3D encyclopedia of the animal kingdom built with React Three Fiber.",
    url: publicEnv.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Kami3D — 3D World Wildlife Encyclopedia",
    description: "Explore the animal kingdom in three dimensions.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#04060f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Chosen at build time from public configuration, so the layout never reads
  // cookies and every route can stay statically rendered. SupabaseAuthSlot
  // resolves the signed-in account in the browser for the same reason.
  const authSlot = isClerkEnabled ? <UserMenu /> : <SupabaseAuthSlot />;

  const shell = (
    <>
      <BackgroundParticles />
      <Navbar authSlot={authSlot} />
      <main className="relative z-10 pb-24">{children}</main>
      <Footer />
    </>
  );

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} dark`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {isClerkEnabled ? (
          <ClerkProvider
            appearance={{
              variables: { colorPrimary: "#35f0c0", colorBackground: "#070c1a", borderRadius: "0.9rem" },
            }}
          >
            {shell}
          </ClerkProvider>
        ) : (
          shell
        )}
      </body>
    </html>
  );
}
