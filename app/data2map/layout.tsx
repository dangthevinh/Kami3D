import { Boxes } from "lucide-react";
import Link from "next/link";

import { DATA2MAP_BASE, DATA2MAP_PRODUCTS } from "@/lib/data2map-products";
import { cn } from "@/lib/utils";

/**
 * The Data2Map shell.
 *
 * A layout rather than a repeated header, because the module has its own audience and its own
 * navigation: someone looking for a land price is not looking for a lion, and the two should
 * not share a menu. The product links live here rather than in the main navbar so the navbar
 * keeps its five items and the mobile disclosure keeps working.
 *
 * Nothing here imports the map stack. `/data2map` is a landing page of cards, and loading
 * MapLibre to show a list of links would spend 150 kB on the one route that does not need it -
 * `npm run check:bundle` would catch it, which is the point of having the budget.
 */

export default function Data2MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <nav aria-label="Data2Map" className="border-b border-white/8 bg-void/60 backdrop-blur-xl">
        <div className="section-shell flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          <Link href={DATA2MAP_BASE} className="flex items-center gap-2 text-sm font-semibold text-white">
            <Boxes className="size-4 text-neon" aria-hidden />
            Data2Map
          </Link>

          <ul className="flex flex-wrap items-center gap-1">
            {DATA2MAP_PRODUCTS.map((product) => (
              <li key={product.id}>
                <Link
                  href={product.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition-colors",
                    product.status === "live"
                      ? "text-white/70 hover:bg-white/8 hover:text-white"
                      : "text-white/35 hover:bg-white/6 hover:text-white/60",
                  )}
                >
                  {product.name}
                  {product.status === "planned" ? (
                    <span className="ml-1.5 text-[10px] text-white/25">{product.phase}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/" className="ml-auto text-xs text-white/45 transition-colors hover:text-white">
            ← Kami3D
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}
