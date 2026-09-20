"use client";

import * as React from "react";

import { QUALITY_PROFILES, qualityFor, readDeviceFacts, type QualityProfile } from "@/lib/quality";

/**
 * The device's quality profile.
 *
 * Two-phase on purpose. The first render — which the server also performs, because
 * a client component inside a statically rendered page is still server-rendered —
 * uses the middle profile, so the HTML is valid and hydration matches. The real
 * facts are read in an effect, once there is a browser to read them from.
 *
 * Reading them during render instead is what this replaces: on the server
 * `navigator` is Node's, so the page shipped attributes describing the build
 * machine's hardware (8 cores, no `deviceMemory`) and hydration then disagreed
 * with them. The profile only ever moves once, immediately after mount, before a
 * visitor could notice a canvas change its resolution.
 */

const DEFAULTS: QualityProfile = { tier: "balanced", ...QUALITY_PROFILES.balanced };

export function useQuality(): QualityProfile {
  const [profile, setProfile] = React.useState<QualityProfile>(DEFAULTS);

  React.useEffect(() => {
    const measured = qualityFor(readDeviceFacts());
    setProfile((current) => (current.tier === measured.tier ? current : measured));
  }, []);

  return profile;
}
