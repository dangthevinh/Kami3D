import { BarChart3, Heart, Info, Target, TrendingUp, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BarList } from "@/components/stats/BarList";
import { DailyBars } from "@/components/stats/DailyBars";
import { LineSeries } from "@/components/stats/LineSeries";
import { Button } from "@/components/ui/button";
import { getAllAnimals } from "@/lib/animals";
import { ROUND_GOOD_PERCENT, THREATENED_STATUSES, WEEK_WINDOW_COUNT, summariseFavourites, summariseQuiz } from "@/lib/insights";
import { getViewerProfile } from "@/lib/profile";
import { cn, formatCount } from "@/lib/utils";

/**
 * The visitor's own numbers.
 *
 * Two sources, both of which they already own: their quiz rounds (\`public.quiz_scores\`, or this
 * browser's cookie when there is no account) and their favourites. Nothing is collected to build
 * this page — no new table, no new cookie, no third-party script — and every figure comes from
 * \`lib/insights.ts\`, which is pure and pinned by \`npm run check:insights\`.
 *
 * It is deliberately not a channel dashboard. Who a visitor is, where they came from and what else
 * they read is admin-only and aggregate (see /admin/analytics); this page can only ever describe
 * the person reading it, which is the property that makes it safe to show them.
 */
export const metadata: Metadata = {
  title: "Your analytics",
  description: "What your own quiz rounds and favourites add up to in Kami3D.",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage() {
  const [profile, animals] = await Promise.all([getViewerProfile(), getAllAnimals()]);

  const quiz = summariseQuiz(profile.quizHistory);
  const favourites = summariseFavourites(
    animals.filter((animal) => profile.favoriteIds.includes(animal.id)),
    animals,
  );

  const shareOfCatalogue =
    favourites.shareOfCatalogue === null ? null : Math.round(favourites.shareOfCatalogue * 100);

  const cards = [
    {
      icon: Target,
      label: "Rounds played",
      value: formatCount(quiz.rounds),
      hint: quiz.rounds > 0 ? formatCount(quiz.questions) + " questions answered" : "no rounds yet",
    },
    {
      icon: TrendingUp,
      label: "Accuracy",
      value: quiz.accuracy === null ? "—" : quiz.accuracy + "%",
      hint: quiz.accuracy === null ? "nothing to average yet" : formatCount(quiz.correct) + " right of " + formatCount(quiz.questions),
    },
    {
      icon: Trophy,
      label: "Best round",
      value: quiz.best ? quiz.best.score + "/" + quiz.best.total : "—",
      hint: quiz.best ? "on " + quiz.best.at.slice(0, 10) : "play one to set a mark",
    },
    {
      icon: BarChart3,
      label: "Current run",
      value: String(quiz.currentRun),
      hint:
        "rounds in a row at " +
        ROUND_GOOD_PERCENT +
        "% or better" +
        (quiz.bestRun > quiz.currentRun ? " · best is " + quiz.bestRun : ""),
    },
  ];

  return (
    <div className="section-shell py-10">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neon">Your data</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">Your analytics</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Everything here is computed from rows you already own — your quiz rounds and your favourites. This page
          collects nothing new, and none of it can describe another visitor.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[11px] text-white/55 ring-1 ring-white/10">
          <Info className="size-3.5 text-neon/70" aria-hidden />
          {profile.signedIn
            ? "Reading your account (" + profile.quizSource + ", " + profile.favoriteSource + ")"
            : "Reading this browser — sign in and the same numbers follow you to another device"}
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-[var(--radius-card)] p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45">
              <card.icon className="size-3.5 text-neon/70" aria-hidden />
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white/90">{card.value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/40">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">Accuracy, round by round</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Oldest first, fixed to 0–100% so a run of middling rounds cannot be made to look like a mountain range.
            The dashed line is {ROUND_GOOD_PERCENT}%, where a round starts counting towards a run.
          </p>
          <div className="mt-4">
            {quiz.rounds > 0 ? (
              <LineSeries
                points={quiz.series}
                threshold={ROUND_GOOD_PERCENT}
                label={"Accuracy per round over " + quiz.rounds + " rounds"}
              />
            ) : (
              <p className="rounded-xl bg-white/4 p-6 text-center text-xs text-white/45">
                No rounds yet, so there is no line to draw.
              </p>
            )}
          </div>
          {quiz.rounds > 0 ? (
            <p className="mt-2 text-[11px] text-white/35">
              First round {quiz.firstAt?.slice(0, 10)} · latest {quiz.latest?.at.slice(0, 10)} at{" "}
              {quiz.latest?.accuracy}% · {quiz.averageQuestions} questions per round on average
            </p>
          ) : null}
        </div>

        <div className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">How the rounds landed</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Five bands, every round in exactly one of them.
          </p>
          <BarList
            className="mt-4"
            items={quiz.bands.map((band) => ({
              label: band.label,
              count: band.count,
              share: quiz.rounds > 0 ? band.count / quiz.rounds : null,
            }))}
            emptyLabel="Nothing played yet."
          />

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-white/45">Recent weeks</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            The last {WEEK_WINDOW_COUNT} seven-day windows, ending on your most recent round — not on today, so a
            quiet month does not turn into a wall of empty bars.
          </p>
          <div className="mt-3">
            {quiz.byWeek.some((week) => week.rounds > 0) ? (
              <DailyBars
                points={quiz.byWeek.map((week) => ({ day: week.label, views: week.rounds }))}
                label={"Rounds per week over the last " + WEEK_WINDOW_COUNT + " weeks"}
              />
            ) : (
              <p className="text-xs text-white/40">No rounds in this window.</p>
            )}
          </div>

          {quiz.byMode.length > 0 ? (
            <>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-white/45">By mode</h3>
              <ul className="mt-2 space-y-1.5 text-xs">
                {quiz.byMode.map((mode) => (
                  <li key={mode.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-white/70">{mode.label}</span>
                    <span className="w-20 shrink-0 tabular-nums text-white/80">{mode.rounds} rounds</span>
                    <span className="tabular-nums text-white/45">{mode.accuracy}% accuracy</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-white">
          <Heart className="size-4 text-solar/80" aria-hidden />
          What you collect
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/45">
          {favourites.favourites === 0
            ? "Nothing favourited yet."
            : formatCount(favourites.favourites) +
              " species, " +
              (shareOfCatalogue === null ? "—" : shareOfCatalogue + "%") +
              " of the " +
              formatCount(favourites.catalogue) +
              " in the catalogue" +
              (favourites.threatened > 0
                ? ", and " + favourites.threatened + " of them are IUCN-threatened (" + THREATENED_STATUSES.join(", ") + ")"
                : "") +
              "."}
        </p>

        {favourites.favourites === 0 ? (
          <div className="glass mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-5">
            <p className="text-xs text-white/55">
              Tap the heart on any species card and this section fills in: what you lean towards, where you have not
              looked yet.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/explore">Explore species</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-[var(--radius-card)] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">By class</h3>
              <BarList className="mt-3" items={favourites.byCategory} emptyLabel="Nothing favourited yet." />
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-white/45">By region</h3>
              <BarList className="mt-3" items={favourites.byRegion} emptyLabel="Nothing favourited yet." />
            </div>
            <div className="glass rounded-[var(--radius-card)] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">By diet</h3>
              <BarList className="mt-3" items={favourites.byDiet} emptyLabel="Nothing favourited yet." />
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-white/45">
                By conservation status
              </h3>
              <BarList className="mt-3" items={favourites.byStatus} emptyLabel="Nothing favourited yet." />
            </div>
          </div>
        )}

        {favourites.untouchedRegions.length > 0 && favourites.favourites > 0 ? (
          <p className="mt-4 text-xs leading-relaxed text-white/45">
            Regions with nothing favourited yet:{" "}
            <span className="text-white/70">{favourites.untouchedRegions.join(", ")}</span>.
          </p>
        ) : null}
      </section>

      {quiz.rounds === 0 ? (
        <div className="glass mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-5">
          <p className="text-xs text-white/55">
            No quiz rounds recorded yet — the charts above are empty because there is genuinely nothing in them.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/quiz">Play a round</Link>
          </Button>
        </div>
      ) : null}

      <footer className="mt-10 rounded-[var(--radius-card)] border border-white/8 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">Where these numbers come from</h2>
        <ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-white/45">
          <li>
            Quiz rounds: <span className="text-white/70">{formatCount(profile.quizHistory.length)}</span> rows from{" "}
            {profile.quizSource === "supabase"
              ? "public.quiz_scores, filtered to your user id"
              : profile.quizSource === "cookie-fallback"
                ? "this browser's cookie (the account copy could not be read)"
                : "this browser (no account is configured)"}
            . One row per completed round: score, questions, mode, badges, timestamp — never which question you got
            wrong.
          </li>
          <li>
            Favourites: <span className="text-white/70">{formatCount(favourites.favourites)}</span> rows from{" "}
            {profile.favoriteSource === "supabase" ? "public.user_favorites" : "this browser"}. Hearting a species is
            the only thing that writes one.
          </li>
          <li>
            The catalogue: <span className="text-white/70">{formatCount(animals.length)}</span> species, read from
            the same source every other page uses, which is what the shares are shares of.
          </li>
          <li>
            Nothing else is collected for this page: no new table, no analytics script, no fingerprint. Rates are
            shown as “—” rather than 0% when there is nothing to average, because a zero you did not earn is a lie.
          </li>
        </ul>
      </footer>
    </div>
  );
}
