import type { Metadata } from "next";
import Link from "next/link";

import { Sparkline } from "@/components/stats/Sparkline";
import { getCurrentUserId } from "@/lib/auth";
import { CHANNELS, type Channel } from "@/lib/channel";
import { getPersonalDataClient } from "@/lib/personal-data";
import { cn } from "@/lib/utils";

/**
 * `/admin/analytics` — which channels bring readers, and what they do here.
 *
 * ## What this page is, and what it refuses to be
 *
 * It is **first-party and aggregate only**. There is no GA4, no Plausible cloud, no PostHog, no
 * heat-map recorder: a third-party script on every page is what docs/REVIEW.md measured and removed
 * once already, and it turns a reader's behaviour into somebody else's data. Instead the middleware
 * classifies each page view into a channel, and three tables hold a day, a label and a count.
 *
 * Nothing on this page can identify a person, because nothing in the database can: no IP, no user
 * agent, no visitor id, no query string. `npm run check:channel` reads the schema and fails if a
 * column named like an identifier ever appears.
 *
 * ## The numbers, and why they are shaped this way
 *
 * - **bot traffic is a row, not a rounding error.** Every percentage below is calculated over
 *   non-bot hits only, and the bot row is printed next to it so the exclusion is visible;
 * - **sessions are not claimed.** This deployment counts hits; a "unique visitors" figure would need
 *   an identifier, and having decided not to keep one, the page does not pretend otherwise;
 * - **searches are outcomes.** `matched` / `no_match` and, when it matched, which species - never the
 *   term somebody typed, because a search box can hold a name.
 */

export const metadata: Metadata = {
  title: "Channel analytics",
  description: "Where readers come from, counted first-party and in aggregate.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

interface TrafficRow {
  day: string;
  channel: Channel;
  hits: number;
}

interface PageRow {
  route: string;
  hits: number;
}

interface SearchRow {
  outcome: "matched" | "no_match";
  slug: string;
  hits: number;
}

async function adminStatus(): Promise<{ signedIn: boolean; admin: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { signedIn: false, admin: false };

  const supabase = await getPersonalDataClient();
  if (!supabase) return { signedIn: true, admin: false };

  const { data, error } = await supabase.rpc("is_admin");
  if (error) return { signedIn: true, admin: false };
  return { signedIn: true, admin: data === true };
}

/** Days in the window, oldest first, so a chart with no gaps is a chart that cannot mislead. */
function dayKeys(days: number): string[] {
  const today = new Date();
  return Array.from({ length: days }, (_, index) =>
    new Date(today.getTime() - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  );
}

export default async function AnalyticsPage() {
  const status = await adminStatus();

  if (!status.admin) {
    return (
      <div className="section-shell py-14">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Channel analytics</h1>
        <div className="glass mt-5 max-w-2xl rounded-[var(--radius-card)] p-5 text-sm leading-relaxed text-white/60">
          {status.signedIn ? (
            <p>
              This account is not an admin. Access is a row in <code className="text-white/80">public.app_admins</code>,
              checked by <code className="text-white/80">public.is_admin()</code> — and the same policy is what makes the
              three counters readable at all, so the numbers are not merely hidden from this page.
            </p>
          ) : (
            <p>Sign in first: being an admin is a row in the database, not a flag on a page.</p>
          )}
          <p className="mt-3 text-xs text-white/40">
            The tables are aggregate by construction — a day, a channel and a count — and there is nothing in them about
            any individual reader.
          </p>
        </div>
        <Link href="/" className="mt-5 inline-block text-xs text-neon hover:text-white">
          ← Back home
        </Link>
      </div>
    );
  }

  const supabase = await getPersonalDataClient();
  const since = dayKeys(WINDOW_DAYS)[0];

  const [traffic, pages, searches, quizzes, favourites, settings] = await Promise.all([
    supabase!.from("traffic_daily").select("day, channel, hits").gte("day", since).order("day"),
    supabase!.from("page_daily").select("route, hits").gte("day", since).order("hits", { ascending: false }).limit(400),
    supabase!.from("search_daily").select("outcome, slug, hits").gte("day", since),
    supabase!.from("quiz_scores").select("*", { count: "exact", head: true }),
    supabase!.from("user_favorites").select("*", { count: "exact", head: true }),
    supabase!.from("user_settings").select("*", { count: "exact", head: true }),
  ]);

  const trafficRows = (traffic.data ?? []) as TrafficRow[];
  const days = dayKeys(WINDOW_DAYS);

  const byChannel = new Map<Channel, Map<string, number>>();
  for (const channel of CHANNELS) byChannel.set(channel, new Map());
  for (const row of trafficRows) byChannel.get(row.channel)?.set(row.day, (byChannel.get(row.channel)?.get(row.day) ?? 0) + row.hits);

  const total = (channel: Channel) => [...(byChannel.get(channel)?.values() ?? [])].reduce((sum, value) => sum + value, 0);
  const botHits = total("bot");
  const humanHits = CHANNELS.filter((channel) => channel !== "bot").reduce((sum, channel) => sum + total(channel), 0);

  const routeTotals = new Map<string, number>();
  for (const row of (pages.data ?? []) as PageRow[]) routeTotals.set(row.route, (routeTotals.get(row.route) ?? 0) + row.hits);
  const topRoutes = [...routeTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const searchRows = (searches.data ?? []) as SearchRow[];
  const missedHits = searchRows.filter((row) => row.outcome === "no_match").reduce((sum, row) => sum + row.hits, 0);
  const matchedHits = searchRows.filter((row) => row.outcome === "matched").reduce((sum, row) => sum + row.hits, 0);

  const percent = (value: number) => (humanHits === 0 ? "—" : Math.round((value / humanHits) * 1000) / 10 + "%");
  const format = (value: number) => value.toLocaleString("en-US");

  return (
    <div className="section-shell py-10">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-solar">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">Channel analytics</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          The last {WINDOW_DAYS} days, first-party and in aggregate. Counted in the middleware from the request's own
          headers, written as a day, a channel and a count — and nothing else.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Page views (no bots)", value: format(humanHits), hint: "hits = one GET for a page, bot traffic excluded" },
          { label: "Bot hits", value: format(botHits), hint: "crawlers, monitors and previews, counted separately" },
          {
            label: "Top channel",
            value:
              CHANNELS.filter((channel) => channel !== "bot").sort((a, b) => total(b) - total(a))[0] && humanHits > 0
                ? CHANNELS.filter((channel) => channel !== "bot").sort((a, b) => total(b) - total(a))[0]
                : "—",
            hint: "the channel with the most hits in the window",
          },
          { label: "Searches with no match", value: format(missedHits), hint: "matched: " + format(matchedHits) + " · logged as an outcome, never as a term" },
        ].map((card) => (
          <div key={card.label} className="glass rounded-[var(--radius-card)] p-4">
            <p className="text-[10px] uppercase tracking-wide text-white/40">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white/90">{card.value}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/35">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">Channels</h2>
        <p className="mt-1 text-xs text-white/45">
          A channel is decided once per request: campaign tag first, then bot, then the host the reader came from, then
          whether the navigation was internal. Percentages are of non-bot hits only.
        </p>

        <ul className="mt-4 space-y-2">
          {CHANNELS.map((channel) => {
            const series = days.map((day) => ({ day, views: byChannel.get(channel)?.get(day) ?? 0 }));
            const hits = total(channel);
            const isBot = channel === "bot";

            return (
              <li key={channel} className="glass flex items-center gap-4 rounded-[var(--radius-card)] p-3">
                <span className={cn("w-24 shrink-0 text-xs font-medium", isBot ? "text-white/50" : "text-white/85")}>
                  {channel}
                </span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-white/80">{format(hits)}</span>
                <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-white/45">
                  {isBot ? "excluded" : percent(hits)}
                </span>
                <Sparkline points={series} width={220} height={28} className="h-7 min-w-0 flex-1" label={channel + " hits over " + WINDOW_DAYS + " days"} />
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">Top routes</h2>
          <p className="mt-1 text-xs text-white/45">
            Routes are normalised: every species page is one row, and a query string is never stored.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs">
            {topRoutes.length === 0 ? (
              <li className="text-white/40">No page views recorded yet.</li>
            ) : (
              topRoutes.map(([route, hits]) => (
                <li key={route} className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-1.5">
                  <code className="truncate text-white/75">{route}</code>
                  <span className="tabular-nums text-white/45">{format(hits)}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">Searches and accounts</h2>
          <p className="mt-1 text-xs text-white/45">
            A search is recorded as an outcome. The term somebody typed is not in the database, and this page could not
            show it if it were.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs">
            <li className="flex justify-between gap-3">
              <span className="text-white/60">Searches that matched a species</span>
              <span className="tabular-nums text-white/80">{format(matchedHits)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-white/60">Searches that matched nothing</span>
              <span className="tabular-nums text-white/80">{format(missedHits)}</span>
            </li>
            <li className="flex justify-between gap-3 border-t border-white/8 pt-1.5">
              <span className="text-white/60">Quiz scores stored</span>
              <span className="tabular-nums text-white/80">{format(quizzes.count ?? 0)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-white/60">Favourites stored</span>
              <span className="tabular-nums text-white/80">{format(favourites.count ?? 0)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-white/60">Settings rows saved</span>
              <span className="tabular-nums text-white/80">{format(settings.count ?? 0)}</span>
            </li>
          </ul>
        </section>
      </div>

      <section className="glass mt-10 max-w-3xl rounded-[var(--radius-card)] p-5 text-xs leading-relaxed text-white/50">
        <p className="font-medium text-white/75">What this page is not</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Not a visitor list: the schema has no column that could identify a person, and `npm run check:channel` fails if one appears.</li>
          <li>Not sessions or uniques: counting either needs an identifier, and this deployment decided not to keep one.</li>
          <li>Not cross-site: nothing follows a reader anywhere, and `DNT: 1` or `Sec-GPC: 1` means the request is not counted at all.</li>
          <li>Not a third-party SDK: no script from anybody else runs on these pages to measure them.</li>
        </ul>
        <p className="mt-3 text-[11px] text-white/35">
          Retention 400 days, pruned nightly; these counters are readable by admins only, through
          `public.is_admin()`, and written only by the service role through `bump_traffic()`.
        </p>
      </section>
    </div>
  );
}
