"use client";

import { Check, Gamepad2, Lightbulb, Pause, Play, RotateCcw, Timer, Trophy, Volume2, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import * as React from "react";

import { useSettings } from "@/components/settings/SettingsProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ANSWER_SECONDS,
  CALL_ROUND_KINDS,
  QUESTIONS_PER_ROUND,
  buildRound,
  isCorrect,
  type QuizQuestion,
} from "@/lib/quiz";
import { accuracyPercent, badgesForScore, bestStreakOf, scoreAnswer } from "@/lib/quiz-scoring";
import { playTone } from "@/lib/ui-sound";
import { volumeGain } from "@/lib/user-settings";
import { cn } from "@/lib/utils";
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

/** How long the feedback stays up before the round moves on by itself. */
const FEEDBACK_MS = 1400;

/** A sound round needs at least this many recorded species to be worth playing. */
export const MIN_CALL_SPECIES = 4;

/**
 * The question for the sound round: a call, played on demand.
 *
 * `preload="none"` and no `autoPlay`: the browser fetches nothing until the
 * visitor presses play, which is what stops a ten-question round from pulling ten
 * recordings the moment it starts. The playback is also the question, so the button
 * is the largest thing on the card.
 */
function CallPlayer({ url, animalName }: { url: string; animalName: string }) {
  const { settings } = useSettings();
  const gain = volumeGain(settings.masterVolume, settings.animalVolume);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      audio.volume = gain;
      await audio.play();
      setPlaying(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="grid h-[240px] w-full place-items-center rounded-[var(--radius-card)] bg-gradient-to-b from-[#0a1120] to-[#04060f] ring-1 ring-white/10 sm:h-[320px]">
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
      />

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause the ${animalName} call` : "Play the call"}
          className="grid size-20 place-items-center rounded-full bg-neon text-[#04121a] shadow-[0_0_50px_-8px_rgba(53,240,192,0.9)] transition-transform hover:scale-105"
        >
          {playing ? <Pause className="size-8" /> : <Play className="size-8 translate-x-0.5 fill-current" />}
        </button>

        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/12">
          <div className="h-full rounded-full bg-gradient-to-r from-neon to-glow transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>

        <p className="text-[11px] text-white/45">
          {failed ? "The browser blocked playback — press play again" : "Press play, then name the animal"}
        </p>
      </div>
    </div>
  );
}

/** An unfinished round, kept in the browser so a refresh does not eat it. */
const STORAGE_KEY = "kami-quiz-round";

type RoundMode = "silhouette" | "sound";

interface SavedRound {
  seed: string;
  index: number;
  correct: number;
  points: number;
  answers: boolean[];
  /** Kept so a resumed round stays the round it was. */
  mode: RoundMode;
}

interface Feedback {
  correct: boolean;
  timedOut: boolean;
  points: number;
  speedBonus: number;
  streakBonus: number;
}

function readSavedRound(): SavedRound | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedRound>;
    if (typeof parsed.seed !== "string") return null;
    if (typeof parsed.index !== "number" || parsed.index <= 0 || parsed.index >= QUESTIONS_PER_ROUND) return null;
    if (!Array.isArray(parsed.answers)) return null;
    return {
      seed: parsed.seed,
      index: parsed.index,
      correct: typeof parsed.correct === "number" ? parsed.correct : 0,
      points: typeof parsed.points === "number" ? parsed.points : 0,
      answers: parsed.answers.map(Boolean),
      mode: parsed.mode === "sound" ? "sound" : "silhouette",
    };
  } catch {
    return null;
  }
}

/**
 * The silhouette round.
 *
 * Questions come from `lib/quiz.ts` (seeded, so a round can be rebuilt exactly),
 * points from `lib/quiz-scoring.ts`. The stored score stays the **correct count**:
 * the server recomputes badges from it, and a round of ten right answers is worth
 * the same badges however fast they were given.
 */
export function QuizGame({ animals }: { animals: Animal[] }) {
  const { settings: sound } = useSettings();
  const [phase, setPhase] = React.useState<"ready" | "playing" | "finished">("ready");
  const [mode, setMode] = React.useState<RoundMode>("silhouette");
  const [seed, setSeed] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [correct, setCorrect] = React.useState(0);
  const [points, setPoints] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [answers, setAnswers] = React.useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = React.useState<number>(ANSWER_SECONDS.default);
  const [paused, setPaused] = React.useState(false);
  const [saved, setSaved] = React.useState<{ badges: string[]; best: number; source: string } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [resumable, setResumable] = React.useState<SavedRound | null>(null);

  const advanceTimer = React.useRef<number | null>(null);
  const wrapper = React.useRef<HTMLDivElement>(null);

  const playable = React.useMemo(() => animals.filter((animal) => !animal.premium), [animals]);
  const pool = playable.length >= QUESTIONS_PER_ROUND ? playable : animals;

  /**
   * The species a sound round can ask about: the ones with a recording. A sound
   * question about a silent animal would be a question with no evidence.
   */
  const recorded = React.useMemo(() => animals.filter((animal) => animal.sound_url), [animals]);

  // Rebuilt from the seed, so a resumed round is the same round.
  const round = React.useMemo(() => {
    if (!seed) return [];
    if (mode === "sound") return buildRound(recorded, { seed, kinds: CALL_ROUND_KINDS, count: recorded.length });
    return buildRound(pool, { seed });
  }, [mode, pool, recorded, seed]);

  const total = round.length || QUESTIONS_PER_ROUND;
  const current = round[index];

  React.useEffect(() => {
    setResumable(readSavedRound());
  }, []);

  /**
   * Keyboard play needs the quiz to hold the focus.
   *
   * Clicking "Start round" focuses that button, and the button is unmounted the
   * moment the round begins — so without this the shortcuts silently do nothing
   * until the player happens to click inside the question. Re-focusing on every
   * question keeps 1–4 and Enter working for the whole round.
   */
  React.useEffect(() => {
    wrapper.current?.focus();
  }, [index, phase]);

  // Persist the round as it is played, and forget it once it is over.
  React.useEffect(() => {
    if (phase !== "playing" || !seed) return;
    try {
      const snapshot: SavedRound = { seed, index, correct, points, answers, mode };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Private mode: the round simply is not resumable.
    }
  }, [answers, correct, index, mode, phase, points, seed]);

  const clearSaved = React.useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ditto.
    }
    setResumable(null);
  }, []);

  const start = React.useCallback(
    (resume: SavedRound | null, nextMode: RoundMode = "silhouette") => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);

      const nextSeed = resume?.seed ?? String(Date.now());
      setMode(resume?.mode ?? nextMode);
      setSeed(nextSeed);
      setIndex(resume?.index ?? 0);
      setCorrect(resume?.correct ?? 0);
      setPoints(resume?.points ?? 0);
      setAnswers(resume?.answers ?? []);
      // The held streak does not survive a break: it counts answers given in a
      // row, and a resumed round has not been in a row. The *best* streak is
      // still recovered from the answers for the finish screen.
      setStreak(0);
      setSelected(null);
      setFeedback(null);
      setTimeLeft(ANSWER_SECONDS.default);
      setSaved(null);
      setResumable(null);
      setPhase("playing");
    },
    [],
  );

  const finish = React.useCallback(async (finalScore: number) => {
    setPhase("finished");
    clearSaved();
    setSaving(true);
    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          score: finalScore,
          totalQuestions: total,
          mode: mode satisfies QuizMode,
          badges: badgesForScore(finalScore, total),
        }),
      });
      const data = (await response.json()) as { badges?: string[]; best?: number; source?: string };
      setSaved({
        badges: data.badges ?? badgesForScore(finalScore, total),
        best: data.best ?? finalScore,
        source: data.source ?? "demo",
      });
    } catch {
      setSaved({ badges: badgesForScore(finalScore, total), best: finalScore, source: "offline" });
    } finally {
      setSaving(false);
    }
  }, [clearSaved, mode, total]);

  /** Moves to the next question, or ends the round. */
  const advance = React.useCallback(() => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }

    setSelected(null);
    setFeedback(null);
    setTimeLeft(ANSWER_SECONDS.default);

    if (index + 1 >= total) {
      void finish(correct);
      return;
    }
    setIndex((value) => value + 1);
  }, [correct, finish, index, total]);

  const answer = React.useCallback(
    (optionId: string | null) => {
      if (!current || selected !== null) return;

      const wasCorrect = isCorrect(current, optionId);
      const scored = scoreAnswer({
        correct: wasCorrect,
        secondsLeft: timeLeft,
        secondsAllowed: ANSWER_SECONDS.default,
        streakBefore: streak,
      });

      setSelected(optionId ?? "timeout");
      setFeedback({
        correct: wasCorrect,
        timedOut: optionId === null,
        points: scored.points,
        speedBonus: scored.speedBonus,
        streakBonus: scored.streakBonus,
      });
      // The tone the uiSounds setting turns on: it says what the card already says,
      // which is the only justification a sound effect needs.
      if (sound.uiSounds) playTone(wasCorrect ? "correct" : "wrong", volumeGain(sound.masterVolume, 100));

      setCorrect((value) => value + (wasCorrect ? 1 : 0));
      setPoints((value) => value + scored.points);
      setStreak(scored.streak);
      setAnswers((value) => [...value, wasCorrect]);

      advanceTimer.current = window.setTimeout(advance, FEEDBACK_MS);
    },
    [advance, current, selected, streak, timeLeft, sound.uiSounds, sound.masterVolume],
  );

  React.useEffect(() => {
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  // The clock stops while the tab is in the background: a round that keeps
  // counting down behind another tab is lost to the browser, not to the player.
  React.useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Countdown for the active question.
  React.useEffect(() => {
    if (phase !== "playing" || selected !== null || paused) return;
    if (timeLeft <= 0) {
      answer(null);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [answer, paused, phase, selected, timeLeft]);

  /** 1-4 answer, Enter moves on. Ignored when a control has focus. */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target && target !== event.currentTarget && target.closest("button, a, input, select, textarea")) return;

    if (phase === "playing" && current) {
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= current.options.length) {
        if (selected === null) answer(current.options[digit - 1].id);
        event.preventDefault();
        return;
      }
      if (event.key === "Enter" && selected !== null) {
        advance();
        event.preventDefault();
        return;
      }
    }

    if (event.key === "Enter" && phase === "ready") {
      start(resumable);
      event.preventDefault();
    }
  }

  /* ---------------------------------------------------------------- ready --- */

  if (phase === "ready") {
    return (
      <div ref={wrapper} onKeyDown={onKeyDown} tabIndex={0} aria-keyshortcuts="1 2 3 4 Enter" className="glass rounded-[var(--radius-card)] p-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-neon/60 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-neon/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neon ring-1 ring-neon/30">
          <Gamepad2 className="size-3" />
          Mixed round
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
          {QUESTIONS_PER_ROUND} shadows. How many can you name?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60">
          Six silhouettes to identify, then questions about where a species lives, what kind of animal it is, and
          whether it is longer than something familiar. {ANSWER_SECONDS.default} seconds each; answering fast and in a
          row is worth extra points, and finishing the round banks badges on your profile.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {resumable ? (
            <>
              <Button size="lg" onClick={() => start(resumable)}>
                <Play />
                Continue round ({resumable.index}/{QUESTIONS_PER_ROUND})
              </Button>
              <Button size="lg" variant="secondary" onClick={() => start(null, "silhouette")}>
                <RotateCcw />
                Start a new round
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={() => start(null, "silhouette")}>
              <Gamepad2 />
              Start round
            </Button>
          )}

          {/* The sound round appears when the catalogue can actually support it —
              a mode that asks about silent animals would be a broken question. */}
          {recorded.length >= MIN_CALL_SPECIES ? (
            <Button size="lg" variant="secondary" onClick={() => start(null, "sound")}>
              <Volume2 />
              Sound round · {recorded.length} recorded species
            </Button>
          ) : (
            <Button
              size="lg"
              variant="ghost"
              disabled
              title={`Needs recordings for at least ${MIN_CALL_SPECIES} species (currently ${recorded.length})`}
            >
              <Volume2 />
              Sound mode (needs recordings)
            </Button>
          )}
        </div>

        <p className="mt-4 text-[11px] text-white/40">
          Keyboard: <kbd className="rounded bg-white/8 px-1">1</kbd>–<kbd className="rounded bg-white/8 px-1">4</kbd> to
          answer, <kbd className="rounded bg-white/8 px-1">Enter</kbd> to move on.
        </p>

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

  /* ------------------------------------------------------------- finished --- */

  if (phase === "finished") {
    const accuracy = accuracyPercent({ correct, total });
    const earned = saved?.badges ?? badgesForScore(correct, total);

    return (
      <div className="glass rounded-[var(--radius-card)] p-6 text-center sm:p-10">
        <div className="animate-pop-in inline-flex">
          <Trophy className="size-10 text-solar" />
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold text-white">
          {correct} / {total}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {accuracy}% accuracy · {points.toLocaleString()} points · best streak {bestStreakOf(answers)}
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
          <Button size="lg" onClick={() => start(null)}>
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

  /* -------------------------------------------------------------- playing --- */

  if (!current) return null;

  const answered = selected !== null;
  const wasCorrect = feedback?.correct ?? false;

  return (
    <div
      ref={wrapper}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-keyshortcuts="1 2 3 4 Enter"
      className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-neon/60"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">
          {mode === "sound" ? "Sound" : "Silhouette"} · question {index + 1} / {total}
        </Badge>
        <Badge variant="neon">Score {correct}</Badge>
        <Badge variant="iris">{points.toLocaleString()} pts</Badge>
        {streak > 1 ? <Badge variant="solar">🔥 {streak} streak</Badge> : null}
        {paused ? (
          <Badge variant="outline">
            <Pause className="size-3" />
            Paused — the clock stops while this tab is hidden
          </Badge>
        ) : null}
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
          style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <p className="font-display text-lg font-semibold text-white">{current.prompt}</p>

      {/* A call question plays the recording; the model is the reward for answering. */}
      {current.kind === "call" && !answered ? (
        <CallPlayer url={current.subject.sound_url ?? ""} animalName={current.subject.name} />
      ) : (
        <SilhouetteStage animal={current.subject} reveal={answered || current.kind === "call"} />
      )}

      <React.Fragment key={answered ? "feedback" : `options-${current.id}`}>
        {answered ? (
          <div
            aria-live="polite"
            className={cn(
              "animate-rise-in rounded-2xl p-4 ring-1",
              wasCorrect ? "bg-neon/12 ring-neon/30" : "bg-coral/12 ring-coral/30",
            )}
          >
            <p className={cn("flex items-center gap-2 text-sm font-semibold", wasCorrect ? "text-neon" : "text-coral")}>
              {wasCorrect ? <Check className="size-4" /> : <X className="size-4" />}
              {wasCorrect ? "Correct!" : feedback?.timedOut ? "Out of time" : "Not quite"}
              {wasCorrect ? (
                <span className="ml-1 font-normal text-white/55">
                  +{feedback?.points ?? 0} pts
                  {feedback && feedback.speedBonus + feedback.streakBonus > 0
                    ? ` (speed +${feedback.speedBonus} · streak +${feedback.streakBonus})`
                    : ""}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-white/70">
              <strong className="font-semibold text-white">{current.subject.name}</strong>{" "}
              <em className="italic text-white/50">{current.subject.latin_name}</em> — {current.reveal}
            </p>
            <p className="mt-2 text-[11px] text-white/40">
              Answer: {current.options.find((option) => option.id === current.answerId)?.label}
            </p>
          </div>
        ) : (
          <ul className="animate-fade-in grid gap-2 sm:grid-cols-2">
            {current.options.map((option, position) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => answer(option.id)}
                  className="group flex w-full items-start gap-2 rounded-2xl bg-white/6 px-4 py-3.5 text-left text-sm text-white/85 ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:ring-neon/40"
                >
                  <kbd className="mt-0.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/50">
                    {position + 1}
                  </kbd>
                  <span className="min-w-0">
                    <span className="block font-medium">{option.label}</span>
                    {option.hint ? <span className="block text-[11px] text-white/45">{option.hint}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </React.Fragment>

      {!answered ? (
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/35">
            <Lightbulb className="size-3" />
            The model reveals itself either way.
          </span>
          <Button variant="ghost" size="sm" onClick={() => answer(null)}>
            Skip question
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={advance}>
            Next question (Enter)
          </Button>
        </div>
      )}
    </div>
  );
}
