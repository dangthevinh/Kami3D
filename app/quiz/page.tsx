import type { Metadata } from "next";

import { AdSlot } from "@/components/ads/AdSlot";
import { QuizGame } from "@/components/quiz/QuizGame";
import { getAllAnimals } from "@/lib/animals";

export const metadata: Metadata = {
  title: "3D silhouette quiz",
  description:
    "Ten rotating 3D silhouettes, fifteen seconds each. Guess the species, build a streak and unlock collector badges on Kami3D.",
};

export const revalidate = 300;

export default async function QuizPage() {
  const animals = await getAllAnimals();

  return (
    <div className="section-shell space-y-6 pt-10">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Guess the animal from its <span className="text-glow text-neon">shadow</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Every round draws from the same 3D models you have been exploring. Scores are saved to your profile, and
          the badges below unlock as your accuracy climbs.
        </p>
      </header>

      <div className="mx-auto max-w-3xl">
        <QuizGame animals={animals} />
      </div>

      <div className="mx-auto max-w-3xl">
        <AdSlot format="in-article" note="Between rounds only — the quiz silhouette is never covered." />
      </div>
    </div>
  );
}
