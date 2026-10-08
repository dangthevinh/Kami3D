import type { NextConfig } from "next";

import { webpackInfrastructureConsole } from "./lib/webpack-log-filter";

/** Allow next/image to serve Supabase storage renders when a project is configured. */
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

/**
 * The R2 host, which the Content-Security-Policy below has to name explicitly.
 *
 * A CSP is an allow-list, and an allow-list that does not mention the CDN is a CDN that does not work
 * — the failure is not a broken page but a silently missing image, or a 3D viewer that never loads
 * and shows its fallback. Derived from the same variable the app uses, so the two cannot disagree.
 */
const r2Origin = (() => {
  const url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

/**
 * The same origin, as a ready-to-append CSP source.
 *
 * Appended rather than hard-coded: a custom domain, a second bucket or a staging environment must not
 * require editing a policy by hand. This policy is report-only today, but one that is wrong the day it
 * is enforced is worse than none — "measure before enforce" cuts both ways.
 */
const r2Source = r2Origin ? " " + r2Origin : "";

/**
 * Canonical URLs, the sitemap and every OpenGraph tag are built from
 * `NEXT_PUBLIC_SITE_URL`. A deployment that forgets it used to publish
 * `http://localhost:9000` as its canonical origin — which tells Google not to
 * index the real site. `lib/env.server.ts` now falls back to the platform's own
 * production URL, and this warns when even that is missing.
 */
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  console.warn(
    "[kami3d] NEXT_PUBLIC_SITE_URL is not set: canonical URLs, the sitemap and og:url will point at " +
      "http://localhost:9000. Set it to the public origin before deploying.",
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `next build` and `next dev` write the same directory by default, and this project measured what
  // that costs: with a dev server open, three builds stopped after webpack with no output for 18 to 33
  // minutes and never wrote a `BUILD_ID`. `NEXT_DIST_DIR` lets a build be measured beside a running
  // dev server without touching its output; `NEXT_DIR` is the same switch for scripts/bundle-budget.mjs,
  // which reads the build it is pointed at. CI and `next start` keep the default.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Pin the tracing root: an unrelated lockfile in a parent directory otherwise
  // makes Next infer the wrong workspace root.
  outputFileTracingRoot: __dirname,
  // The 3D canvas is client-only; keep the R3F/drei/three tree out of server bundles.
  serverExternalPackages: ["three"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost }] : []),
      // Card previews and uploaded models, when they are served from R2.
      ...(r2Origin ? [{ protocol: "https" as const, hostname: new URL(r2Origin).hostname }] : []),
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-three/drei"],
  },
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    // Webpack's cache-serialiser hint about third-party bundle sources is dropped; every other
    // warning still prints. The measurements and the reasoning are in lib/webpack-log-filter.ts.
    config.infrastructureLogging = {
      ...(config.infrastructureLogging ?? {}),
      console: webpackInfrastructureConsole(console),
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing in this product is meant to be framed. The species pages are the content, and a
          // framed console is a clickjacking target.
          { key: "X-Frame-Options", value: "DENY" },
          // Every API this app calls is same-origin or a documented third party, so the browser
          // capabilities it needs are the ones it already uses.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Only over HTTPS, and only in production: a local http:// dev server sending HSTS would
          // pin the developer's browser to a scheme it does not serve.
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
          // Report-only on purpose. A content policy that blocks the wrong thing takes the 3D viewer,
          // the map or the sign-in down, and this project's rule is measure before enforce. The list
          // below is what the app actually loads today; tightening it (dropping 'unsafe-inline',
          // adding nonces) is a separate change with its own measurements.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              // Next inlines its own bootstrap and Tailwind ships styles as a sheet; Clerk injects a
              // script tag for its hosted components.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.com https://pagead2.googlesyndication.com https://*.googlesyndication.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.clerk.com https://img.clerk.com https://media.sketchfab.com https://*.googlesyndication.com" +
                r2Source,
              "font-src 'self' data:",
              // MapLibre compiles its worker from a blob, and three fetches .glb plus the DRACO wasm.
              "worker-src 'self' blob:",
              // `connect-src` is what a cross-origin `.glb` fetch is judged by once this policy stops
              // being report-only — and a browser also needs the CDN to allow the origin back (a CORS
              // rule on the bucket), which is a different setting in a different dashboard.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://api.clerk.com https://*.tile.openstreetmap.org https://api.open-meteo.com https://overpass-api.de https://nominatim.openstreetmap.org https://*.googlesyndication.com" +
                r2Source,
              "media-src 'self' https://*.supabase.co" + r2Source,
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // Immutable 3D assets: long-lived caching for .glb/.gltf/.draco payloads.
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/draco/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // The Natural Earth coastline the globe draws its texture from. 76 KB,
        // unchanged between deploys, and asked for on the landing page: a day of
        // caching plus a week of background revalidation keeps it off the network
        // without pinning a stale copy for a year (the filename is not hashed).
        source: "/geo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
