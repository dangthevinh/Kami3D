/**
 * The least an object has to be for the 3D viewer to draw it.
 *
 * The viewer was written for animals and reads exactly five things from its subject: an id, a name, a
 * model URL, and the two real-world measurements the ruler prints. Nothing else about an animal
 * reaches the scene, which is why the second catalogue - historic architecture - can use the same
 * viewer, and with it the same rules: the floor anchor, the credit line, the DRACO path, the
 * load watchdog and the retry.
 *
 * `Animal` satisfies this structurally and did not have to change. `Landmark` fills in what it has
 * and leaves the rest at 0, which the viewer reads as "not recorded" rather than as a zero metre
 * building - see `MeasurementOverlay`.
 */
export interface ViewableModel {
  slug: string;
  name: string;
  model_url: string | null;
  /** Metres. 0 means the measurement is not recorded, and no ruler is drawn. */
  height_m: number;
  /** Metres. 0 for anything whose length is not a meaningful figure - a tower, a ruin, a wall. */
  length_m: number;
}
