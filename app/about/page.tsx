import { Accessibility, Boxes, Database, FileCode2, Leaf, Megaphone, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAdsEnabled, isDemoMode, publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "About & data sources",
  description:
    "How Kami3D is built: the 3D pipeline, where conservation data comes from, how advertising is placed, and our accessibility commitments.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "article",
    title: "About Kami3D & its data sources",
    description:
      "The 3D pipeline, the conservation data behind every status badge, how advertising is placed, and our accessibility commitments.",
    url: "/about",
    siteName: "Kami3D",
  },
  twitter: { card: "summary_large_image" },
};

/** Commands shown in the "run it yourself" panel. */
const RUN_COMMANDS = [
  "npm install",
  "npm run dev            # http://localhost:9000",
  "npm run check          # typecheck + geometry + SQL agreement",
  "npm run seed:generate  # regenerate supabase/seed.sql from the dataset",
];

const SECTIONS = [
  {
    id: "stack",
    icon: FileCode2,
    title: "How it is built",
    points: [
      "Next.js App Router with React Server Components renders every species page as static HTML, so the text, the fact sheet and the SEO metadata arrive before any JavaScript runs.",
      "React Three Fiber and drei provide the interactive 3D layer. Those bundles load lazily, which is why the encyclopedia stays fast on a phone.",
      "Supabase (Postgres) stores the catalogue, favourites and quiz scores. Clerk handles identity. Both are optional: with no keys configured the app runs in Demo Mode against a bundled dataset.",
    ],
  },
  {
    id: "models",
    icon: Boxes,
    title: "Where the 3D models come from",
    points: [
      "Species with an uploaded model_url load a DRACO-compressed .glb from Supabase Storage, with the decoder fetched on first use.",
      "Species without one render from a procedural rig — a parametric creature built from primitives, described by the silhouette column. Every species is explorable in 3D from day one, and uploading a real model replaces the rig with no code change.",
      "Size-comparison scaling is derived from recorded measurements rather than guessed; see lib/size-comparison.ts and the assertions in the check suite.",
    ],
  },
  {
    id: "data",
    icon: Database,
    title: "Data sources and accuracy",
    points: [
      "Conservation categories follow the IUCN Red List of Threatened Species. Measurements are typical adult values, rounded for display.",
      "The globe is drawn from Natural Earth's 110m land polygons, which are public domain — the same licence rule the 3D models go through.",
      "Descriptions and fun facts are editorial summaries written for a general audience; they are not a substitute for a primary source.",
      "Found an error? Species data lives in one typed dataset and a generated SQL seed, so a correction is a one-line change.",
    ],
  },
  {
    id: "privacy",
    icon: Megaphone,
    title: "Advertising and privacy",
    points: [
      "Ad slots reserve a fixed height, so nothing shifts when an advert loads, and they are never positioned over a 3D canvas, the quiz silhouette or the navigation.",
      "The rewarded-video modal that unlocks prehistoric species ships as a mock player: no ad network is contacted until NEXT_PUBLIC_ADSENSE_CLIENT is configured.",
      "With no keys configured, favourites and quiz scores stay in a first-party cookie on your own device. Nothing is sent to a third party.",
    ],
  },
  {
    id: "accessibility",
    icon: Accessibility,
    title: "Accessibility",
    points: [
      "Every 3D canvas has a text alternative and an equivalent non-3D control: regions are clickable in the globe HUD, and the quiz offers four labelled buttons.",
      "Controls are real buttons and links with visible focus rings, the layout is keyboard navigable, and prefers-reduced-motion disables the ambient animation and idle rotation.",
      "If WebGL is unavailable the canvases are replaced by an explanatory panel instead of an empty box.",
    ],
  },
  {
    id: "licence",
    icon: ShieldCheck,
    title: "Licences and reuse",
    points: [
      "The application code is yours to adapt. Model files, call recordings and photographs keep the licence of their original source — check each asset before republishing.",
      "When you add media, record its licence in the same commit so the next person does not have to guess.",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <div className="section-shell space-y-10 pt-10">
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55 ring-1 ring-white/12">
          <Leaf className="size-3 text-neon" />
          About Kami3D
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          A 3D encyclopedia you can actually turn around
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          Kami3D exists to answer one question properly: what does this animal actually look like, and how big is it
          compared to me? Everything else — the filters, the quiz, the badges — exists to keep you asking.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {isDemoMode ? <Badge variant="solar">Running in Demo Mode</Badge> : <Badge variant="neon">Supabase connected</Badge>}
          {isAdsEnabled ? <Badge variant="outline">AdSense configured</Badge> : <Badge variant="outline">Ad placeholders</Badge>}
          <Badge variant="iris">Site: {publicEnv.siteUrl.replace(/^https?:\/\//, "")}</Badge>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/explore">Explore the encyclopedia</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/quiz">Take the quiz</Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="https://www.iucnredlist.org" target="_blank" rel="noreferrer noopener">
              IUCN Red List
            </a>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
          <section key="stack" id="stack" className="glass rounded-[var(--radius-card)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-neon/12 text-neon ring-1 ring-neon/25">
              <FileCode2 className="size-5" />
            </span>
            <h2 className="mt-3.5 font-display text-lg font-semibold text-white">How it is built</h2>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Next.js App Router with React Server Components renders every species page as static HTML, so the text, the fact sheet and the SEO metadata arrive before any JavaScript runs."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"React Three Fiber and drei provide the interactive 3D layer. Those bundles load lazily, which is why the encyclopedia stays fast on a phone."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Supabase (Postgres) stores the catalogue, favourites and quiz scores. Clerk handles identity. Both are optional: with no keys configured the app runs in Demo Mode against a bundled dataset."}
              </li>
            </ul>
          </section>
          <section key="models" id="models" className="glass rounded-[var(--radius-card)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-neon/12 text-neon ring-1 ring-neon/25">
              <Boxes className="size-5" />
            </span>
            <h2 className="mt-3.5 font-display text-lg font-semibold text-white">Where the 3D models come from</h2>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Species with an uploaded model_url load a DRACO-compressed .glb from Supabase Storage, with the decoder fetched on first use."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Species without one render from a procedural rig — a parametric creature built from primitives, described by the silhouette column. Every species is explorable in 3D from day one, and uploading a real model replaces the rig with no code change."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Size-comparison scaling is derived from recorded measurements rather than guessed; see lib/size-comparison.ts and the assertions in the check suite."}
              </li>
            </ul>
          </section>
          <section key="data" id="data" className="glass rounded-[var(--radius-card)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-neon/12 text-neon ring-1 ring-neon/25">
              <Database className="size-5" />
            </span>
            <h2 className="mt-3.5 font-display text-lg font-semibold text-white">Data sources and accuracy</h2>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Conservation categories follow the IUCN Red List of Threatened Species. Measurements are typical adult values, rounded for display."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Descriptions and fun facts are editorial summaries written for a general audience; they are not a substitute for a primary source."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Found an error? Species data lives in one typed dataset and a generated SQL seed, so a correction is a one-line change."}
              </li>
            </ul>
          </section>
          <section key="privacy" id="privacy" className="glass rounded-[var(--radius-card)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-neon/12 text-neon ring-1 ring-neon/25">
              <Megaphone className="size-5" />
            </span>
            <h2 className="mt-3.5 font-display text-lg font-semibold text-white">Advertising and privacy</h2>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Ad slots reserve a fixed height, so nothing shifts when an advert loads, and they are never positioned over a 3D canvas, the quiz silhouette or the navigation."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"The rewarded-video modal that unlocks prehistoric species ships as a mock player: no ad network is contacted until NEXT_PUBLIC_ADSENSE_CLIENT is configured."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"With no keys configured, favourites and quiz scores stay in a first-party cookie on your own device. Nothing is sent to a third party."}
              </li>
            </ul>
          </section>
          <section key="accessibility" id="accessibility" className="glass rounded-[var(--radius-card)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-neon/12 text-neon ring-1 ring-neon/25">
              <Accessibility className="size-5" />
            </span>
            <h2 className="mt-3.5 font-display text-lg font-semibold text-white">Accessibility</h2>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Every 3D canvas has a text alternative and an equivalent non-3D control: regions are clickable in the globe HUD, and the quiz offers four labelled buttons."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"Controls are real buttons and links with visible focus rings, the layout is keyboard navigable, and prefers-reduced-motion disables the ambient animation and idle rotation."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"If WebGL is unavailable the canvases are replaced by an explanatory panel instead of an empty box."}
              </li>
            </ul>
          </section>
          <section key="licence" id="licence" className="glass rounded-[var(--radius-card)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-neon/12 text-neon ring-1 ring-neon/25">
              <ShieldCheck className="size-5" />
            </span>
            <h2 className="mt-3.5 font-display text-lg font-semibold text-white">Licences and reuse</h2>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"The application code is yours to adapt. Model files, call recordings and photographs keep the licence of their original source — check each asset before republishing."}
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-white/60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                {"When you add media, record its licence in the same commit so the next person does not have to guess."}
              </li>
            </ul>
          </section>
      </div>

      <section className="glass rounded-[var(--radius-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-white">Running it yourself</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          The repository ships with a typed dataset, a generated SQL seed and node checks that verify the geometry
          maths and the database agreement. Copy{" "}
          create a <code className="rounded bg-white/8 px-1.5 py-0.5 text-[12px] text-neon">.env.local</code>{" "}
          (gitignored) to switch on Clerk, Supabase and AdSense. It is not committed, so a fresh clone starts in
          Demo Mode.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-void/70 p-4 font-mono text-[12px] leading-relaxed text-white/70 ring-1 ring-white/10">
          {RUN_COMMANDS.join("\n")}
        </pre>
      </section>
    </div>
  );
}
