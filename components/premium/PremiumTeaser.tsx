"use client";

import { Lock, Play, Sparkles } from "lucide-react";
import * as React from "react";

import { UnlockModal } from "@/components/premium/UnlockModal";
import { Button } from "@/components/ui/button";
import { useExploreStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { formatWeight } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/** Landing-page entry point into the prehistoric vault. */
export function PremiumTeaser({ premiumAnimals }: { premiumAnimals: Animal[] }) {
  const openReward = useUiStore((state) => state.openReward);
  const unlockedPremium = useExploreStore((state) => state.unlockedPremium);
  const unlockedCount = premiumAnimals.filter((animal) => unlockedPremium.includes(animal.slug)).length;

  return (
    <>
      <div className="glass relative overflow-hidden rounded-[var(--radius-card)] p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(50% 60% at 15% 10%, rgba(255,183,56,0.22), transparent 70%), radial-gradient(45% 55% at 85% 90%, rgba(169,123,255,0.22), transparent 70%)",
          }}
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-solar/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-solar ring-1 ring-solar/30">
              <Sparkles className="size-3" />
              Prehistoric vault
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
              Bring extinct giants back into the room
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
              Tyrannosaurus, Megalodon, Smilodon and the Woolly Mammoth are modelled in full 3D.
              Watch a short sponsored clip to unlock them for your session — no account required.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={openReward} variant="default">
                <Play className="fill-current" />
                {unlockedCount > 0 ? "Open the vault" : "Unlock prehistoric species"}
              </Button>
              <span className="text-xs text-white/45">
                {unlockedCount}/{premiumAnimals.length} unlocked this session
              </span>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-3">
            {premiumAnimals.slice(0, 4).map((animal) => {
              const unlocked = unlockedPremium.includes(animal.slug);
              return (
                <li
                  key={animal.id}
                  className="relative overflow-hidden rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl" aria-hidden>
                      {animal.emoji}
                    </span>
                    {unlocked ? (
                      <span className="rounded-full bg-neon/15 px-2 py-0.5 text-[10px] font-medium text-neon ring-1 ring-neon/30">
                        Unlocked
                      </span>
                    ) : (
                      <Lock className="size-3.5 text-white/40" />
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-white">{animal.name}</p>
                  <p className="text-[11px] text-white/45">
                    {animal.scale_ratio} m · {formatWeight(animal.weight_kg)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <UnlockModal premiumAnimals={premiumAnimals} />
    </>
  );
}
