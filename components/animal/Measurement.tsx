"use client";

import * as React from "react";

import { useSettings } from "@/components/settings/SettingsProvider";
import { formatHeight, formatLength, formatWeight, type MeasurementUnit } from "@/lib/utils";

/**
 * Measurements, in the unit the visitor chose in /settings.
 *
 * A leaf client component rather than a client fact sheet: `InfoPanel` and the
 * species pages around it stay server-rendered — and therefore indexable and
 * JavaScript-free — while the three numbers that depend on a preference hydrate
 * into it. The server prints metres, the default, so the HTML a crawler reads and
 * the first client render agree, and an imperial visitor sees their own unit one
 * tick after hydration.
 */

export function useMeasurementUnit(): MeasurementUnit {
  return useSettings().settings.measurementUnit;
}

export function Measurement({ kind, value }: { kind: "length" | "height" | "weight"; value: number }) {
  const unit = useMeasurementUnit();

  if (kind === "weight") return <>{formatWeight(value, unit)}</>;
  if (kind === "height") return <>{formatHeight(value, unit)}</>;
  return <>{formatLength(value, unit)}</>;
}
