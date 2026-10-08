/**
 * Where an advertisement may appear, and when it may not (Phase 33).
 *
 * The list of positions is **code**, because a page can only render an ad where it has a hole for one:
 * a row in `public.ad_placements` for a position this file does not know is ignored rather than injected
 * somewhere unexpected. The row is the **switch** an admin flips; this is the shape of the hole.
 *
 * Three rules are enforced here rather than in a comment:
 *
 *   1. **Nothing renders unless an admin enabled it.** Every placement defaults to `enabled = false`, so
 *      a fresh deployment looks exactly like it did before this phase.
 *   2. **The 3D viewer is never covered.** No position sits over a canvas; `in-list` is drawn *between*
 *      rows of a grid, never on top of one. The check suite asserts that nothing under `components/3d`
 *      imports an ad component, which is the mechanical half of that rule.
 *   3. **A provider that is not wired up is not pretended.** AdSense renders only with a client id;
 *      `ezoic` is accepted by the schema and **refused** by this function, with a sentence saying so,
 *      because this build contains no Ezoic integration and a placeholder labelled Ezoic would be a lie.
 */

export const AD_PLACEMENTS = [
  {
    id: "sidebar",
    label: "Sidebar",
    /** Where the page draws it, in one sentence, for the admin screen. */
    where: "Beside the content column on wide screens. Hidden below 1024px, where there is no sidebar.",
  },
  {
    id: "below-content",
    label: "Below content",
    where: "After the article body and before the footer: out of the way of everything interactive.",
  },
  {
    id: "in-list",
    label: "Between list items",
    where: "In the flow of a grid, after the first row. It takes a slot a card would have taken.",
  },
] as const;

export type AdPlacementId = (typeof AD_PLACEMENTS)[number]["id"];

export const AD_PROVIDERS = ["placeholder", "adsense", "ezoic"] as const;
export type AdProvider = (typeof AD_PROVIDERS)[number];

/** One row of `public.ad_placements`, as the page reads it. */
export interface AdPlacementRow {
  id: string;
  label?: string | null;
  enabled: boolean;
  provider: string | null;
  slot_id?: string | null;
}

export interface AdSlot {
  id: AdPlacementId;
  label: string;
  provider: "placeholder" | "adsense";
  /** The AdSense ad unit id. Null for a placeholder, which has no unit. */
  slotId: string | null;
  /** The AdSense client, from the environment. Null for a placeholder. */
  client: string | null;
}

export function isAdPlacementId(value: string): value is AdPlacementId {
  return AD_PLACEMENTS.some((placement) => placement.id === value);
}

/**
 * The placements a page should draw right now.
 *
 * `reasons` carries the sentence for every switch that is on but cannot be honoured - an admin who
 * enabled AdSense without a client id, or chose Ezoic - so the console can print it instead of leaving
 * somebody to wonder why the hole is empty.
 */
export function resolveAdSlots(
  rows: AdPlacementRow[],
  { adsenseClient }: { adsenseClient: string | null },
): { slots: AdSlot[]; reasons: { id: string; reason: string }[] } {
  const slots: AdSlot[] = [];
  const reasons: { id: string; reason: string }[] = [];

  for (const row of rows) {
    if (!row.enabled) continue;

    if (!isAdPlacementId(row.id)) {
      reasons.push({ id: row.id, reason: "This build has no place to render a position called " + row.id + ", so it is ignored." });
      continue;
    }

    const placement = AD_PLACEMENTS.find((entry) => entry.id === row.id);
    const provider = (row.provider ?? "placeholder") as AdProvider;

    if (provider === "ezoic") {
      reasons.push({ id: row.id, reason: "Ezoic is not wired up in this build, so nothing is drawn rather than a placeholder pretending to be one." });
      continue;
    }

    if (provider === "adsense") {
      const client = (adsenseClient ?? "").trim();
      if (client.length === 0) {
        reasons.push({ id: row.id, reason: "AdSense is enabled but NEXT_PUBLIC_ADSENSE_CLIENT is not set, and an ad unit cannot be rendered without it." });
        continue;
      }
      const slotId = (row.slot_id ?? "").trim();
      if (slotId.length === 0) {
        reasons.push({ id: row.id, reason: "AdSense is enabled but this position has no ad unit id (slot_id)." });
        continue;
      }
      slots.push({ id: row.id, label: placement?.label ?? row.id, provider: "adsense", slotId, client });
      continue;
    }

    slots.push({ id: row.id, label: placement?.label ?? row.id, provider: "placeholder", slotId: null, client: null });
  }

  return { slots, reasons };
}

export function adSlotFor(slots: AdSlot[], id: AdPlacementId): AdSlot | null {
  return slots.find((slot) => slot.id === id) ?? null;
}

/** The switch an admin flips, as a value the API validates before it writes. */
export function placementPatch(body: Record<string, unknown>): { id: string; enabled: boolean; provider: AdProvider; slotId: string | null } | string {
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!isAdPlacementId(id)) return "Unknown position: " + (id || "(none)") + ".";

  if (typeof body.enabled !== "boolean") return "enabled must be true or false.";

  const provider = typeof body.provider === "string" ? (body.provider.trim() as AdProvider) : "placeholder";
  if (!(AD_PROVIDERS as readonly string[]).includes(provider)) {
    return "Unknown provider: " + provider + ". This build supports " + AD_PROVIDERS.join(", ") + ".";
  }

  const slotId = typeof body.slotId === "string" && body.slotId.trim().length > 0 ? body.slotId.trim() : null;
  return { id, enabled: body.enabled, provider, slotId };
}
