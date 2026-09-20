"use client";

import { BadgeCheck, Lock, Play, Sparkles, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useExploreStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * Rewarded-video gate for prehistoric species.
 *
 * The player here is a **mock**: no ad network is contacted. Drop in the AdSense
 * or Ezoic rewarded-video SDK inside `startPlayback` and call `complete()` from
 * its `onRewarded` callback — the rest of the flow (unlock + persistence) is real.
 */

const AD_SECONDS = 15;

export function UnlockModal({ premiumAnimals }: { premiumAnimals: Animal[] }) {
  const open = useUiStore((state) => state.rewardOpen);
  const closeReward = useUiStore((state) => state.closeReward);
  const unlockPremium = useExploreStore((state) => state.unlockPremium);
  const unlockedPremium = useExploreStore((state) => state.unlockedPremium);

  const [playing, setPlaying] = React.useState(false);
  const [remaining, setRemaining] = React.useState(AD_SECONDS);
  const [justUnlocked, setJustUnlocked] = React.useState(false);
  const closeButton = React.useRef<HTMLButtonElement>(null);

  const slugs = React.useMemo(() => premiumAnimals.map((animal) => animal.slug), [premiumAnimals]);
  const allUnlocked = slugs.length > 0 && slugs.every((slug) => unlockedPremium.includes(slug));

  const complete = React.useCallback(() => {
    setPlaying(false);
    setJustUnlocked(true);
    unlockPremium(slugs);
    window.setTimeout(() => setJustUnlocked(false), 1600);
  }, [slugs, unlockPremium]);

  // Countdown for the mock rewarded ad.
  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          complete();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, complete]);

  // Reset the player whenever the modal is (re)opened.
  React.useEffect(() => {
    if (open) {
      setPlaying(false);
      setRemaining(AD_SECONDS);
      closeButton.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeReward();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeReward]);

  const progress = playing ? ((AD_SECONDS - remaining) / AD_SECONDS) * 100 : 0;

  return (
    <>
      {open ? (
        <div
          className="animate-fade-in fixed inset-0 z-[100] grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlock-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-void/80 backdrop-blur-md"
            onClick={closeReward}
          />

          <div className="glass-strong animate-pop-in relative z-10 w-full max-w-2xl overflow-hidden rounded-[var(--radius-card)] p-5 sm:p-6">
            <button
              ref={closeButton}
              type="button"
              onClick={closeReward}
              aria-label="Close unlock dialog"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/6 text-white/60 transition-colors hover:bg-white/12 hover:text-white"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2 text-solar">
              <Sparkles className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Prehistoric vault</span>
            </div>

            <h2 id="unlock-title" className="mt-2 font-display text-2xl font-bold text-white">
              {allUnlocked ? "Vault unlocked" : "Watch a short video to unlock extinct species"}
            </h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-white/60">
              {allUnlocked
                ? "Every prehistoric 3D model is now available in your encyclopedia."
                : `Unlock ${slugs.length} extinct species in full 3D: rotate them, compare their size to a human, and hear how they might have sounded.`}
            </p>

            {/* Player surface */}
            <div className="relative mt-5 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-[#101a33] to-[#05080f] ring-1 ring-white/10">
              <div
                className="absolute inset-0 opacity-45"
                style={{
                  backgroundImage:
                    "radial-gradient(60% 60% at 30% 20%, rgba(255,183,56,0.35), transparent 70%), radial-gradient(50% 50% at 80% 80%, rgba(53,240,192,0.28), transparent 70%)",
                }}
              />

              <div className="absolute inset-0 grid place-items-center">
                {justUnlocked ? (
                  <div className="animate-pop-in flex flex-col items-center gap-2 text-neon">
                    <BadgeCheck className="size-12" />
                    <span className="font-display text-lg font-semibold">Unlocked!</span>
                  </div>
                ) : playing ? (
                  <div className="w-full max-w-sm px-6 text-center">
                    <p className="font-display text-3xl font-bold tabular-nums text-white">{remaining}s</p>
                    <p className="mt-1 text-xs text-white/55">Sponsored placeholder — no ad network contacted</p>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-neon to-glow transition-[width] duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRemaining(AD_SECONDS);
                      setPlaying(true);
                    }}
                    className="group flex flex-col items-center gap-3"
                  >
                    <span className="grid size-16 place-items-center rounded-full bg-neon text-on-accent shadow-[0_0_40px_-6px_rgba(53,240,192,0.9)] transition-transform group-hover:scale-105">
                      <Play className="size-6 translate-x-0.5 fill-current" />
                    </span>
                    <span className="text-sm font-medium text-white/85">
                      {allUnlocked ? "Replay the demo" : `Play ${AD_SECONDS}s rewarded video`}
                    </span>
                  </button>
                )}
              </div>

              <span className="absolute left-3 top-3 rounded-full bg-void/70 px-2.5 py-1 text-[10px] uppercase tracking-wide text-white/50 ring-1 ring-white/10">
                Ad slot · rewarded video
              </span>
            </div>

            {/* Locked species */}
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {premiumAnimals.map((animal) => {
                const unlocked = unlockedPremium.includes(animal.slug);
                return (
                  <li
                    key={animal.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 transition-colors",
                      unlocked ? "bg-neon/10 ring-neon/30" : "bg-white/5 ring-white/10",
                    )}
                  >
                    <span className="text-xl" aria-hidden>
                      {animal.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-white">{animal.name}</span>
                      <span className="flex items-center gap-1 text-[10px] text-white/45">
                        {unlocked ? (
                          <>
                            <BadgeCheck className="size-3 text-neon" /> Unlocked
                          </>
                        ) : (
                          <>
                            <Lock className="size-3" /> {animal.scale_ratio} m
                          </>
                        )}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-white/40">
                Unlocks are stored per session. In production, grant them from your ad SDK&apos;s reward callback.
              </p>
              <div className="flex items-center gap-2">
                {!allUnlocked ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => unlockPremium(slugs)}>
                    Skip (demo)
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" size="sm" onClick={closeReward}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
