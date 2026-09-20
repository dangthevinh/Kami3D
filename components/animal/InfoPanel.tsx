import { Activity, Apple, Clock, Globe2, Layers, MapPin, Ruler, Scale, Sparkles } from "lucide-react";
import * as React from "react";

import { Measurement } from "@/components/animal/Measurement";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REGION_ANCHORS, statusToTailwind, type Animal } from "@/types/animal";

/**
 * Server component: the species fact sheet.
 *
 * Everything here comes from the database row, so it works with JavaScript
 * disabled and is fully indexable by search engines.
 */

const STATUS_CONTEXT: Record<string, string> = {
  Extinct: "No living individuals remain anywhere on Earth.",
  "Extinct in the Wild": "Survives only in captivity or outside its natural range.",
  "Critically Endangered": "Faces an extremely high risk of extinction in the wild.",
  Endangered: "Faces a very high risk of extinction in the wild.",
  Vulnerable: "Faces a high risk of extinction in the wild.",
  "Near Threatened": "Close to qualifying for a threatened category.",
  "Least Concern": "Widespread and abundant — no immediate risk.",
  "Data Deficient": "Too little data to assess its extinction risk.",
};

export function InfoPanel({ animal }: { animal: Animal }) {
  const status = statusToTailwind(animal.conservation_status);
  const anchor = REGION_ANCHORS[animal.region];

  const facts: { icon: typeof MapPin; label: string; value: React.ReactNode }[] = [
    { icon: MapPin, label: "Habitat", value: animal.habitat },
    { icon: Apple, label: "Diet", value: animal.diet },
    { icon: Globe2, label: "Region", value: `${anchor.label} — ${anchor.blurb}` },
    { icon: Layers, label: "Class", value: animal.category },
    { icon: Clock, label: "Lifespan", value: animal.lifespan_years },
    // Weight, length and height are the three numbers a visitor may want in feet
    // and pounds; they hydrate from the leaf so the rest of this stays on the server.
    { icon: Scale, label: "Weight", value: <Measurement kind="weight" value={animal.weight_kg} /> },
    { icon: Ruler, label: "Length", value: <Measurement kind="length" value={animal.length_m} /> },
    { icon: Activity, label: "Height", value: animal.height_m > 0 ? <Measurement kind="height" value={animal.height_m} /> : "—" },
  ];

  return (
    <div className="space-y-5">
      <section className="glass rounded-[var(--radius-card)] p-5">
        <h2 className="font-display text-lg font-semibold text-white">About the {animal.name.toLowerCase()}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{animal.description}</p>
      </section>

      <section className={cn("rounded-[var(--radius-card)] p-5 ring-1", status.bg, status.ring)}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("inline-flex items-center gap-2 text-sm font-semibold", status.text)}>
            <span className={cn("size-2 rounded-full", status.dot)} />
            {animal.conservation_status}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-white/40">IUCN Red List category</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {STATUS_CONTEXT[animal.conservation_status] ?? "Conservation status recorded by the IUCN Red List."}
        </p>
      </section>

      <section className="glass rounded-[var(--radius-card)] p-5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          Vital statistics
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/6 text-neon ring-1 ring-white/10">
                <fact.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-white/40">{fact.label}</dt>
                <dd className="text-sm text-white/80">{fact.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {animal.fun_facts.length > 0 ? (
        <section className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
            <Sparkles className="size-4 text-solar" />
            Fun facts
          </h2>
          <ul className="mt-4 space-y-3">
            {animal.fun_facts.map((fact) => (
              <li key={fact} className="flex gap-3 text-sm leading-relaxed text-white/70">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon" />
                {fact}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{animal.latin_name}</Badge>
        <Badge variant="neon">{animal.category}</Badge>
        <Badge variant="iris">{animal.diet}</Badge>
        {animal.is_prehistoric ? <Badge variant="solar">Prehistoric</Badge> : null}
      </div>
    </div>
  );
}
