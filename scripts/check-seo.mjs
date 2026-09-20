/**
 * Assertions for the structured data Kami3D publishes.
 *
 * Search engines fail quietly: a malformed graph, a relative URL or a node that
 * contradicts what the page shows simply never produces a rich result, and
 * nothing in the build complains. These tests pin the parts that are easy to
 * break by accident.
 *
 * Run with: npm run check:seo
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  graph,
  organizationJsonLd,
  speciesItemListJsonLd,
  serializeJsonLd,
  speciesJsonLd,
  websiteJsonLd,
} from "../lib/seo.ts";

const FACTS = {
  siteUrl: "https://kami3d.app",
  name: "Kami3D",
  description: "A 3D encyclopedia of the animal kingdom.",
  githubUrl: "https://github.com/dangthevinh/Kami3D",
};

const LION = {
  id: "1",
  slug: "lion",
  name: "Lion",
  latin_name: "Panthera leo",
  category: "Mammal",
  habitat: "Savanna",
  region: "Africa",
  conservation_status: "Vulnerable",
  diet: "Carnivore",
  description: "A social cat.",
  fun_facts: [],
  model_url: null,
  image_url: null,
  sound_url: null,
  scale_ratio: 1.2,
  weight_kg: 190,
  length_m: 2.5,
  height_m: 1.2,
  lifespan_years: "12",
  premium: false,
  is_prehistoric: false,
  popularity: 5,
};

test("the graph wrapper is the only place @context is declared", () => {
  const data = graph([websiteJsonLd(FACTS), organizationJsonLd(FACTS)]);
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@graph"].length, 2);
  assert.ok(data["@graph"].every((node) => node["@context"] === undefined));
});

test("every URL in the graph is absolute", () => {
  const data = graph([
    websiteJsonLd(FACTS),
    speciesJsonLd(FACTS.siteUrl, LION),
    collectionPageJsonLd(FACTS.siteUrl, "Catalogue", "Every species", 24),
    speciesItemListJsonLd(FACTS.siteUrl, "Species", [LION]),
    breadcrumbJsonLd(FACTS.siteUrl, [{ name: "Home", path: "/" }]),
  ]);

  const urls = [];
  const visit = (value, key) => {
    if (typeof value === "string" && (key === "url" || key === "item" || key === "@id" || key === "urlTemplate")) {
      urls.push(value);
    } else if (value && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
    }
  };
  visit(data, null);

  assert.ok(urls.length >= 6, "expected the graph to carry URLs");
  for (const url of urls) {
    assert.ok(/^https?:\/\//.test(url), `relative URL in structured data: ${url}`);
  }
});

test("the site node declares the search box the navbar actually implements", () => {
  const site = websiteJsonLd(FACTS);
  assert.equal(site["@id"], "https://kami3d.app/#website");
  assert.equal(site.inLanguage, "en");
  // /explore reads ?q=, so that is what the sitelinks search box must target.
  assert.match(site.potentialAction.target.urlTemplate, /\/explore\?q=\{search_term_string\}$/);
});

test("a species node carries the measurements the page renders", () => {
  const species = speciesJsonLd(FACTS.siteUrl, LION);
  assert.equal(species["@type"], "Taxon");
  assert.equal(species.name, "Lion");
  assert.equal(species.alternateName, "Panthera leo");
  assert.equal(species.conservationStatus, "Vulnerable");
  assert.equal(species.url, "https://kami3d.app/animal/lion");

  const properties = Object.fromEntries(species.additionalProperty.map((item) => [item.name, item]));
  assert.deepEqual(properties.Length, { "@type": "PropertyValue", name: "Length", value: 2.5, unitCode: "MTR" });
  assert.equal(properties.Mass.value, 190);
});

test("a species with no height published does not invent one", () => {
  const species = speciesJsonLd(FACTS.siteUrl, { ...LION, height_m: 0 });
  const names = species.additionalProperty.map((item) => item.name);
  assert.deepEqual(names, ["Length", "Mass"]);
});

test("the item list is ordered and complete", () => {
  const list = speciesItemListJsonLd(FACTS.siteUrl, "Species", [LION, { ...LION, id: "2", slug: "tiger", name: "Tiger" }]);
  assert.equal(list.numberOfItems, 2);
  assert.deepEqual(
    list.itemListElement.map((item) => [item.position, item.name]),
    [
      [1, "Lion"],
      [2, "Tiger"],
    ],
  );
});

test("breadcrumbs number from one, in order", () => {
  const crumbs = breadcrumbJsonLd(FACTS.siteUrl, [
    { name: "Home", path: "/" },
    { name: "Explore", path: "/explore" },
    { name: "Lion", path: "/animal/lion" },
  ]);
  assert.deepEqual(
    crumbs.itemListElement.map((item) => item.position),
    [1, 2, 3],
  );
  assert.equal(crumbs.itemListElement[2].item, "https://kami3d.app/animal/lion");
});

test("serialisation escapes what could close the script tag", () => {
  // Injected through a species description, this would otherwise end the script
  // element early and turn the rest of the JSON into markup.
  const payload = { name: "Lion </script><img src=x onerror=alert(1)>" };
  const html = serializeJsonLd(payload);

  assert.ok(!html.includes("<"), "no raw < may reach the document");
  assert.ok(!html.includes("</script"));
  // ...while staying valid JSON that decodes to exactly what went in.
  assert.equal(JSON.parse(html).name, payload.name);
});

test("serialisation handles the node shapes the graph actually holds", () => {
  const data = graph([speciesJsonLd(FACTS.siteUrl, LION)]);
  assert.deepEqual(JSON.parse(serializeJsonLd(data)), data);
});
