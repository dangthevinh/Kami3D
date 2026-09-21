#!/usr/bin/env node
/**
 * Generates the Data2Map agriculture sample: `data/data2map-agriculture.json`.
 *
 *   node scripts/generate-agriculture.mjs           # write the file
 *   node scripts/generate-agriculture.mjs --check   # fail if it is out of date (CI)
 *
 * ## The split this file exists to make obvious
 *
 * **The rasters are real.** NASA EOSDIS GIBS serves MODIS NDVI 8-day composites and IMERG
 * precipitation as keyless WMTS tiles, public domain, world-wide - so the two layers the phase brief
 * asked for need no preprocessing pipeline, no storage and no bandwidth budget of our own. What GIBS
 * does *not* serve is numbers: a tile is a rendered picture, and reading per-field values out of one
 * would be guessing at pixels. So per-field numbers stay simulated and labelled.
 *
 * **The parcels are simulated.** Field boundaries are not published openly for Vietnam, and a
 * parcel map is the kind of thing that looks authoritative while being wrong. Every field here is
 * invented, carries `synthetic: true` and a note, and the yield attached to it comes from the
 * demonstration model in `lib/data2map/ndvi.ts` - whose coefficients are printed next to the number
 * in the UI rather than dressed up as a study.
 *
 * The **crop calendar** is a demonstration too: harvesting windows vary by commune and by year, and
 * no standardised open dataset of them exists.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CROP_MODELS, YIELD_COEFFICIENT_SOURCE, estimateYield, meanNdvi } from "../lib/data2map/ndvi.ts";
import { ringAreaKm2 } from "../lib/geo.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "data", "data2map-agriculture.json");

/** The Mekong Delta: the rice bowl, and where an NDVI map has something to say. */
const AREA = { west: 104.8, south: 8.95, east: 106.35, north: 10.85 };
const CENTRE = { lng: 105.6, lat: 9.95 };

/**
 * Provincial centres, with an approximate envelope drawn around each.
 *
 * The envelope is a **circle around the centre, not the province**: administrative boundaries are
 * published as decisions and drawings, and inventing a polygon that looks official is exactly the
 * mistake this module refuses. The point of the envelope on this page is to group the sample, and
 * the panel says so.
 */
const PROVINCES = [
  { id: "can-tho", name: "Cần Thơ", lng: 105.78, lat: 10.03, radiusKm: 30, share: 0.14 },
  { id: "an-giang", name: "An Giang", lng: 105.13, lat: 10.53, radiusKm: 34, share: 0.22 },
  { id: "dong-thap", name: "Đồng Tháp", lng: 105.63, lat: 10.45, radiusKm: 30, share: 0.19 },
  { id: "kien-giang", name: "Kiên Giang", lng: 105.08, lat: 9.95, radiusKm: 32, share: 0.21 },
  { id: "soc-trang", name: "Sóc Trăng", lng: 105.97, lat: 9.6, radiusKm: 28, share: 0.13 },
  { id: "bac-lieu", name: "Bạc Liêu", lng: 105.72, lat: 9.29, radiusKm: 26, share: 0.11 },
];

/**
 * The 8-day composite dates the page steps through.
 *
 * These are the dates NASA GIBS actually publishes for `MODIS_Terra_NDVI_8Day` (its time dimension
 * runs from February 2025 into September 2025 in eight-day steps). The page builds its tile URLs
 * from this list, so a period that does not exist upstream cannot be selected.
 */
function seasonDates() {
  const dates = [];
  const start = Date.UTC(2025, 1, 12);
  const end = Date.UTC(2025, 8, 16);

  for (let time = start; time <= end; time += 8 * 24 * 3600 * 1000) {
    const date = new Date(time);
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
}

const FIELDS = 140;
const SOURCE = "Kami3D synthetic";
const FIELD_NOTE =
  "Simulated parcel. Field boundaries are not published openly for Vietnam, and this one is invented - the real layer on this page is the raster behind it.";
const PROVINCE_NOTE =
  "Approximate envelope drawn around the provincial centre for grouping, not an administrative boundary.";
const CALENDAR_NOTE =
  "Demonstration harvest calendar. Real harvesting windows vary by commune and by year, and no standardised open dataset of them exists.";

/** Deterministic noise, so regenerating the file is a no-op in git. */
function noise(seed, index) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function seedFrom(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 1000);
}

const round = (value, places = 5) => Number(value.toFixed(places));

/**
 * A crop cycle as NDVI would see it: a floor at sowing, a rise, a peak, then a fall at harvest.
 *
 * Two of the periods are left `null` on purpose - a cloud gap over the Delta is the normal case, and
 * the page is built to show the gap rather than to interpolate over it.
 */
function ndviSeries(crop, seed, dates) {
  const peak = crop === "rice" ? 0.78 : crop === "vegetables" ? 0.72 : 0.82;
  const floor = crop === "rice" ? 0.24 : crop === "vegetables" ? 0.3 : 0.55;
  const cycle = crop === "rice" ? 0.55 : crop === "vegetables" ? 0.85 : 0.35;
  const start = noise(seed, 1) * 0.35;

  const series = dates.map((_, index) => {
    const phase = Math.min(1, Math.max(0, (index / (dates.length - 1) - start) / cycle));
    const shape = Math.sin(Math.PI * Math.min(1, phase)) ** 0.8;
    const value = floor + (peak - floor) * shape + (noise(seed, index + 2) - 0.5) * 0.05;
    return Math.round(Math.min(0.97, Math.max(0.05, value)) * 1000) / 1000;
  });

  const gapOne = 3 + Math.floor(noise(seed, 40) * (dates.length - 8));
  const gapTwo = 3 + Math.floor(noise(seed, 41) * (dates.length - 8));
  series[gapOne] = null;
  series[gapTwo] = null;

  return series;
}

/** An irregular quadrilateral, rotated by a deterministic angle - a field, not a rectangle. */
function parcelRing(centre, sideKm, angle, seed) {
  const degLat = sideKm / 110.574;
  const degLng = sideKm / (111.32 * Math.cos((centre.lat * Math.PI) / 180));
  const corners = [
    [-0.5, -0.5],
    [0.5, -0.55],
    [0.55, 0.5],
    [-0.45, 0.55],
  ];

  const ring = corners.map(([x, y], index) => {
    const wobble = 0.85 + noise(seed, index) * 0.3;
    const px = x * degLng * wobble;
    const py = y * degLat * wobble;
    const lng = centre.lng + px * Math.cos(angle) - py * Math.sin(angle);
    const lat = centre.lat + px * Math.sin(angle) * 0.6 + py * Math.cos(angle);
    return [round(lng), round(lat)];
  });

  ring.push([ring[0][0], ring[0][1]]);
  return ring;
}

export function buildSample() {
  const dates = seasonDates();
  const features = [];

  for (const province of PROVINCES) {
    features.push({
      type: "Feature",
      properties: {
        layer: "province",
        province_id: province.id,
        name: province.name,
        centre_lng: province.lng,
        centre_lat: province.lat,
        envelope_radius_km: province.radiusKm,
        supply_share: province.share,
        harvest_from: 1,
        harvest_to: 12,
        source: SOURCE,
        license: "CC0",
        synthetic: true,
        note: PROVINCE_NOTE + " " + CALENDAR_NOTE,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          Array.from({ length: 49 }, (_, index) => {
            const angle = (index / 48) * Math.PI * 2;
            const lng = province.lng + (Math.cos(angle) * province.radiusKm) / (111.32 * Math.cos((province.lat * Math.PI) / 180));
            const lat = province.lat + (Math.sin(angle) * province.radiusKm) / 110.574;
            return [round(lng), round(lat)];
          }),
        ],
      },
    });
  }

  for (let index = 0; index < FIELDS; index += 1) {
    const id = "field-" + String(index + 1).padStart(3, "0");
    const seed = seedFrom(id);
    const province = PROVINCES[seed % PROVINCES.length];
    const crop = CROP_MODELS[seed % CROP_MODELS.length];

    const angle = noise(seed, 1) * Math.PI * 2;
    const km = 2 + noise(seed, 2) * (province.radiusKm - 4);
    const centre = {
      lng: province.lng + (Math.cos(angle) * km) / (111.32 * Math.cos((province.lat * Math.PI) / 180)),
      lat: province.lat + (Math.sin(angle) * km) / 110.574,
    };

    const sideKm = 0.4 + noise(seed, 3) * 1.4;
    const ring = parcelRing(centre, sideKm, noise(seed, 4) * Math.PI, seed);
    const areaHa = Math.round(ringAreaKm2(ring) * 100 * 100) / 100;
    const series = ndviSeries(crop.id, seed, dates);
    const seasonMean = meanNdvi(series);
    const estimate = estimateYield({ crop: crop.id, meanNdvi: seasonMean, areaHa });

    features.push({
      type: "Feature",
      properties: {
        layer: "field",
        field_id: id,
        province_id: province.id,
        crop: crop.id,
        crop_label: crop.label,
        area_ha: areaHa,
        sowing_month: 1 + Math.floor(noise(seed, 5) * 12),
        ndvi_series: series,
        ndvi_mean: seasonMean,
        yield_t_per_ha: estimate ? estimate.tonnesPerHa : null,
        yield_tonnes: estimate ? estimate.tonnes : null,
        yield_source: YIELD_COEFFICIENT_SOURCE,
        source: SOURCE,
        license: "CC0",
        synthetic: true,
        note: FIELD_NOTE,
      },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }

  return {
    type: "FeatureCollection",
    properties: {
      area: AREA,
      centre: CENTRE,
      note:
        "Simulated parcels and a demonstration crop calendar for the Mekong Delta. The NDVI and rainfall rasters drawn over them are real: NASA EOSDIS GIBS, public domain, no key.",
      attribution:
        "Crop health and rainfall imagery: NASA EOSDIS GIBS (MODIS Terra NDVI 8-day, IMERG precipitation — public domain). Parcels, calendar and yield model: Kami3D (CC0).",
      periods: dates.map((date) => ({
        date,
        label: new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
      })),
      crops: CROP_MODELS.map((model) => ({
        id: model.id,
        label: model.label,
        harvestMonths: model.harvestMonths,
        baseYieldTPerHa: model.baseYieldTPerHa,
        coefficientSource: YIELD_COEFFICIENT_SOURCE,
      })),
      rasterSources: {
        ndvi: {
          layer: "MODIS_Terra_NDVI_8Day",
          source: "NASA EOSDIS GIBS",
          license: "Public domain",
          resolution: "250 m, 8-day composite",
          url: "https://gibs.earthdata.nasa.gov",
          palette: "https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml",
        },
        rain: {
          layer: "IMERG_Precipitation_Rate",
          source: "NASA EOSDIS GIBS (GPM IMERG)",
          license: "Public domain",
          resolution: "0.1 degree, 30-minute product",
          url: "https://gibs.earthdata.nasa.gov",
        },
      },
      counts: { provinces: PROVINCES.length, fields: FIELDS, periods: dates.length },
    },
    features,
  };
}

const check = process.argv.includes("--check");
const collection = buildSample();
const json = JSON.stringify(collection) + "\n";

if (check) {
  const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, "utf8") : "";
  if (current !== json) {
    console.error("data/data2map-agriculture.json is out of date - run npm run agri:generate");
    process.exitCode = 1;
  } else {
    console.log(collection.features.length + " feature(s), up to date");
  }
} else {
  writeFileSync(OUT_FILE, json);
  console.log("Wrote " + collection.features.length + " feature(s) to " + OUT_FILE.replace(ROOT + "/", ""));
  console.log("Season: " + collection.properties.periods.length + " periods from " + collection.properties.periods[0].date + " to " + collection.properties.periods[collection.properties.periods.length - 1].date);
}
