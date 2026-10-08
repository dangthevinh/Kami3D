/**
 * Assertions for ads and locked content (Phase 33), driven wherever a pure function exists.
 *
 * The three questions this file answers, in order of how much they matter:
 *
 *   1. **Can an advertisement cover the 3D viewer?** No position sits over a canvas, and the check below
 *      is mechanical: nothing under `components/3d` may import an ad component. A rule about layout that
 *      lives only in a comment is a rule that a later refactor deletes.
 *   2. **Can a visitor unlock something they did not pay for?** The `user_unlocks` policy permits
 *      `method = 'ad'` and nothing else, and the route that writes it is asserted to check the advert
 *      actually ran.
 *   3. **Is anything locked by default?** No: every placement is `enabled = false` and the lock table
 *      starts empty, which is asserted against the SQL rather than trusted.
 *
 * Run with: npm run check:unlock
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { AD_PLACEMENTS, placementPatch, resolveAdSlots } from "../lib/ads.ts";
import {
  catalogContentId,
  clampAdSeconds,
  contentIdFor,
  lockedContentPatch,
  parseContentId,
  rewardedAdVerdict,
  unlockState,
} from "../lib/unlock.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const schema = read("supabase/schema.sql");

const CONTENT = {
  content_id: "model:tyrannosaurus-rex",
  label: "Tyrannosaurus rex",
  kind: "model",
  unlock_methods: ["ad", "purchase"],
  purchase_plan: "unlock-extinct-models",
  ad_seconds: 15,
  active: true,
};

test("nothing is drawn unless a switch is on, and a switch that cannot be honoured says why", () => {
  assert.deepEqual(resolveAdSlots([], { adsenseClient: null }), { slots: [], reasons: [] });

  const off = resolveAdSlots([{ id: "sidebar", enabled: false, provider: "placeholder" }], { adsenseClient: null });
  assert.deepEqual(off.slots, [], "an off switch draws nothing, not an empty frame");

  const on = resolveAdSlots([{ id: "sidebar", enabled: true, provider: "placeholder" }], { adsenseClient: null });
  assert.equal(on.slots.length, 1);
  assert.equal(on.slots[0].provider, "placeholder");
  assert.equal(on.slots[0].slotId, null, "a placeholder has no ad unit");

  // AdSense without the two things an ad unit needs is a hole with an explanation, not a silent nothing.
  const noClient = resolveAdSlots([{ id: "in-list", enabled: true, provider: "adsense", slot_id: "123" }], { adsenseClient: null });
  assert.deepEqual(noClient.slots, []);
  assert.match(noClient.reasons[0].reason, /NEXT_PUBLIC_ADSENSE_CLIENT/);

  const noSlot = resolveAdSlots([{ id: "in-list", enabled: true, provider: "adsense", slot_id: "" }], { adsenseClient: "ca-pub-1" });
  assert.deepEqual(noSlot.slots, []);
  assert.match(noSlot.reasons[0].reason, /slot_id/);

  const adsense = resolveAdSlots([{ id: "in-list", enabled: true, provider: "adsense", slot_id: "987" }], { adsenseClient: "ca-pub-1" });
  assert.equal(adsense.slots[0].provider, "adsense");
  assert.equal(adsense.slots[0].slotId, "987");

  // Ezoic is accepted by the schema and refused here: this build has no integration, and a placeholder
  // wearing another network's name would be a lie.
  const ezoic = resolveAdSlots([{ id: "sidebar", enabled: true, provider: "ezoic" }], { adsenseClient: "ca-pub-1" });
  assert.deepEqual(ezoic.slots, []);
  assert.match(ezoic.reasons[0].reason, /not wired up/);

  const unknown = resolveAdSlots([{ id: "footer-banner", enabled: true, provider: "placeholder" }], { adsenseClient: null });
  assert.deepEqual(unknown.slots, [], "a position this build has no place for is ignored, not placed somewhere");
  assert.match(unknown.reasons[0].reason, /no place to render/);
});

test("the placement the admin picks is validated, not trusted", () => {
  assert.equal(placementPatch({ id: "nope", enabled: true }), "Unknown position: nope.");
  assert.equal(placementPatch({ id: "sidebar", enabled: "yes" }), "enabled must be true or false.");
  assert.match(String(placementPatch({ id: "sidebar", enabled: true, provider: "doubleclick" })), /Unknown provider/);

  assert.deepEqual(placementPatch({ id: "sidebar", enabled: true, provider: "adsense", slotId: " 42 " }), {
    id: "sidebar",
    enabled: true,
    provider: "adsense",
    slotId: "42",
  });
  assert.deepEqual(placementPatch({ id: "in-list", enabled: false }), {
    id: "in-list",
    enabled: false,
    provider: "placeholder",
    slotId: null,
  });

  // Every position the catalogue declares is one the pages actually have a hole for.
  assert.deepEqual(AD_PLACEMENTS.map((placement) => placement.id), ["sidebar", "below-content", "in-list"]);
  for (const placement of AD_PLACEMENTS) assert.ok(placement.where.length > 20, placement.id + " must say where it goes");
});

test("a lock has two ways out, and neither is offered when it cannot work", () => {
  assert.equal(contentIdFor("model", "tyrannosaurus-rex"), "model:tyrannosaurus-rex");
  assert.equal(catalogContentId("space", "uranus"), "catalog-entry:space/uranus");
  assert.deepEqual(parseContentId("chapter:abc-123"), { kind: "chapter", id: "abc-123" });
  assert.equal(parseContentId("model"), null);
  assert.equal(parseContentId("spaceship:x"), null, "an unknown kind is not a content key");
  assert.equal(parseContentId("model:"), null);

  const none = unlockState({ content: null, unlocks: [], entitlements: [], signedIn: false, checkoutConfigured: false });
  assert.equal(none.locked, false, "an empty lock table is the default state of the whole site");

  const inactive = unlockState({
    content: { ...CONTENT, active: false },
    unlocks: [],
    entitlements: [],
    signedIn: true,
    checkoutConfigured: true,
  });
  assert.equal(inactive.locked, false, "deactivating a lock makes content public again without deleting the row");

  // Signed in, both ways out available.
  const locked = unlockState({ content: CONTENT, unlocks: [], entitlements: [], signedIn: true, checkoutConfigured: true });
  assert.equal(locked.locked, true);
  assert.deepEqual(locked.methods, ["ad", "purchase"]);
  assert.equal(locked.adSeconds, 15);
  assert.equal(locked.purchasePlan, "unlock-extinct-models");

  // A guest cannot record anything: an unlock belongs to an account.
  const guest = unlockState({ content: CONTENT, unlocks: [], entitlements: [], signedIn: false, checkoutConfigured: true });
  assert.equal(guest.locked, true);
  assert.deepEqual(guest.methods, []);
  assert.equal(guest.needsSignIn, true);
  assert.equal(guest.purchasePlan, null, "no plan is offered to somebody who cannot buy it yet");

  // Signed in, but the deployment sells nothing: only the advert remains.
  const noCheckout = unlockState({ content: CONTENT, unlocks: [], entitlements: [], signedIn: true, checkoutConfigured: false });
  assert.deepEqual(noCheckout.methods, ["ad"]);

  // Buying is not offered when the row names no plan - a button that cannot work is worse than no button.
  const noPlan = unlockState({
    content: { ...CONTENT, purchase_plan: null },
    unlocks: [],
    entitlements: [],
    signedIn: true,
    checkoutConfigured: true,
  });
  assert.deepEqual(noPlan.methods, ["ad"]);

  // An unlock row is the proof, by either method.
  const byAd = unlockState({
    content: CONTENT,
    unlocks: [{ content_id: CONTENT.content_id, method: "ad", unlocked_at: "2026-01-01T00:00:00.000Z" }],
    entitlements: [],
    signedIn: true,
    checkoutConfigured: true,
  });
  assert.equal(byAd.locked, false);
  assert.equal(byAd.unlockedBy, "ad");

  // A purchase unlocks through the entitlement Phase 32 stored, not through a second record.
  const byPurchase = unlockState({
    content: CONTENT,
    unlocks: [],
    entitlements: ["unlock:extinct-models"],
    signedIn: true,
    checkoutConfigured: false,
  });
  assert.equal(byPurchase.locked, false);
  assert.equal(byPurchase.unlockedBy, "purchase");

  // ...and a refunded purchase stops unlocking it, because the entitlement is gone.
  const refunded = unlockState({ content: CONTENT, unlocks: [], entitlements: [], signedIn: true, checkoutConfigured: true });
  assert.equal(refunded.locked, true);

  // A locked door with no key at all: the row lists a method this deployment cannot offer.
  const adOnly = unlockState({
    content: { ...CONTENT, unlock_methods: ["ad"] },
    unlocks: [],
    entitlements: [],
    signedIn: true,
    checkoutConfigured: true,
  });
  assert.deepEqual(adOnly.methods, ["ad"]);

  assert.equal(clampAdSeconds(0), 5);
  assert.equal(clampAdSeconds(999), 120);
  assert.equal(clampAdSeconds(Number.NaN), 15);
  assert.equal(clampAdSeconds(14.6), 15);
});

test("the rewarded advert is a mock, and the check says so", () => {
  const start = 1_000_000;
  assert.deepEqual(rewardedAdVerdict({ startedAtMs: start, nowMs: start + 14_000, seconds: 15 }), {
    earned: false,
    elapsedMs: 14_000,
    requiredMs: 15_000,
  });
  assert.equal(rewardedAdVerdict({ startedAtMs: start, nowMs: start + 15_000, seconds: 15 }).earned, true);
  assert.equal(rewardedAdVerdict({ startedAtMs: start + 5_000, nowMs: start, seconds: 15 }).elapsedMs, 0, "a future start is not negative time");
  assert.equal(rewardedAdVerdict({ startedAtMs: start, nowMs: start + 3_000, seconds: 1 }).requiredMs, 5_000, "the clamp applies here too");

  const route = read("app/api/unlock/route.ts");
  assert.match(route, /rewardedAdVerdict\(/, "the advert is checked before the unlock is written");
  assert.ok(
    route.indexOf("rewardedAdVerdict(") < route.indexOf("recordAdUnlock("),
    "and before anything is written",
  );
  assert.match(route, /guardWrite\(request, \{/, "the write goes through the shared guard");
  assert.match(read("lib/unlock.ts"), /a client that lies can therefore earn\s*\n \* an unlock for free/i, "the mock says what it is");
  assert.match(read("components/unlock/UnlockPanel.tsx"), /no network is contacted|placeholder advert/i, "and so does the UI");
});

test("an admin cannot lock a door with no key, and the payload is validated", () => {
  const valid = lockedContentPatch({
    contentId: "model:tyrannosaurus-rex",
    label: "Tyrannosaurus rex",
    kind: "model",
    methods: ["ad", "purchase"],
    purchasePlan: "unlock-extinct-models",
    adSeconds: 30,
  });
  assert.ok(typeof valid === "object");
  assert.deepEqual(valid.methods, ["ad", "purchase"]);
  assert.equal(valid.adSeconds, 30);
  assert.equal(valid.active, true, "a new lock is active unless the caller says otherwise");

  assert.match(String(lockedContentPatch({ contentId: "tyrannosaurus", label: "x", methods: ["ad"] })), /contentId must look like/);
  assert.match(String(lockedContentPatch({ contentId: "model:x", label: "", methods: ["ad"] })), /label must be/);
  assert.match(String(lockedContentPatch({ contentId: "model:x", label: "x", methods: [] })), /needs a key/);
  assert.match(String(lockedContentPatch({ contentId: "model:x", label: "x", methods: ["bribe"] })), /may only contain/);
  assert.match(
    String(lockedContentPatch({ contentId: "model:x", label: "x", methods: ["purchase"] })),
    /must name the plan/,
  );
  assert.match(
    String(lockedContentPatch({ contentId: "model:x", label: "x", methods: ["purchase"], purchasePlan: "free-lunch" })),
    /no plan called/,
  );

  const clamped = lockedContentPatch({ contentId: "model:x", label: "x", methods: ["ad"], adSeconds: 9999 });
  assert.ok(typeof clamped === "object");
  assert.equal(clamped.adSeconds, 120);
});

test("the tables start empty, off, and closed to a browser", () => {
  for (const table of ["ad_placements", "locked_contents", "user_unlocks"]) {
    assert.ok(new RegExp("create table if not exists public\\." + table).test(schema), table + " is missing");
    assert.ok(new RegExp("alter table public\\." + table + "\\s+enable row level security").test(schema), table + " has RLS off");
  }

  // Every placement the catalogue declares is seeded, and every one of them is off.
  assert.match(schema, /insert into public\.ad_placements[\s\S]{0,600}?on conflict \(id\) do nothing/);
  const seeded = [...schema.matchAll(/\('([a-z-]+)', '[^']+', (true|false), 'placeholder'/g)].map((match) => [match[1], match[2]]);
  assert.equal(seeded.length, 3, "three positions are seeded, saw " + seeded.length);
  assert.ok(seeded.every(([, enabled]) => enabled === "false"), "no advertisement is on by default");

  // The narrowing that matters: a browser may write an ad unlock and nothing else.
  assert.match(
    schema,
    /create policy "a member records their own ad unlock"[\s\S]{0,200}?with check \(user_id = public\.current_user_id\(\) and method = 'ad'\)/,
    "the insert policy must pin the method, or a client could claim it paid",
  );
  assert.ok(
    !/on public\.user_unlocks for (update|delete)/.test(schema),
    "an unlock is not editable or removable from a browser",
  );
  assert.match(schema, /revoke all on public\.user_unlocks from anon, authenticated/);
  assert.ok(!/grant [^;]*on public\.user_unlocks to anon/.test(schema), "anon holds nothing on the unlocks");

  // The admin policies are the admin check, not a blanket true.
  assert.match(schema, /create policy "only an admin changes an ad placement"[\s\S]{0,180}?using \(public\.is_admin\(\)\)/);
  assert.match(schema, /create policy "only an admin marks content as locked"[\s\S]{0,180}?using \(public\.is_admin\(\)\)/);
  assert.match(schema, /create policy "ad placements are publicly readable"[\s\S]{0,160}?to anon, authenticated/);
});

test("an advertisement cannot be placed over the 3D viewer, and the island never blocks a page", () => {
  // Mechanical, so a later layout change cannot quietly break it.
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry)) {
        const source = readFileSync(path, "utf8");
        if (/components\/ads\//.test(source)) offenders.push(path.slice(root.length + 1));
      }
    }
  };
  walk(join(root, "components", "3d"));
  assert.deepEqual(offenders, [], "nothing under components/3d may render an advertisement");

  const banner = read("components/ads/AdBanner.tsx");
  assert.match(banner, /if \(!slot\) return null;/, "an off switch renders nothing at all");
  assert.match(banner, /useEffect/, "and the advert is fetched after the page is interactive, never during it");

  const slots = read("app/api/ads/slots/route.ts");
  assert.match(slots, /export const revalidate = 60/, "the answer is cacheable: it is the same for everybody");
  assert.ok(!/cookies|auth/i.test(slots), "and it reads no session, so no page becomes dynamic because of an advert");

  // The gate renders a placeholder while it checks, never the content.
  const gate = read("components/unlock/UnlockGate.tsx");
  assert.match(gate, /if \(!checked\)/, "the content is not shown until the answer arrives");
  assert.ok(
    gate.indexOf("state?.locked") < gate.indexOf("return <>{children}</>"),
    "a locked answer must be handled before the children are rendered",
  );
});
