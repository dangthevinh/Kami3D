import { ImageResponse } from "next/og";

import { getAnimalBySlug } from "@/lib/animals";
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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${accent[0]}, #38e0ff)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "#04121a",
            }}
          >
            K
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Kami3D</div>
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
