import { Award, Heart, LogIn, Target, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdSlot } from "@/components/ads/AdSlot";
import { AnimalCard } from "@/components/animal/AnimalCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllAnimals } from "@/lib/animals";
import { isClerkEnabled } from "@/lib/env";
import { isAuthConfigured } from "@/lib/env.server";
import { getViewerProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { BADGES } from "@/types/animal";

export const metadata: Metadata = {
  title: "My collection",
  description: "Your favourited species, quiz scores and unlocked Kami3D badges.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [profile, animals] = await Promise.all([getViewerProfile(), getAllAnimals()]);

  // Resource-based auth check (Clerk's recommended replacement for path-matching
  // middleware): this page is the thing that owns personal data, so this is where
  // the requirement is enforced. In Demo Mode no keys exist, so it stays open.
  if (isAuthConfigured && !profile.signedIn) redirect("/sign-in");

  const favorites = animals.filter((animal) => profile.favoriteIds.includes(animal.id));
  const unlockedBadges = new Set(profile.badges);
  const totalQuestions = profile.quizHistory.reduce((sum, entry) => sum + entry.total_questions, 0);
  const totalCorrect = profile.quizHistory.reduce((sum, entry) => sum + entry.score, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const stats = [
    { icon: Heart, label: "Favourites", value: String(favorites.length) },
    { icon: Target, label: "Rounds played", value: String(profile.roundsPlayed) },
    { icon: Trophy, label: "Best score", value: profile.roundsPlayed > 0 ? `${profile.bestScore}/${profile.bestTotal}` : "—" },
    { icon: Award, label: "Accuracy", value: profile.roundsPlayed > 0 ? `${accuracy}%` : "—" },
  ];

  return (
    <div className="section-shell space-y-8 pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55 ring-1 ring-white/12">
            <Heart className="size-3 text-neon" />
            Collection
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {profile.signedIn ? "Your field notebook" : "Your local field notebook"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            {profile.signedIn
              ? `Synced to your account (storage: ${profile.favoriteSource}).`
              : "Stored in this browser. Sign in to sync favourites, scores and badges across every device."}
          </p>
        </div>

        {!profile.signedIn ? (
          <Button asChild variant={isClerkEnabled ? "default" : "secondary"}>
            <Link href="/sign-in">
              <LogIn />
              {isClerkEnabled ? "Sign in to sync" : "How to enable sign-in"}
            </Link>
          </Button>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4">
            <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
              <stat.icon className="size-3 text-neon/80" />
              {stat.label}
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section id="badges" className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Badges</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map((badge) => {
            const unlocked = unlockedBadges.has(badge.id);
            return (
              <li
                key={badge.id}
                className={cn(
                  "rounded-2xl p-4 ring-1 transition-colors",
                  unlocked ? "bg-neon/10 ring-neon/30" : "bg-white/4 ring-white/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-2xl", !unlocked && "opacity-35 grayscale")} aria-hidden>
                    {badge.emoji}
                  </span>
                  {unlocked ? (
                    <Badge variant="neon">Unlocked</Badge>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-white/35">
                      {Math.round(badge.threshold * 100)}% needed
                    </span>
                  )}
                </div>
                <p className="mt-2.5 font-display text-sm font-semibold text-white">{badge.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{badge.description}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Favourite species</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/explore">Find more species</Link>
          </Button>
        </div>

        {favorites.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((animal) => (
              <li key={animal.id}>
                <AnimalCard animal={animal} className="h-full" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="glass grid place-items-center gap-2 rounded-[var(--radius-card)] px-6 py-14 text-center">
            <Heart className="size-7 text-white/30" />
            <p className="text-sm text-white/60">
              No favourites yet. Tap the heart on any species card and it will show up here.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/explore">Browse the encyclopedia</Link>
            </Button>
          </div>
        )}
      </section>

      {profile.quizHistory.length > 0 ? (
        <section className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="font-display text-lg font-semibold text-white">Recent quiz rounds</h2>
          <ul className="mt-4 divide-y divide-white/8">
            {profile.quizHistory.slice(0, 8).map((entry) => (
              <li key={entry.created_at} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="text-white/70">
                  {entry.score} / {entry.total_questions}
                  <span className="ml-2 text-[11px] uppercase tracking-wide text-white/35">{entry.mode}</span>
                </span>
                <span className="text-xs text-white/40">
                  {new Date(entry.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AdSlot format="leaderboard" note="Profile slots stay below the fold of every 3D surface." />
    </div>
  );
}
