"use client";

import * as React from "react";

import { useSettings } from "@/components/settings/SettingsProvider";
import { QUALITY_PROFILES, applyQualityOverrides, qualityFor, readDeviceFacts, type QualityProfile } from "@/lib/quality";

/**
 * The device's quality profile, after the visitor's settings have had their say.
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
 *
 * Phase 11 adds a second input: `/settings` can pin a preset, turn shadows or the
 * mirror floor off, or cap the pixel ratio. The measurement stays the default
 * (`qualityPreset: "auto"`), and `applyQualityOverrides` only lets a setting take
 * quality away — a higher preset is the one way to ask for more than the device
 * reported, and that is a decision rather than a guess.
 */

const DEFAULTS: QualityProfile = { tier: "balanced", ...QUALITY_PROFILES.balanced };

export function useQuality(): QualityProfile {
  const { settings } = useSettings();
  const [measured, setMeasured] = React.useState<QualityProfile>(DEFAULTS);

  React.useEffect(() => {
    const profile = qualityFor(readDeviceFacts());
    setMeasured((current) => (current.tier === profile.tier ? current : profile));
  }, []);

  return React.useMemo(
    () =>
      applyQualityOverrides(measured, {
        preset: settings.qualityPreset,
        shadows: settings.enableShadows,
        reflections: settings.enableReflections,
        maxDpr: settings.maxDpr,
      }),
    [measured, settings.qualityPreset, settings.enableShadows, settings.enableReflections, settings.maxDpr],
  );
}
