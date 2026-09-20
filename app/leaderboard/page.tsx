import { BarChart3, Eye, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ads/AdSlot";
import { DailyBars } from "@/components/stats/DailyBars";
import { LeaderboardList } from "@/components/stats/LeaderboardList";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { getMostViewed, getDailyTrend, getOverallTrend, getQuizStats } from "@/lib/stats";
import { isSupabaseConfigured } from "@/lib/env";
import { siteUrl } from "@/lib/env.server";
import { breadcrumbJsonLd, graph, speciesItemListJsonLd } from "@/lib/seo";
import { summarise } from "@/lib/trend";
import { formatCount } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Most viewed species",
  description:
    "Which Kami3D species get opened the most, with a thirty-day view trend for each. Counted in the database, one row per species per day.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    type: "website",
    title: "Most viewed species",
    description: "Live view counts and a thirty-day trend for every species in the Kami3D encyclopedia.",
    url: "/leaderboard",
    siteName: "Kami3D",
  },
  twitter: { card: "summary_large_image" },
};

/** Counts move slowly and the query is the same for every visitor. */
export const revalidate = 300;

const WINDOW_DAYS = 30;

export default async function LeaderboardPage() {
  const [ranked, overall, trends, quizStats] = await Promise.all([
    getMostViewed(12),
    getOverallTrend(WINDOW_DAYS),
    getDailyTrend(WINDOW_DAYS),
    getQuizStats(),
  ]);

  const summary = summarise(overall);
  const hasHistory = summary.total > 0;
  const speciesWithViews = [...trends.values()].filter((trend) => trend.total > 0).length;

  const stats = [
    {
      icon: Eye,
      label: `Views, last ${WINDOW_DAYS} days`,
      value: formatCount(summary.total),
    },
    {
      icon: BarChart3,
      label: "Busiest day",
      value: summary.peakDay ? `${formatCount(summary.peak)} · ${summary.peakDay.slice(5)}` : "—",
    },
    {
      icon: summary.changePct !== null && summary.changePct < 0 ? TrendingDown : TrendingUp,
      label: "Second half vs first",
      value: summary.changePct === null ? "—" : `${summary.changePct > 0 ? "+" : ""}${Math.round(summary.changePct)}%`,
    },
    {
      icon: Trophy,
      label: "Species viewed",
      value: `${speciesWithViews}`,
    },
  ];

  return (
    <div className="section-shell space-y-6 pt-10">
      <JsonLd
        data={graph([
          speciesItemListJsonLd(siteUrl, "Most viewed Kami3D species", ranked),
          breadcrumbJsonLd(siteUrl, [
            { name: "Home", path: "/" },
            { name: "Most viewed", path: "/leaderboard" },
          ]),
        ])}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55 ring-1 ring-white/12">
            <Trophy className="size-3 text-solar" />
            Leaderboard
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Most viewed species
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            Counted when a visitor opens a species page, once per browser per six hours. Every species keeps a
            daily history, which is what draws the trends below.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/explore">Browse the catalogue</Link>
        </Button>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4">
            <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
              <stat.icon className="size-3.5 text-neon/80" />
              {stat.label}
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="glass rounded-[var(--radius-card)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Views per day</h2>
            <p className="text-xs text-white/50">
              The whole catalogue, {WINDOW_DAYS} days. Days with no visits are drawn as a hairline, not skipped.
            </p>
          </div>
          {overall.length > 0 ? (
            <p className="text-[11px] tabular-nums text-white/40">
              {overall[0].day} → {overall[overall.length - 1].day}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <DailyBars points={overall} height={56} label={`Daily views across the catalogue for the last ${WINDOW_DAYS} days`} />
        </div>
      </section>

      {quizStats ? (
        <section className="glass rounded-[var(--radius-card)] p-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Quiz rounds</h2>
              <p className="text-xs text-white/50">
                Counts and averages only — a per-visitor board would mean publishing other people&apos;s rows, and
                `quiz_scores` is owner-only by policy.
              </p>
            </div>
            {quizStats.lastPlayedAt ? (
              <p className="text-[11px] tabular-nums text-white/40">
                last round {quizStats.lastPlayedAt.slice(0, 10)}
              </p>
            ) : null}
          </header>

          {quizStats.rounds > 0 ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Rounds played", value: formatCount(quizStats.rounds) },
                { label: "People", value: formatCount(quizStats.players) },
                {
                  label: "Best round",
                  value: quizStats.totalQuestions > 0 ? `${quizStats.bestScore}/${quizStats.totalQuestions}` : "—",
                },
                { label: "Average", value: `${Math.round(quizStats.averagePercent)}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/6 p-3 ring-1 ring-white/10">
                  <dt className="text-[10px] uppercase tracking-wide text-white/45">{item.label}</dt>
                  <dd className="mt-0.5 font-display text-xl font-bold tabular-nums text-white">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-white/55">
              No rounds recorded on this deployment yet — the first one to finish a quiz appears here.
            </p>
          )}

          {quizStats.perfect > 0 ? (
            <p className="mt-3 text-[11px] text-white/40">
              {formatCount(quizStats.perfect)} flawless {quizStats.perfect === 1 ? "round" : "rounds"} so far.
            </p>
          ) : null}
        </section>
      ) : null}

      {hasHistory ? (
        <LeaderboardList species={ranked} trends={trends} />
      ) : (
        <section className="glass grid place-items-center gap-3 rounded-[var(--radius-card)] px-6 py-16 text-center">
          <Trophy className="size-8 text-white/30" />
          <h2 className="font-display text-lg font-semibold text-white">
            {isSupabaseConfigured ? "No views recorded yet" : "View counts need a database"}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-white/55">
            {isSupabaseConfigured
              ? "Open any species page and the first view lands here within a few minutes. The ranking fills in as visitors explore."
              : "The app is running in Demo Mode, so there is no counter to read. Connect Supabase and the leaderboard fills itself."}
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-1">
            <Link href="/explore">Open a species</Link>
          </Button>
        </section>
      )}

      <AdSlot format="leaderboard" note="Below the ranking and the charts, never over them." />
    </div>
  );
}
