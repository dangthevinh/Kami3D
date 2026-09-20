import { ImageResponse } from "next/og";

import { kamiMarkSvg } from "@/lib/brand";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/**
 * Site-wide social card, generated at build time by Satori.
 *
 * Species pages override this with their own card (see
 * `app/animal/[slug]/opengraph-image.tsx`); this is what every other route —
 * the landing page, /explore, /quiz, /leaderboard — shares.
 *
 * No custom font is loaded (the bundled default keeps the build offline-safe) and
 * no emoji are used, because the default font set has no glyphs for them.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kami3D — 3D World Wildlife Encyclopedia";

const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
  kamiMarkSvg({ idPrefix: "og-home", width: 88, height: 88 }),
).toString("base64")}`;

export default async function Image() {
  const facts = ["24 species", "Real 3D models", "Size comparison", "Silhouette quiz"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px",
          background: "linear-gradient(135deg, #35f0c022 0%, #04060f 45%, #a97bff55 100%)",
          color: "#e8eefc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_DATA_URI} width={88} height={88} alt="" />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 26, color: "#35f0c0", letterSpacing: 2, textTransform: "uppercase" }}>
            3D World Wildlife Encyclopedia
          </div>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05 }}>
            Meet the animal kingdom in three dimensions
          </div>
          <div style={{ fontSize: 30, color: "rgba(232,238,252,0.65)", maxWidth: 900 }}>{SITE_DESCRIPTION}</div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {facts.map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                fontSize: 24,
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
