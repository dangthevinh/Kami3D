import { Compass, Home, SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="section-shell grid min-h-[70vh] place-items-center pt-10">
      <div className="glass max-w-lg rounded-[var(--radius-card)] p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-coral/12 text-coral ring-1 ring-coral/25">
          <SearchX className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">This species has wandered off</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          The page you asked for is not in the encyclopedia. It may have been renamed, or the link may be out of
          date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/explore">
              <Compass />
              Explore species
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">
              <Home />
              Back home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
