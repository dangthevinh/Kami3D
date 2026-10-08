import "server-only";

import { createClient } from "@supabase/supabase-js";

import { resolveAdSlots, type AdSlot } from "@/lib/ads";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * The ad switches, read for the page that has a hole for one (Phase 33).
 *
 * Four properties, each of which is a decision:
 *
 *   1. **It never throws and never blocks a page.** No Supabase, no tables (an older deployment), a query
 *      that failed - every one of them ends as "no slots", which is exactly what a deployment without ads
 *      should render. A page must not fail because an advertisement could not be looked up.
 *   2. **It uses the public anonymous key, without cookies.** Reading with `getSupabaseServer()` would
 *      call `cookies()` and turn every page that shows an ad into a dynamic render - the exact cost the
 *      navbar's session hint exists to avoid. The placements are readable by `anon` on purpose.
 *   3. **It is cached in-process for a minute.** The switches are read by an API route the browser calls,
 *      so an admin flipping one sees the change within a minute rather than waiting for a rebuild; the
 *      cache is what stops every page view from being a query.
 *   4. **It says why an enabled switch produced nothing** (`lib/ads.ts` decides), because "on" and
 *      "drawing nothing" at the same time is the confusion this module exists to remove.
 */

export interface AdSlots {
  slots: AdSlot[];
  /** Why an enabled switch produced nothing, for the admin screen. */
  reasons: { id: string; reason: string }[];
  /** False when the switches could not be read at all - an empty list then means "unknown", not "off". */
  checked: boolean;
}

const NONE: AdSlots = { slots: [], reasons: [], checked: false };

const CACHE_MS = 60_000;
let cached: { at: number; value: AdSlots } | null = null;

/** A cookie-less anonymous client: public reads only, and it cannot make a page dynamic. */
function publicClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "kami3d-ads" } },
  });
}

export async function adSlots({ now = Date.now(), fresh = false }: { now?: number; fresh?: boolean } = {}): Promise<AdSlots> {
  if (!fresh && cached && now - cached.at < CACHE_MS) return cached.value;

  let value: AdSlots = NONE;
  try {
    const supabase = publicClient();
    if (supabase) {
      const { data, error } = await supabase.from("ad_placements").select("id, label, enabled, provider, slot_id");
      if (!error && data) {
        value = { ...resolveAdSlots(data, { adsenseClient: publicEnv.adsenseClient || null }), checked: true };
      }
    }
  } catch {
    value = NONE;
  }

  cached = { at: now, value };
  return value;
}

/** Forget the cache. The admin route calls this after a switch is flipped, so the console is never stale. */
export function forgetAdSlots(): void {
  cached = null;
}
