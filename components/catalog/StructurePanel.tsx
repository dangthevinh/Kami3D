import { describeStructure, getModelStructure } from "@/lib/model-structure";

/**
 * What the file is made of, printed instead of a control that would do nothing.
 *
 * This panel exists because Phase 29's brief asked for floor and furniture toggles and the measurement
 * said the catalogue cannot have them: of 166 shipped models, 112 name no part at all, and the rest name
 * them after materials rather than structure. A toggle over a single unbroken mesh is a lie the visitor
 * only discovers by clicking, so the page states the number instead.
 *
 * It is a **server** component: the data is a build-time index, there is nothing to interact with, and a
 * client boundary here would cost a kilobyte per model page to render four numbers.
 */

export interface StructurePanelProps {
  catalogue: string;
  slug: string;
  className?: string;
}

export function StructurePanel({ catalogue, slug, className }: StructurePanelProps) {
  const record = getModelStructure(catalogue, slug);
  if (!record) return null;

  return (
    <section className={className}>
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-white/70">This model file</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{describeStructure(record)}</p>
      <p className="mt-2 text-xs text-white/35">
        Measured from the glTF the page is drawing — {record.nodes.toLocaleString("en-GB")} nodes,{" "}
        {record.meshes.toLocaleString("en-GB")} meshes. Walking inside a building needs a file with named
        parts, and this catalogue does not have one; the number is printed rather than a switch that
        would do nothing.
      </p>
    </section>
  );
}
