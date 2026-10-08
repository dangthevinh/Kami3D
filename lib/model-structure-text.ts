/**
 * What is really inside a shipped model file - the shape, and the sentence a page prints about it.
 *
 * Split from `lib/model-structure.ts` for the same reason `lib/catalog-project.ts` is split from
 * `lib/catalog.ts`: this half has **no imports at all**, so a check suite can test the sentence without
 * a bundler, and the half that reads the JSON index is left where `@/` resolves.
 *
 * Phase 29 asks a building viewer for three things - walk inside, toggle floors, toggle furniture - and
 * all three need the asset's parts to exist as separate, **named** things. The measurement, over all 166
 * shipped models: **112 have no named part at all**, and the ones that do are named after their material
 * ("Material2", "Model_material1_0") rather than their structure. There is no "Floor_1" and no "Chair"
 * anywhere in the catalogue.
 */

export interface ModelStructure {
  nodes: number;
  meshes: number;
  namedParts: number;
  examples: string[];
}

/**
 * The sentence a model page prints, and the reason it is a sentence rather than a control.
 *
 * A file with named parts could grow toggles later - the panel would list them. None of this catalogue's
 * files have them, and saying so is the whole point: the alternative is a switch labelled "Floors" over
 * a model that is one mesh, which is a lie a visitor only discovers by clicking it.
 */
export function describeStructure(record: ModelStructure): string {
  if (record.namedParts === 0) {
    return `This file is one unbroken mesh: ${record.meshes} mesh${record.meshes === 1 ? "" : "es"} in ${record.nodes} node${record.nodes === 1 ? "" : "s"}, none of them named. There are no floors or furniture in it to switch on and off.`;
  }
  if (record.namedParts < 3) {
    return `${record.namedParts} named part in ${record.meshes} mesh${record.meshes === 1 ? "" : "es"} - enough to name it, not enough to separate a building into floors.`;
  }
  return `${record.namedParts} named parts across ${record.meshes} meshes: ${record.examples.join(", ")}.`;
}
