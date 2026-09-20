import type { Metadata } from "next";

import { AdSlot } from "@/components/ads/AdSlot";
import { QuizGame } from "@/components/quiz/QuizGame";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAllAnimals } from "@/lib/animals";
import { publicEnv } from "@/lib/env";
import { breadcrumbJsonLd, graph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "3D silhouette quiz",
  description:
    "Ten rotating 3D silhouettes, fifteen seconds each. Guess the species, build a streak and unlock collector badges on Kami3D.",
  alternates: { canonical: "/quiz" },
  openGraph: {
    type: "website",
    title: "The 3D silhouette quiz",
    description: "Ten rotating silhouettes, fifteen seconds each. Can you name the animal from its shadow?",
    url: "/quiz",
    siteName: "Kami3D",
  },
  twitter: { card: "summary_large_image" },
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

      {/* A quiz is a learning resource; saying so is what lets it appear as one. */}
      <JsonLd
        data={graph([
          {
            "@type": "Quiz",
            name: "Kami3D 3D silhouette quiz",
            description:
              "Identify an animal from a rotating 3D silhouette. Ten questions per round, fifteen seconds each, scored against the Kami3D catalogue.",
            educationalLevel: "Beginner",
            learningResourceType: "Quiz",
            inLanguage: "en",
            isPartOf: { "@id": `${publicEnv.siteUrl}/#website` },
            url: `${publicEnv.siteUrl}/quiz`,
            numberOfQuestions: 10,
          },
          breadcrumbJsonLd(publicEnv.siteUrl, [
            { name: "Home", path: "/" },
            { name: "Quiz", path: "/quiz" },
          ]),
        ])}
      />

      <div className="mx-auto max-w-3xl">
        <QuizGame animals={animals} />
      </div>

      <div className="mx-auto max-w-3xl">
        <AdSlot format="in-article" note="Between rounds only — the quiz silhouette is never covered." />
      </div>
    </div>
  );
}
