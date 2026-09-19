import { ImageResponse } from "next/og";

import { getAnimalBySlug } from "@/lib/animals";
import { kamiMarkSvg } from "@/lib/brand";
import { STATUS_ABBR } from "@/types/animal";

/**
 * Per-species social card, generated at build time by Satori.
 *
 * No custom font is loaded (the bundled default keeps the build offline-safe) and
 * no emoji are used, because the default font set has no glyphs for them.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kami3D species card";

/**
 * The brand mark, inlined as a data URI.
 *
 * Satori cannot render an arbitrary SVG element, but it does rasterise an image,
 * so the SVG from `lib/brand.ts` is embedded here rather than approximated with
 * divs — the social card therefore carries the exact logo the site does.
 */
const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
  kamiMarkSvg({ idPrefix: "og", width: 72, height: 72 }),
).toString("base64")}`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const animal = await getAnimalBySlug(slug);

  const name = animal?.name ?? "Kami3D";
  const latin = animal?.latin_name ?? "3D World Wildlife Encyclopedia";
  const status = animal ? `${STATUS_ABBR[animal.conservation_status]} · ${animal.conservation_status}` : "Explore in 3D";
  const accent = animal?.accent ?? ["#35f0c0", "#0b1226"];
  const stats = animal
    ? [`${animal.length_m} m long`, `${animal.weight_kg} kg`, animal.region, animal.category]
    : ["24 species", "3D models", "Size comparison", "Quiz"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: `linear-gradient(135deg, ${accent[0]}22 0%, #04060f 45%, ${accent[1]}66 100%)`,
          color: "#e8eefc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_DATA_URI} width={72} height={72} alt="" />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Kami3D</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 26, color: accent[0], letterSpacing: 2, textTransform: "uppercase" }}>{status}</div>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
          <div style={{ fontSize: 34, fontStyle: "italic", color: "rgba(232,238,252,0.6)" }}>{latin}</div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {stats.map((item) => (
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
