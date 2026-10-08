#!/usr/bin/env node
/**
 * Grow a catalogue by harvesting entries from a model source and a fact source - automatically.
 *
 *   node scripts/harvest-catalogue-entries.mjs --catalogue=space --limit=100
 *   node scripts/harvest-catalogue-entries.mjs --catalogue=plants --limit=100 --apply
 *
 * Hand-writing an entry is a research task: the landmark batches took about 25 minutes per entry, which
 * is the right price for fifteen monuments and the wrong price for a hundred. So the work is split the
 * way this project splits everything else:
 *
 *   **the subject list comes from a model source** - NASA's public-domain repository for space, a
 *   Sketchfab search for the rest. A subject with no licence-clean model is a subject this site cannot
 *   show, and there is no point writing its data first.
 *
 *   **the facts come from Wikipedia, named as the source in every entry.** This is the standard the
 *   landmark catalogue was written to ("checked against the English Wikipedia article text and
 *   infobox"), applied at scale: the description is the article's own lead sentences, and each fact is
 *   a sentence of it that carries a figure. Nothing is paraphrased into a number nobody wrote, and
 *   every entry records which article the figures came from.
 *
 *   **the model is downloaded by the pipeline that already exists** (`fetch-catalog-models.mjs`), with
 *   its licence, title, colour, polygon and weight gates unchanged. This script only writes data; it
 *   never decides what may ship.
 *
 * Anyone can re-run it and get the same entries, which is the point: a catalogue this size has to be
 * reproducible rather than remembered.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PLACEHOLDER_WORDS } from "../lib/model-quality.ts";
import { fetchWithRetry } from "../lib/net-retry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const flags = process.argv.slice(2);
const APPLY = flags.includes("--apply");
const catalogueId = flags.find((arg) => arg.startsWith("--catalogue="))?.slice("--catalogue=".length) ?? "space";
const limit = Number(flags.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length) ?? 100);

/** Where each catalogue's subjects come from, and the queries its models are found by. */
const SOURCES = {
  space: {
    module: "../data/space.ts",
    exported: "SPACE_ENTRIES",
    dataFile: "data/space.ts",
    queriesFile: "data/space-queries.json",
    // Both sources: NASA's repository is public domain and authoritative for spacecraft, and Sketchfab
    // carries the planets, moons and nebulae NASA's repository does not model at all.
    kind: "both",
    fallbackQueries: [
      "planet Mercury", "planet Venus", "planet Earth", "planet Mars", "planet Jupiter", "planet Saturn",
      "planet Uranus", "planet Neptune", "dwarf planet Pluto", "asteroid Ceres", "moon Europa",
      "moon Titan", "moon Enceladus", "moon Ganymede", "moon Callisto", "moon Io", "moon Phobos",
      "comet Halley", "asteroid Bennu", "meteorite", "nebula", "galaxy", "black hole", "supernova remnant",
      "space station", "space telescope", "communications satellite", "weather satellite", "GPS satellite",
      "rocket engine", "rocket launch vehicle", "lunar lander", "Mars rover", "space probe", "space suit",
      "solar panel spacecraft", "docking port", "space capsule", "space shuttle orbiter", "cargo spacecraft",
      // Second pass, added when the first forty ran out: the catalogue reached 131 entries and the
      // subjects left were the smaller machines and the far side of the solar system.
      "lunar module", "command module", "service module", "space tug", "sounding rocket",
      "geostationary satellite", "spy satellite", "cube satellite", "space telescope mirror",
      "radio telescope dish", "solar observatory", "gravitational wave observatory",
      "lunar rover", "planetary rover", "sample return capsule", "ion thruster", "solar sail",
      "space elevator", "orbital habitat", "space hotel", "lunar base", "mars habitat",
      "asteroid mining", "comet nucleus", "kuiper belt object", "oort cloud", "interstellar probe",
      "neutron star", "pulsar", "quasar", "star cluster", "globular cluster", "open cluster",
      "planetary nebula", "emission nebula", "reflection nebula", "dark nebula", "molecular cloud",
      "spiral galaxy", "elliptical galaxy", "irregular galaxy", "galaxy cluster", "cosmic microwave background",
      "mars helicopter", "venus lander", "jupiter orbiter", "saturn orbiter", "uranus probe", "neptune probe",
    ],
  },
  plants: {
    module: "../data/plants.ts",
    exported: "PLANT_ENTRIES",
    dataFile: "data/plants.ts",
    queriesFile: "data/plants-queries.json",
    kind: "sketchfab",
    fallbackQueries: [
      "pine tree", "maple tree", "birch tree", "willow tree", "cherry blossom tree", "olive tree",
      "fig tree", "palm tree", "cactus plant", "fern plant", "moss plant", "aloe vera plant",
      "rose flower", "tulip flower", "daisy flower", "lily flower", "hibiscus flower", "jasmine flower",
      "corn plant", "rice plant", "potato plant", "tomato plant", "grape vine", "banana plant",
      "orange tree", "apple tree", "lemon tree", "coffee plant", "tea plant", "cotton plant",
      "wheat plant", "barley plant", "sunflower plant", "lavender plant", "mint plant", "basil plant",
      "succulent plant", "bonsai tree", "eucalyptus tree", "redwood tree",
      // Second pass. The first forty named the obvious trees and flowers and left out the plants that
      // are neither: the crops a country lives on, the things that grow in water, and the fungi.
      "bamboo plant", "mangrove tree", "cedar tree", "spruce tree", "fir tree", "cypress tree",
      "beech tree", "ash tree", "elm tree", "poplar tree", "sycamore tree", "acacia tree",
      "baobab tree", "sequoia tree", "juniper plant", "ginkgo tree", "magnolia tree", "dogwood tree",
      "rhododendron plant", "lavender bush", "rosemary plant", "thyme plant", "sage plant", "oregano plant",
      "aloe plant", "agave plant", "jade plant", "venus flytrap", "pitcher plant", "sundew plant",
      "water lily", "lotus flower", "cattail plant", "seaweed plant", "kelp plant", "seagrass plant",
      "mushroom fungus", "morel mushroom", "fly agaric", "lichen plant", "peat moss", "fern frond",
      "palm frond", "coconut palm", "date palm", "oil palm", "rubber tree", "cacao tree",
      "sugarcane plant", "soybean plant", "barley plant", "oat plant", "millet plant", "sorghum plant",
      "peanut plant", "sunflower field", "canola plant", "tobacco plant", "indigo plant", "hemp plant",
      "strawberry plant", "blueberry bush", "raspberry plant", "blackberry plant", "grapevine plant", "kiwi vine",
      "pumpkin plant", "melon plant", "watermelon plant", "cucumber plant", "pepper plant", "eggplant plant",
      "onion plant", "garlic plant", "carrot plant", "beetroot plant", "radish plant", "lettuce plant",
      "cabbage plant", "broccoli plant", "cauliflower plant", "spinach plant", "kale plant", "artichoke plant",
    ],
  },
  vehicles: {
    module: "../data/vehicles.ts",
    exported: "VEHICLE_ENTRIES",
    dataFile: "data/vehicles.ts",
    queriesFile: "data/vehicles-queries.json",
    kind: "sketchfab",
    fallbackQueries: [
      "motorcycle", "sports car", "pickup truck", "delivery van", "city bus", "tram", "subway train",
      "steam locomotive", "diesel locomotive", "sailing yacht", "cargo ship", "tugboat", "ferry boat",
      "helicopter", "private jet", "fighter jet", "cargo plane", "seaplane", "hot air balloon",
      "ambulance", "fire truck", "police car", "tractor", "combine harvester", "bulldozer", "crane truck",
      "tanker truck", "cement mixer", "scooter", "mountain bike", "kayak", "canoe", "sailboat",
      "submarine", "hovercraft", "monster truck", "go kart", "snowmobile", "armoured vehicle", "space shuttle",
      // Second pass. Vehicles was the thinnest catalogue of the four when this list was written - the
      // first forty queries produced fourteen entries - so the additions are deliberately concrete
      // machines rather than categories, because "car" returns a showroom and "tuk tuk" returns a
      // tuk tuk.
      "tuk tuk", "rickshaw", "double decker bus", "school bus", "minibus", "camper van",
      "garbage truck", "tow truck", "flatbed truck", "dump truck", "refrigerated truck", "logging truck",
      "road train", "semi trailer", "car carrier trailer", "livestock trailer", "food truck", "bookmobile",
      "trolleybus", "light rail tram", "funicular railway", "monorail train", "high speed train", "maglev train",
      "freight train", "boxcar wagon", "flatcar wagon", "caboose", "handcar", "mine cart",
      "container ship", "bulk carrier ship", "oil tanker ship", "cruise ship", "research vessel", "icebreaker ship",
      "fishing trawler", "river barge", "gondola boat", "junk ship", "dhow ship", "longship viking",
      "hydrofoil boat", "catamaran boat", "trimaran boat", "tug boat", "pilot boat", "lifeboat",
      "air ambulance helicopter", "cargo helicopter", "attack helicopter", "observation helicopter", "gyrocopter", "paramotor",
      "glider aircraft", "biplane aircraft", "airliner aircraft", "cargo aircraft", "tanker aircraft", "firefighting aircraft",
      "aircraft carrier", "destroyer warship", "frigate warship", "patrol boat", "landing craft", "minesweeper ship",
      "bulldozer machine", "excavator machine", "backhoe loader", "wheel loader", "skid steer loader", "road roller",
      "asphalt paver", "motor grader", "forklift truck", "reach stacker", "straddle carrier", "container crane",
      "tower crane", "mobile crane", "bucket wheel excavator", "dragline excavator", "drilling rig", "pile driver",
      "combine harvester machine", "seed drill machine", "hay baler", "crop sprayer", "grain cart", "milking machine",
      "electric scooter", "cargo bicycle", "tandem bicycle", "unicycle", "roller skates", "segway personal transporter",
      "snow plough", "gritter truck", "street sweeper", "sewage vacuum truck", "cement mixer truck", "concrete pump truck",
    ],
  },
  buildings: {
    // NOT data/buildings.ts: that file is the modern-monument *rule* (a readonly string[] of landmark
    // slugs), and pointing a harvest at it would append entry objects into that array and break it.
    // Measured, not imagined - the first attempt at running this catalogue died on
    // "existing[source.exported].map is not a function" before it wrote anything.
    module: "../data/buildings-entries.ts",
    exported: "BUILDING_ENTRIES",
    dataFile: "data/buildings-entries.ts",
    queriesFile: "data/buildings-queries.json",
    kind: "sketchfab",
    fallbackQueries: [
      "skyscraper", "office building", "apartment building", "modern house", "villa", "museum building",
      "stadium", "airport terminal", "shopping mall", "hotel building", "library building", "school building",
      "hospital building", "factory building", "warehouse", "parking garage", "observation tower",
      "TV tower", "radio tower", "water tower", "wind turbine", "solar power plant", "dam", "lighthouse",
      "suspension bridge", "arch bridge", "cable-stayed bridge", "train station building",
      "convention centre", "opera house", "cinema building", "bank building", "city hall", "church building",
      "temple building", "mosque building", "synagogue building", "pagoda", "office tower", "residential tower",
      // Second pass, and the longest list of the four on purpose: buildings starts from zero harvested
      // entries, and this catalogue asks for kinds of structure rather than named monuments - a
      // "skyscraper" is a subject with a real model and a real article, and the ten most famous towers
      // in the world are already in Architecture with their own pages.
      "barn building", "farmhouse building", "cottage building", "townhouse building", "bungalow house",
      "apartment block", "condominium tower", "mixed use building", "office park building", "business centre",
      "data centre building", "power station building", "nuclear reactor building", "substation building",
      "water treatment plant", "recycling plant", "steel mill building", "cement plant building", "brewery building",
      "winery building", "warehouse distribution centre", "cold storage building", "hangar building", "control tower",
      "train shed", "bus station building", "metro station building", "ferry terminal", "cruise terminal",
      "border checkpoint building", "toll booth", "fuel station canopy", "car wash building", "parking structure",
      "pedestrian bridge", "viaduct bridge", "truss bridge", "bascule bridge", "pontoon bridge",
      "aqueduct bridge", "skyway bridge", "footbridge", "railway bridge", "road tunnel portal",
      "canal lock", "marina building", "boathouse building", "pier building", "bandstand building",
      "amphitheatre building", "concert hall building", "theatre building", "art gallery building", "science museum",
      "planetarium building", "aquarium building", "zoo enclosure", "botanical greenhouse", "pavilion building",
      "kiosk building", "gazebo building", "pergola structure", "bandshell structure", "clock tower",
      "bell tower", "minaret tower", "campanile tower", "watchtower building", "fire lookout tower",
      "lighthouse tower", "water tower structure", "cooling tower", "chimney stack", "silo structure",
      "grain elevator", "storage tank", "gasometer structure", "windmill building", "watermill building",
      "smokestack industrial", "crane gantry", "ski lift station", "mountain hut", "beach hut",
      "treehouse structure", "houseboat building", "floating house", "underground bunker", "air raid shelter",
      "castle keep", "fortress bastion", "city wall gate", "watch tower ruin", "arch monument",
      "obelisk monument", "memorial arch", "cenotaph monument", "triumphal arch", "gateway arch",
    ],
  },
};

if (!SOURCES[catalogueId]) {
  console.error("unknown catalogue " + catalogueId + "; known: " + Object.keys(SOURCES).join(", "));
  process.exit(1);
}

const source = SOURCES[catalogueId];

/* ---------------------------------------------------------------- the subject list */

/** NASA's repository: 227 folders, each a model, public domain. */
async function nasaSubjects() {
  const url = "https://api.github.com/repos/nasa/NASA-3D-Resources/contents/" + encodeURIComponent("3D Models").replace(/%2F/g, "/");
  // The network in this environment drops connections mid-run (`ECONNRESET`), and a listing that
  // fails once must not cost the whole pass - see lib/net-retry.ts.
  const response = await fetchWithRetry(url, { headers: { accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error("NASA listing failed: " + response.status);
  const listing = await response.json();
  return listing.filter((entry) => entry.type === "dir").map((entry) => ({ name: entry.name, provider: "nasa" }));
}

/** Sketchfab search per query, keeping the titles that name a real subject. */
async function sketchfabSubjects() {
  // `rankCandidates` is imported for its **licence verdict**, not its ordering: it runs every candidate
  // through the same `evaluateLicense` table the model pipeline gates on. A hand-written test here
  // ("the label starts with CC0 or CC-BY") rejected most of what the site may legally ship, because
  // Sketchfab labels those models "CC Attribution" - measured, and the reason a 40-query harvest
  // produced seven candidates.
  const { PROVIDERS, loadEnvFiles, rankCandidates } = await import("./fetch-models.mjs");
  await loadEnvFiles();

  const found = new Map();
  for (const query of source.fallbackQueries) {
    let candidates = [];
    try {
      candidates = await PROVIDERS.sketchfab.search(query, { limit: 24 });
    } catch (error) {
      console.warn("  ! " + query + ": " + String(error.message).split("\n")[0]);
      continue;
    }
    for (const entry of rankCandidates(candidates, { name: query, latin_name: "", category: source.module })) {
      const title = String(entry.candidate.title ?? "").trim();
      if (!title || title.length < 3 || title.length > 60) continue;
      const folded = title.toLowerCase();
      if (PLACEHOLDER_WORDS.some((word) => folded.includes(word))) continue;
      // A subject with no licence we can ship is a subject we must not write about here - and the
      // verdict is the pipeline's own, not a second opinion written here.
      if (!entry.licence.ok || !entry.candidate.downloadable) continue;
      if (!found.has(folded)) {
        found.set(folded, { name: title, provider: "sketchfab", query, popularity: entry.candidate.downloadCount ?? 0 });
      }
    }
  }
  return [...found.values()].sort((a, b) => b.popularity - a.popularity);
}

/* ---------------------------------------------------------------- the facts */

const strip = (value) => value.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();

/**
 * The article for a subject name, tried under the variants a model repository writes it in.
 *
 * NASA's folder names are written for a shelf, not for an encyclopaedia: "Aqua (A)" is the satellite
 * Aqua, "Advanced Technology Large-Aperture Space Telescope (ATLAST)" is now the Large Ultraviolet
 * Optical Infrared Surveyor, and "Tracking and Data Relay Satellites (TDRS) (A)" is the TDRS programme.
 * The raw name is tried first, then the name with its parentheticals removed, then the same without a
 * trailing letter - which is what turns 6 usable subjects out of 227 into a catalogue.
 */
async function wikipedia(name) {
  const variants = [
    name,
    name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
    name.replace(/\s*\([^)]*\)\s*$/g, "").trim(),
    name.replace(/\s*\([A-Z]\)\s*$/g, "").trim(),
  ].filter((value, index, all) => value.length > 2 && all.indexOf(value) === index);

  for (const variant of variants) {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&explaintext=1&redirects=1&titles=" +
      encodeURIComponent(variant);
    let body;
    try {
      const response = await fetchWithRetry(url);
      if (!response.ok) continue;
      body = await response.json();
    } catch {
      // A dropped connection is not "this subject has no article": keep looking, and keep the pass alive.
      continue;
    }
    const page = Object.values(body?.query?.pages ?? {})[0];
    if (!page || page.missing !== undefined) continue;
    // Cut at the first section heading. The lead is the part before it; everything after is body text at
    // best and a "== References ==" list at worst, and one harvested entry shipped a description that
    // ended in the literal words "== References ==" because this was not cut. Measured, on
    // buildings/rattin-castle-wm034-008.
    const extract = strip((page.extract ?? "").split(/\n=+[^=\n]+=+/)[0] ?? "");
    if (extract.length < 200) continue;
    const lead = strip(extract.split(/\n\n/)[0] ?? "");
    return { title: page.title, extract, lead: lead.length > 120 ? lead : extract.slice(0, 900) };
  }
  return null;
}

/** Sentences of the lead that carry a figure - the only ones this script will call facts. */
function factsFrom(extract) {
  const sentences = extract
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 340 && /\d/.test(sentence) && !/may refer to/.test(sentence));
  const unique = [...new Set(sentences)];
  return unique.slice(0, 4);
}

function descriptionFrom(extract, facts) {
  // The article's own opening, with the sentences that became facts removed so the card does not say
  // the same thing twice - and never more than four sentences, which is all a card holds.
  const sentences = extract.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const kept = sentences.filter((sentence) => !facts.includes(sentence));
  // A lead is usually enough; when it is one short sentence, the next one carries the description over
  // the line rather than losing the subject.
  const chosen = (kept.length > 0 ? kept : sentences).slice(0, 4);

  // Every sentence has to be a sentence. A dropped connection mid-fetch, a truncation, or an article
  // whose lead runs into a heading all produce a "description" that stops in the middle of a clause, and
  // the card then shows prose that ends nowhere. The last fragment is dropped rather than published, and
  // if nothing complete is left the subject is skipped.
  const complete = chosen.filter((sentence, index) =>
    /[.!?]$/.test(sentence) || (index < chosen.length - 1),
  );
  const description = complete.join(" ");
  return description.length >= 120 && /[.!?]$/.test(description) ? description : null;
}

const slugFor = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    // Trim after slicing, never before: cutting a slug at 40 characters can land on a hyphen and leave
    // one trailing, which is not kebab-case and `scripts/check-catalogues.mjs` refuses it. Measured on
    // the first space harvest: "geostationary-operational-environmental-" reached the catalogue.
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");

const ACCENTS = [
  ["#8ab4ff", "#131a3a"], ["#7ee787", "#0f2a17"], ["#ffb457", "#301a05"], ["#c9d6e4", "#1b2531"],
  ["#f0a6ca", "#3a1024"], ["#a5f3fc", "#0b2a33"], ["#fcd34d", "#332405"], ["#c4b5fd", "#221a3d"],
];

/* ---------------------------------------------------------------- run */

const subjects =
  source.kind === "nasa" ? await nasaSubjects()
  : source.kind === "both" ? [...(await nasaSubjects()), ...(await sketchfabSubjects())]
  : await sketchfabSubjects();
console.log(subjects.length + " candidate subjects from " + source.kind + " — working toward " + limit + " entries, printing progress every 5 subjects");

const existing = await import(source.module);
const present = new Set(existing[source.exported].map((entry) => entry.slug));
const queries = JSON.parse(await readFile(join(ROOT, source.queriesFile), "utf8"));

const entries = [];
const used = new Set(present);
let examined = 0;

/**
 * Progress, per subject, on one line that rewrites itself.
 *
 * This loop had no progress output at all, and it cost two 70-minute runs: a pass that examines
 * hundreds of subjects over Sketchfab and Wikipedia looks **exactly** like a pass that has hung, so
 * both were killed on the assumption that they were stuck. The rule this project keeps re-learning is
 * that a long job has to say what it is doing — the same reason `scripts/render-model-previews.mjs`
 * prints per model.
 */
const progress = () => {
  process.stdout.write(
    "  … " + examined + "/" + subjects.length + " subject(s) examined · " +
      entries.length + "/" + limit + " entry(s) gathered\r",
  );
};

for (const subject of subjects) {
  if (entries.length >= limit) break;

  examined += 1;
  if (examined % 5 === 0) progress();

  const slug = slugFor(subject.name);
  if (!slug || used.has(slug)) continue;

  // Wikipedia is the source of record: no article, no entry. One subject's failure - a dropped
  // connection, a malformed article - never ends the pass.
  let article = null;
  try {
    article = await wikipedia(subject.name);
  } catch {
    continue;
  }
  if (!article) continue;

  // Facts come from the whole article - a spacecraft's mass and launch date are usually stated in the
  // body - while the description is the lead, which is what a lead is for.
  const facts = [...factsFrom(article.lead), ...factsFrom(article.extract)].filter(
    (fact, index, all) => all.indexOf(fact) === index,
  ).slice(0, 4);
  if (facts.length < 2) continue;
  const description = descriptionFrom(article.lead, facts);
  if (!description) continue;

  used.add(slug);
  const accent = ACCENTS[entries.length % ACCENTS.length];
  entries.push({
    slug,
    name: article.title,
    subtitle: (source.kind === "nasa" ? "Spacecraft · NASA" : "Catalogue entry"),
    description,
    facts,
    accent,
    popularity: 50 + (entries.length % 40),
    source: article.title,
  });
  queries[slug] = subject.query ?? subject.name;

  if (entries.length % 10 === 0) console.log("  " + entries.length + " entries (" + slug + ")");
}

console.log("\n" + entries.length + " entries harvested for " + catalogueId);

if (!APPLY) {
  console.log("Dry run. Add --apply to write them into " + source.dataFile + " and " + source.queriesFile + ".");
  for (const entry of entries.slice(0, 5)) console.log("  " + entry.slug + " — " + entry.name);
  process.exit(0);
}

/** The entry as TypeScript, in the shape the catalogue file already uses. */
function literal(entry, index) {
  const facts = entry.facts.map((fact) => "      " + JSON.stringify(fact) + ",").join("\n");
  return [
    "  {",
    "    slug: " + JSON.stringify(entry.slug) + ",",
    "    name: " + JSON.stringify(entry.name) + ",",
    "    subtitle: " + JSON.stringify(entry.subtitle) + ",",
    "    description:",
    "      " + JSON.stringify(entry.description) + ",",
    "    facts: [",
    facts,
    "    ],",
    "    model_url: null,",
    "    accent: [" + JSON.stringify(entry.accent[0]) + ", " + JSON.stringify(entry.accent[1]) + "],",
    "    popularity: " + entry.popularity + ",",
    "    metadata: {",
    "      // Harvested, not written by hand: the figures above are sentences of this article, and the",
    "      // pipeline fills model_url once a licence-clean model is downloaded and credited.",
    "      source: " + JSON.stringify("Wikipedia — " + entry.source) + ",",
    "    },",
    "  },",
  ].join("\n");
}

const file = await readFile(join(ROOT, source.dataFile), "utf8");
const closing = file.lastIndexOf("];");
if (closing === -1) throw new Error(source.dataFile + " has no closing ]; to insert before");
const added = entries.map(literal).join("\n");
const next =
  file.slice(0, closing) +
  "\n  /* ------------------------------------------------------------------ harvested entries\n" +
  "     Collected by scripts/harvest-catalogue-entries.mjs from " + source.kind + " and Wikipedia, on " +
  new Date().toISOString().slice(0, 10) + ". The model_url of each one is written by the model pipeline. */\n" +
  added + "\n" +
  file.slice(closing);

await writeFile(join(ROOT, source.dataFile), next, "utf8");
await writeFile(join(ROOT, source.queriesFile), JSON.stringify(queries, null, 2) + "\n", "utf8");
console.log("wrote " + entries.length + " entries into " + source.dataFile + " and their queries into " + source.queriesFile);
