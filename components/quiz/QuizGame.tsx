"use client";

import { Check, Gamepad2, RotateCcw, Timer, Trophy, Volume2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, shuffle } from "@/lib/utils";
import { BADGES, type Animal, type QuizMode } from "@/types/animal";

/** Loaded only once a round starts, so the intro screen stays JS-light. */
const SilhouetteStage = dynamic(
  () => import("@/components/quiz/SilhouetteStage").then((mod) => mod.SilhouetteStage),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-[240px] w-full overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[320px]">
        <Skeleton className="absolute inset-0 rounded-[var(--radius-card)]" />
        <div className="absolute inset-0 grid place-items-center text-xs text-white/45">Preparing the shadow…</div>
      </div>
    ),
  },
);

const QUESTIONS_PER_ROUND = 10;
const SECONDS_PER_QUESTION = 15;

interface Question {
  animal: Animal;
  options: Animal[];
}

type Phase = "ready" | "playing" | "finished";

function buildRound(animals: Animal[], pool: Animal[]): Question[] {
  const chosen = shuffle(pool, `round-${animals.length}-${Date.now()}`).slice(0, QUESTIONS_PER_ROUND);

  return chosen.map((animal, index) => {
    // Distractors prefer the same class/region, which makes the round worth playing.
    const similar = shuffle(
      animals.filter(
        (candidate) =>
          candidate.id !== animal.id && (candidate.category === animal.category || candidate.region === animal.region),
      ),
      `distract-${animal.slug}-${index}`,
    );

    const fallback = shuffle(
      animals.filter((candidate) => candidate.id !== animal.id),
      `fallback-${animal.slug}-${index}`,
    );

    const distractors = [...similar, ...fallback]
      .filter((candidate, position, list) => list.findIndex((item) => item.id === candidate.id) === position)
      .slice(0, 3);

    return { animal, options: shuffle([animal, ...distractors], `options-${animal.slug}`) };
  });
}

/** Badges earned by a single round, computed identically on the client and the server. */
export function badgesForScore(score: number, total: number): string[] {
  const ratio = total > 0 ? score / total : 0;
  return BADGES.filter((badge) => ratio >= badge.threshold).map((badge) => badge.id);
}

export function QuizGame({ animals }: { animals: Animal[] }) {
  const [phase, setPhase] = React.useState<Phase>("ready");
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [score, setScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(SECONDS_PER_QUESTION);
  const [saved, setSaved] = React.useState<{ badges: string[]; best: number; source: string } | null>(null);
  const [saving, setSaving] = React.useState(false);

  const playable = React.useMemo(() => animals.filter((animal) => !animal.premium), [animals]);
  const current = questions[index];

  const start = React.useCallback(() => {
    setQuestions(buildRound(animals, playable.length >= QUESTIONS_PER_ROUND ? playable : animals));
    setIndex(0);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(SECONDS_PER_QUESTION);
    setSaved(null);
    setPhase("playing");
  }, [animals, playable]);

  const finish = React.useCallback(
    async (finalScore: number) => {
      setPhase("finished");
      setSaving(true);
      try {
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            score: finalScore,
            totalQuestions: QUESTIONS_PER_ROUND,
            mode: "silhouette" satisfies QuizMode,
            badges: badgesForScore(finalScore, QUESTIONS_PER_ROUND),
          }),
        });
        const data = (await response.json()) as { badges?: string[]; best?: number; source?: string };
        setSaved({ badges: data.badges ?? badgesForScore(finalScore, QUESTIONS_PER_ROUND), best: data.best ?? finalScore, source: data.source ?? "demo" });
      } catch {
        setSaved({ badges: badgesForScore(finalScore, QUESTIONS_PER_ROUND), best: finalScore, source: "offline" });
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const answer = React.useCallback(
    (animalId: string | null) => {
      if (!current || selected !== null) return;

      const correct = animalId === current.animal.id;
      const nextScore = correct ? score + 1 : score;
      const nextStreak = correct ? streak + 1 : 0;

      setSelected(animalId ?? "timeout");
      setScore(nextScore);
      setStreak(nextStreak);
      setBestStreak((value) => Math.max(value, nextStreak));

      window.setTimeout(() => {
        if (index + 1 >= questions.length) {
          void finish(nextScore);
        } else {
          setIndex((value) => value + 1);
          setSelected(null);
          setTimeLeft(SECONDS_PER_QUESTION);
        }
      }, 1100);
    },
    [current, finish, index, questions.length, score, selected, streak],
  );

  // Countdown for the active question.
  React.useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
    if (timeLeft <= 0) {
      answer(null);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [answer, phase, selected, timeLeft]);

  if (phase === "ready") {
    return (
      <div className="glass rounded-[var(--radius-card)] p-6 text-center sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-neon/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neon ring-1 ring-neon/30">
          <Gamepad2 className="size-3" />
          Silhouette round
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
          {QUESTIONS_PER_ROUND} shadows. How many can you name?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60">
          Each animal appears as a slowly rotating dark model. You get {SECONDS_PER_QUESTION} seconds per question —
          faster answers build a streak, and finishing the round banks badges on your profile.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={start}>
            <Gamepad2 />
            Start round
          </Button>
          <Button size="lg" variant="secondary" disabled title="Needs call recordings uploaded for each species">
            <Volume2 />
            Sound mode (needs recordings)
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {BADGES.map((badge) => (
            <li
              key={badge.id}
              className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[11px] text-white/60 ring-1 ring-white/10"
            >
              <span aria-hidden>{badge.emoji}</span>
              {badge.name} · {Math.round(badge.threshold * 100)}%
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (phase === "finished") {
    const accuracy = Math.round((score / QUESTIONS_PER_ROUND) * 100);
    const earned = saved?.badges ?? badgesForScore(score, QUESTIONS_PER_ROUND);

    return (
      <div className="glass rounded-[var(--radius-card)] p-6 text-center sm:p-10">
        <div className="animate-pop-in inline-flex">
          <Trophy className="size-10 text-solar" />
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold text-white">
          {score} / {QUESTIONS_PER_ROUND}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {accuracy}% accuracy · best streak {bestStreak}
          {saving ? " · saving…" : saved ? ` · saved (${saved.source})` : ""}
        </p>

        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {BADGES.map((badge) => {
            const unlocked = earned.includes(badge.id);
            return (
              <li
                key={badge.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] ring-1",
                  unlocked ? "bg-neon/15 text-neon ring-neon/35" : "bg-white/5 text-white/40 ring-white/10",
                )}
              >
                <span aria-hidden>{badge.emoji}</span>
                {badge.name}
                {unlocked ? <Check className="size-3" /> : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={start}>
            <RotateCcw />
            Play again
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/profile">See my badges</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/explore">Browse species</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const answered = selected !== null;
  const wasCorrect = selected === current.animal.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">
          Question {index + 1} / {questions.length}
        </Badge>
        <Badge variant="neon">Score {score}</Badge>
        {streak > 1 ? <Badge variant="solar">🔥 {streak} streak</Badge> : null}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 tabular-nums",
            timeLeft <= 5 ? "bg-coral/15 text-coral ring-coral/35" : "bg-white/6 text-white/70 ring-white/12",
          )}
        >
          <Timer className="size-3" />
          {timeLeft}s
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon to-glow transition-[width] duration-300"
          style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <SilhouetteStage animal={current.animal} reveal={answered} />

      {/* Remounting on `answered` restarts the CSS entrance animation, which
          replaces the AnimatePresence swap that used to live here. */}
      <React.Fragment key={answered ? "feedback" : `options-${current.animal.id}`}>
        {answered ? (
          <div
            className={cn(
              "animate-rise-in",
              "rounded-2xl p-4 ring-1",
              wasCorrect ? "bg-neon/12 ring-neon/30" : "bg-coral/12 ring-coral/30",
            )}
          >
            <p className={cn("flex items-center gap-2 text-sm font-semibold", wasCorrect ? "text-neon" : "text-coral")}>
              {wasCorrect ? <Check className="size-4" /> : <X className="size-4" />}
              {wasCorrect ? "Correct!" : selected === "timeout" ? "Out of time" : "Not quite"}
            </p>
            <p className="mt-1 text-sm text-white/70">
              <strong className="font-semibold text-white">{current.animal.name}</strong>{" "}
              <em className="italic text-white/50">{current.animal.latin_name}</em> — {current.animal.region},{" "}
              {current.animal.habitat}
            </p>
          </div>
        ) : (
          <ul className="animate-fade-in grid gap-2 sm:grid-cols-2">
            {current.options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => answer(option.id)}
                  className="group w-full rounded-2xl bg-white/6 px-4 py-3.5 text-left text-sm text-white/85 ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:ring-neon/40"
                >
                  <span className="block font-medium">{option.name}</span>
                  <span className="block text-[11px] text-white/45">
                    {option.category} · {option.region}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </React.Fragment>

      {!answered ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => answer(null)}>
            Skip question
          </Button>
        </div>
      ) : null}
    </div>
  );
}
