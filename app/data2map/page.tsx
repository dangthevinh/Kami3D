import type { Metadata } from "next";
import Link from "next/link";

import { getData2MapRegistry } from "@/lib/data2map";
import { DATA2MAP_PRODUCTS, plannedProducts } from "@/lib/data2map-products";
import { cn } from "@/lib/utils";

/**
 * `/data2map` — the module landing page.
 *
 * It shows all five products with their real status, and the dataset registry underneath:
 * which layers exist, where each one comes from, under which licence, and whether it is real
 * or simulated. That last table is the point. A data product whose landing page lists its
 * sources can be trusted further than one whose landing page lists its features.
 *
 * The page imports no map code, so it stays cheap; `/map` and the product pages carry the
 * renderer.
 */

export const metadata: Metadata = {
  title: "Data2Map — data maps for land, trade and movement",
  description:
    "Land prices and zoning, footfall and trends, fleet traces, story maps and agricultural analytics: interactive data maps built on the same stack as Kami3D.",
  alternates: { canonical: "/data2map" },
};

const ACCENT_TEXT: Record<string, string> = {
  neon: "text-neon",
  glow: "text-glow",
  iris: "text-iris",
  solar: "text-solar",
  coral: "text-coral",
};

export const revalidate = 900;

export default async function Data2MapHome() {
  const registry = await getData2MapRegistry();
  const planned = plannedProducts();

  return (
    <div className="section-shell py-12">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neon">Data2Map</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Data maps for land, trade and movement
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Data2Map shares this project&apos;s authentication, database and map stack with the Kami3D
          encyclopedia, and nothing else: different questions, different data, different pages.
          Every layer it can draw is listed below with its source and its licence — including the
          ones that are simulated, which say so.
        </p>
      </header>

      <section aria-labelledby="products" className="mt-10">
        <h2 id="products" className="font-display text-lg font-semibold tracking-tight text-white">
          Five products
        </h2>
        <p className="mt-1 text-xs text-white/45">
          {DATA2MAP_PRODUCTS.length - planned.length} live · {planned.length} in build, in the order they are being built.
        </p>

        <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DATA2MAP_PRODUCTS.map((product) => {
            const live = product.status === "live";
            const layers = registry.layers.filter((layer) => layer.product === product.id);

            return (
              <li key={product.id}>
                <Link
                  href={product.href}
                  aria-disabled={!live}
                  className={cn(
                    "glass flex h-full flex-col rounded-[var(--radius-card)] p-5 transition-colors",
                    live ? "hover:bg-white/6" : "opacity-75",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-semibold tracking-tight text-white">
                      {product.name}
                    </h3>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                        live
                          ? "bg-neon/12 text-neon ring-neon/30"
                          : "bg-white/6 text-white/45 ring-white/10",
                      )}
                    >
                      {live ? "Live" : `${product.phase} · in build`}
                    </span>
                  </div>

                  <p className={cn("mt-2 text-xs font-medium", ACCENT_TEXT[product.accent])}>{product.tagline}</p>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-white/55">{product.detail}</p>

                  <p className="mt-3 text-[10px] uppercase tracking-wide text-white/30">
                    {layers.length} layer(s) planned
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="registry" className="mt-12">
        <h2 id="registry" className="font-display text-lg font-semibold tracking-tight text-white">
          Dataset registry
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/45">
          Every layer Data2Map can draw, with where it comes from and what it is allowed to be.
          A layer with no dataset behind it is not drawn — the panel says so instead.
          {registry.source === "bundled" ? " Showing the bundled registry (Demo Mode)." : null}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-white/35">
                <th scope="col" className="py-2 pr-4 font-medium">Dataset</th>
                <th scope="col" className="py-2 pr-4 font-medium">Source</th>
                <th scope="col" className="py-2 pr-4 font-medium">Licence</th>
                <th scope="col" className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-white/60">
              {registry.datasets.map((dataset) => (
                <tr key={dataset.slug} className="border-t border-white/8">
                  <td className="py-2.5 pr-4 text-white/80">
                    {dataset.name}
                    {dataset.synthetic ? (
                      <span className="ml-2 rounded-full bg-solar/12 px-2 py-0.5 text-[10px] text-solar ring-1 ring-solar/25">
                        simulated
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-4">
                    {dataset.sourceUrl ? (
                      <a href={dataset.sourceUrl} target="_blank" rel="noreferrer noopener" className="hover:text-white">
                        {dataset.source}
                      </a>
                    ) : (
                      dataset.source
                    )}
                  </td>
                  <td className="py-2.5 pr-4">{dataset.licenseLabel ?? dataset.license}</td>
                  <td className="py-2.5 pr-4">
                    <span className={dataset.status === "live" ? "text-neon" : "text-white/40"}>
                      {dataset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-10 text-xs text-white/40">
        Looking for the animal encyclopedia? <Link href="/" className="text-neon hover:text-white">It is over here</Link>.
      </p>
    </div>
  );
}
