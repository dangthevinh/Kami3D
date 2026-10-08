/**
 * The third catalogue that is harvested rather than hand-written, and the file the buildings pipeline
 * fills.
 *
 * ## Why this is not `data/buildings.ts`
 *
 * `data/buildings.ts` is a **rule**, not a catalogue: it holds the eleven monuments of the historic
 * architecture catalogue that were built with modern engineering, written down one decision at a time.
 * `BUILDING_ENTRIES` here is the other half of the same subject - buildings as *kinds of thing* rather
 * than as named monuments - and it is grown the way Space, Plants and Vehicles are grown:
 *
 *   ```bash
 *   node scripts/harvest-catalogue-entries.mjs --catalogue=buildings --limit=100 --apply
 *   node scripts/fetch-catalog-models.mjs   --catalogue=buildings --apply
 *   ```
 *
 * The two halves are kept in separate files because they are found and checked in different ways. A
 * monument is researched by hand and every figure is traceable to its own Wikipedia article. A harvested
 * entry is a subject this script found a licence-clean model for first and a Wikipedia article second,
 * and its `metadata.source` says which article the sentences came from. Merging them into one file
 * would mean one comment header trying to describe two different standards.
 *
 * ## The rules this list is held to
 *
 * The same shape and the same tests as `data/space.ts` and `data/plants.ts` - see
 * `scripts/check-catalogues.mjs`, which checks every entry in this file: kebab-case slug, a subtitle,
 * a description of two to five sentences, two to four facts with a figure among them, two accents far
 * enough apart to read as a gradient, and a saved search per slug in `data/buildings-queries.json`.
 *
 * `model_url` is `null` for every entry until the pipeline downloads, compresses, credits and wires a
 * licence-clean model for it, and an entry the pipeline cannot source is deleted rather than shown as a
 * promise - the rule `data/catalog-entry.ts` states for every harvested catalogue.
 *
 * ## The one thing that is different here
 *
 * A building is a **class** as often as it is an individual, so a slug may name a kind of structure
 * ("skyscraper", "lighthouse", "suspension bridge") rather than one that exists. That is deliberate:
 * the subject list comes from the model source, and a class with a real, credited 3D model teaches more
 * than a monument with none. The eleven named monuments of `data/buildings.ts` are still in the same
 * subject, projected from the architecture catalogue, so this list never repeats one of their slugs.
 */

import type { CatalogEntry } from "./catalog-entry.ts";

export const BUILDING_ENTRIES: CatalogEntry[] = [
  /* ------------------------------------------------------------------ harvested entries
     Collected by scripts/harvest-catalogue-entries.mjs from sketchfab and Wikipedia, on 2026-10-08. The model_url of each one is written by the model pipeline. */
  {
    slug: "skyscraper",
    name: "Skyscraper",
    subtitle: "Catalogue entry",
    description:
      "Skyscrapers can host a variety of spaces, typically including office, commercial, hotel, and residential space. Skyscrapers are a common feature in the downtown or central business districts (CBD) of major cities, especially in the Americas, Asia, and Australia, often due to a high demand for space and limited availability of land. The majority of skyscrapers are designed with a steel frame and shear walls that support curtain walls. These curtain walls either bear on the framework below or are suspended from the framework above, rather than resting on load-bearing walls of conventional construction.",
    facts: [
      "A skyscraper is a very tall building or otherwise permanently habitable structure, typically defined as reaching a minimum height of 150 metres (492 ft) in height; however, there remains no universally accepted definition of a skyscraper, other than being a high-rise.",
      "Skyscrapers first emerged in the United States towards the end of the 19th century, especially in New York City and Chicago.",
      "Early 20th‑century skyscraper construction expanded to several other countries, but slowed sharply during the Great Depression of the 1930s and did not fully resume until the 1950s.",
      "A new wave of skyscraper building occurred in many United States cities from the 1960s through the 1980s.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Skyscraper",
    },
  },
  {
    slug: "skyscrapers",
    name: "Skyscraper",
    subtitle: "Catalogue entry",
    description:
      "Skyscrapers can host a variety of spaces, typically including office, commercial, hotel, and residential space. Skyscrapers are a common feature in the downtown or central business districts (CBD) of major cities, especially in the Americas, Asia, and Australia, often due to a high demand for space and limited availability of land. The majority of skyscrapers are designed with a steel frame and shear walls that support curtain walls. These curtain walls either bear on the framework below or are suspended from the framework above, rather than resting on load-bearing walls of conventional construction.",
    facts: [
      "A skyscraper is a very tall building or otherwise permanently habitable structure, typically defined as reaching a minimum height of 150 metres (492 ft) in height; however, there remains no universally accepted definition of a skyscraper, other than being a high-rise.",
      "Skyscrapers first emerged in the United States towards the end of the 19th century, especially in New York City and Chicago.",
      "Early 20th‑century skyscraper construction expanded to several other countries, but slowed sharply during the Great Depression of the 1930s and did not fully resume until the 1950s.",
      "A new wave of skyscraper building occurred in many United States cities from the 1960s through the 1980s.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 51,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Skyscraper",
    },
  },
  {
    slug: "community-museum",
    name: "Community museum",
    subtitle: "Catalogue entry",
    description:
      "A community museum is a museum serving as an exhibition and gathering space for specific identity groups or geographic areas. In contrast to traditional museums, community museums are commonly multidisciplinary, and may simultaneously exhibit the history, social history, art, or folklore of their communities. Noting that their histories and cultures were largely absent from mainstream museums, activists and civic leaders from minority communities began to open their own museums in an attempt to have their identities and stories told. In the context of the African American community, this lack of representation prompted individuals to open small, locally focused museums, many of which provided early models for contemporary community museums.",
    facts: [
      "== History == === Origins === In the United States, the emergence of community museums in the 1960s and 1970s has a direct correlation with the greater social movements of the time.",
      "=== Professionalization === During the 1960s and 1970s, community museums tended to be created and run by activists rather than museum professionals.",
      "Starting in the late 1970s, The Anacostia Community Museum began to create specialized internal departments and emphasize expert credentials in its hiring process.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Community museum",
    },
  },
  {
    slug: "stadium",
    name: "Stadium",
    subtitle: "Catalogue entry",
    description:
      "A stadium (pl.: stadiums or stadia) is a place or venue for (mostly) outdoor sports, concerts, or other events and consists of a field or stage completely or partially surrounded by a tiered structure designed to allow spectators to stand or sit and view the event. Pausanias noted that for about half a century the only event at the ancient Greek Olympic festival was the race that comprised one length of the stadion at Olympia, where the word \"stadium\" originated. Other popular stadium sports include gridiron football, baseball, cricket, the various codes of rugby, field lacrosse, bandy, and bullfighting. Many large sports venues are also used for concerts.",
    facts: [
      "Most of the stadiums with a capacity of at least 10,000 are used for association football.",
      "== Etymology == \"Stadium\" is the Latin form of the Greek word \"stadion\" (στάδιον), a measure of length equalling the length of 600 human feet.",
      "As feet are of variable length the exact length of a stadion depends on the exact length adopted for 1 foot at a given place and time.",
      "Although in modern terms 1 stadion = 600 ft (180 m), in a given historical context it may actually signify a length up to 15% larger or smaller.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Stadium",
    },
  },
  {
    slug: "camp-nou-stadium",
    name: "Camp Nou",
    subtitle: "Catalogue entry",
    description:
      "Renovation of the stadium began on 1 June 2023. Barcelona played its home matches at the Estadi Olímpic Lluís Companys during the 2023–24 and 2024–25 seasons, and briefly at both the Olympic Stadium and the Johan Cruyff Stadium during the 2025–26 season. Camp Nou reopened for competitive matches in November 2025 at a reduced capacity. The renovation is expected to be completed ahead of the 2028–29 season.",
    facts: [
      "Camp Nou (Catalan: [ˈkam ˈnɔw], meaning 'New Field'), officially Spotify Camp Nou for sponsorship reasons, and often referred to in English as the Nou Camp, is a stadium in Barcelona and the home of La Liga club FC Barcelona since its opening in 1957.",
      "It is currently undergoing renovation, and with a planned increased seating capacity of 105,000 it will retain its position as the largest stadium in terms of seating capacity in Spain and Europe, as well as the second largest association football stadium, while becoming the fifth-largest overall stadium in the world.",
      "Camp Nou has hosted two European Cup/Champions League finals in 1989 and 1999, two European Cup Winners' Cup finals, four Inter-Cities Fairs Cup final games, five UEFA Super Cup games, four Copa del Rey finals, two Copa de la Liga finals, and twenty-one Supercopa de España finals.",
      "It also hosted five matches in the 1982 FIFA World Cup (including the opening game), half of the four matches at the 1964 European Nations' Cup, and the football tournament's final at the 1992 Summer Olympics.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Camp Nou",
    },
  },
  {
    slug: "aviva-stadium",
    name: "Aviva Stadium",
    subtitle: "Catalogue entry",
    description:
      "Aviva Stadium, also known as the Dublin Arena (during UEFA competitions), is a sports stadium located in Dublin, Ireland. The decision to redevelop the stadium came after plans for both Stadium Ireland and Eircom Park fell through. The stadium, located beside Lansdowne Road railway station, officially opened on 14 May 2010. The stadium was Ireland's first UEFA Category 4 Stadium, and hosted the 2011 and the 2024 UEFA Europa League finals.",
    facts: [
      "It has a capacity of 51,711 (all seated).",
      "It is built on the site of the former Lansdowne Road Stadium, which was demolished in 2007, and replaced it as home to its chief tenants: the Ireland national rugby union team and the Republic of Ireland football team.",
      "Aviva Group Ireland signed a 10-year deal for the naming rights in 2009, and subsequently extended the arrangement in 2018 and 2025.",
      "The deal signed in 2025 runs until 2030.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Aviva Stadium",
    },
  },
  {
    slug: "olympiastadion-berlin",
    name: "Olympiastadion (Berlin)",
    subtitle: "Catalogue entry",
    description:
      "Olympiastadion (German pronunciation: [oˈlʏmpi̯aˌʃtaːdi̯ɔn] ), also known in English as the Berlin Olympic Stadium or simply the Olympic Stadium, is a sports stadium at Olympiapark Berlin in Berlin, Germany. The Olympiastadion is a UEFA category four stadium. Besides its use as an athletics stadium, the arena has built a footballing tradition. It hosted three matches in the 1974 FIFA World Cup.",
    facts: [
      "It was originally designed by Werner March for the 1936 Summer Olympics.",
      "During the Olympics, the record attendance was thought to be over 100,000.",
      "Since renovations in 2004, the Olympiastadion has a permanent capacity of 74,475 seats and is the largest stadium in Germany for international football matches.",
      "Since 1963, it has been the home of the Hertha BSC.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 56,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Olympiastadion (Berlin)",
    },
  },
  {
    slug: "airport",
    name: "Airport",
    subtitle: "Catalogue entry",
    description:
      "An airport is an aerodrome with extended facilities, mostly for commercial air transport. They usually consist of a landing area, which comprises an aerially accessible open space including at least one operationally active surface such as a runway for a plane to take off and to land or a helipad, and often includes adjacent utility buildings such as control towers, hangars and terminals, to maintain and monitor aircraft. Larger airports may have airport aprons, taxiway bridges, air traffic control centres, passenger facilities such as restaurants and lounges, and emergency services. In some countries, the US in particular, airports also typically have one or more fixed-base operators, serving general aviation.",
    facts: [
      "== Terminology == The word aeroplane emerged in the 1870s, long before the Wright brothers succeeded in 1903.",
      "In an interview with The New York Times in 1902, Alberto Santos-Dumont coined the term airport: \"What do I think about the future of aerial navigation?\" he said in answer to a volley of questions.",
      "== Management == Smaller or less-developed airfields, which represent the vast majority, often have a single runway shorter than 1,000 m (3,300 ft).",
      "Larger airports for airline flights generally have paved runways of 2,000 m (6,600 ft) or longer.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Airport",
    },
  },
  {
    slug: "jewel-changi-airport",
    name: "Jewel Changi Airport",
    subtitle: "Catalogue entry",
    description:
      "Jewel Changi Airport (also known as Jewel; Chinese: 星耀樟宜; pinyin: Xīng yào Zhāngyí; lit. Its centrepiece is the world's tallest indoor waterfall, the Rain Vortex, which is surrounded by a terraced forest setting. Attractions include the Forest Valley, an indoor garden spanning five storeys; and the Canopy Park at the topmost level, featuring gardens and leisure facilities. In October 2019, six months after its soft opening, it welcomed 50 million visitors, exceeding its initial target for the whole year.",
    facts: [
      "'Singapore Sparkle Changi', Malay: Jewel Lapangan Terbang Changi) is a nature-themed entertainment and retail complex surrounded by and linked to Terminals 1, 2, and 3 of Changi Airport in Singapore.",
      "Jewel includes gardens, attractions, a hotel, about 300 retail and dining outlets, as well as early baggage check-in facilities.",
      "It covers a total floor area of 135,700 m2 (1,461,000 sq ft), spanning ten storeys—five above-ground and five basement levels.",
      "Jewel receives about 300,000 visitors per day.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 58,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Jewel Changi Airport",
    },
  },
  {
    slug: "shopping-mall",
    name: "Shopping mall",
    subtitle: "Catalogue entry",
    description:
      "A shopping mall (or simply mall) is a large indoor shopping center, usually anchored by department stores. In the United Kingdom and other countries, shopping malls may be called shopping centres. In recent decades, malls have declined considerably in the United States and Canada, partly due to the retail apocalypse, particularly in subprime locations, and some have closed and become so-called dead malls. Successful examples of de-malling have seen such changes as added entertainment and experiential features, added big-box stores as anchors, or converted to other specialized shopping center formats such as power centers, lifestyle centers, factory outlet centers, and festival marketplaces.",
    facts: [
      "The term mall originally meant a pedestrian promenade with shops along it, but in the late 1960s, it began to be used as a generic term for the large enclosed shopping centers that were becoming increasingly commonplace.",
      "A regional mall, per the International Council of Shopping Centers, is a shopping mall with 400,000 sq ft (37,000 m2) to 800,000 sq ft (74,000 m2) gross leasable area with at least two anchor stores.",
      "A super-regional mall, per the International Council of Shopping Centers, is a shopping mall with over 800,000 sq ft (74,000 m2) of gross leasable area, three or more anchors, mass merchant, more variety, fashion apparel, and serves as the dominant shopping venue for the region (25 miles or 40 km) in which it is located.",
      "In 1798, the first covered shopping passage was built in Paris, the Passage du Caire.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Shopping mall",
    },
  },
  {
    slug: "hotel",
    name: "Hotel",
    subtitle: "Catalogue entry",
    description:
      "A hotel is an establishment that provides paid lodging on a short-term basis. Facilities provided inside a hotel room may range from a modest-quality mattress in a small room to large suites with bigger, higher-quality beds, a dresser, a refrigerator, and other kitchen facilities, upholstered chairs, a television, and en-suite bathrooms. Small, lower-priced hotels may offer only the most basic guest services and facilities. Larger, higher-priced hotels may provide additional guest facilities such as a swimming pool, a business center with computers, printers, and other office equipment, childcare, conference and event facilities, tennis or basketball courts, gymnasium, restaurants, day spa, and social function services.",
    facts: [
      "For a period of about 200 years from the mid-17th century, coaching inns served as a place for lodging for coach travelers.",
      "Inns began to cater to wealthier clients in the mid-18th century.",
      "One of the first hotels in a modern sense was opened in Exeter in 1768.",
      "Hotels proliferated throughout Western Europe and North America in the early 19th century, and luxury hotels began to spring up in the later part of the 19th century, particularly in the United States.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hotel",
    },
  },
  {
    slug: "library",
    name: "Library",
    subtitle: "Catalogue entry",
    description:
      "A library is a collection of books, and possibly other materials and media, that is accessible for use by its members and members of allied institutions. Libraries provide physical (hard copies) or digital (soft copies) materials, and may be a physical location, a virtual space, or both. A library's collection normally includes printed materials which can be borrowed, and usually also includes a reference section of publications which may only be utilized inside the premises. Resources such as commercial releases of films, television programmes, other video recordings, radio, music and audio recordings may be available in many formats.",
    facts: [
      "In addition, some libraries offer creation stations for makers which offer access to a 3D printing station with a 3D scanner.",
      "The first libraries consisted of archives of the earliest form of writing—the clay tablets in cuneiform script discovered in Sumer, some dating back to 2600 BC.",
      "Private or personal libraries made up of written books appeared in classical Greece in the 5th century BC.",
      "In the 6th century, at the very close of the Classical period, the great libraries of the Mediterranean world remained those of Constantinople and Alexandria.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Library",
    },
  },
  {
    slug: "warehouses",
    name: "Warehouse",
    subtitle: "Catalogue entry",
    description:
      "A warehouse is a building for storing goods. Warehouses are used by manufacturers, importers, exporters, wholesalers, transport businesses, customs, etc. For a warehouse to function efficiently, the facility must be properly slotted. They are usually large plain buildings, often in industrial parks on the outskirts of cities, towns, or villages.",
    facts: [
      "Galba's horrea complex contained 140 rooms on the ground floor alone, covering an area of some 225,000 square feet (21,000 m2).",
      "warehouses today are larger than 100,000 square feet (9290 m2).",
      "The warehouses of the trading port Bryggen in Bergen, Norway (now a World Heritage Site), demonstrate characteristic European gabled timber forms dating from the late Middle Ages, though what remains today was largely rebuilt in the same traditional style following great fires in 1702 and 1955.",
      "=== Industrial Revolution === During the Industrial Revolution of the mid 18th century, the function of warehouses evolved and became more specialised.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 62,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Warehouse",
    },
  },
  {
    slug: "parking-garage",
    name: "Multistorey car park",
    subtitle: "Catalogue entry",
    description:
      "A multistorey car park (Commonwealth English) or parking garage (American English), also called a multistorey, parking building, parking structure, parkade (Canadian and South African English), parking ramp, parking deck, or indoor parking, is a building designed for car, motorcycle, and bicycle parking in which parking takes place on more than one floor or level. The term multistorey (or multistory) is almost never used in the United States. Parking structures may be heated if they are enclosed. Some cities such as London have abolished previously enacted minimum parking requirements.",
    facts: [
      "The first known multistorey facility was built in London in 1901 and the first underground parking was built in Barcelona in 1904 (see history).",
      "Design of parking structures can add considerable cost for planning new developments, with costs in the United States around $28,000 per space and $56,000 per space for underground (excluding the cost of land), and can be required by cities in parking mandates for new buildings.",
      "== History == The earliest known multi-storey car park was opened in May 1901 by City & Suburban Electric Carriage Company at 6 Denman Street, central London.",
      "The location had space for 100 vehicles over seven floors, totalling 19,000 square feet (1,800 m2).",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Multistorey car park",
    },
  },
  {
    slug: "observation-tower",
    name: "Observation tower",
    subtitle: "Catalogue entry",
    description:
      "Unlike a watchtower, which is occupied for surveillance or fire detection over an extended period, a dedicated observation tower exists principally so that visitors may enjoy or study a panoramic view. Because a tall structure is expensive to build and maintain for viewing alone, observation functions are very often combined with another use. Many of the world's best-known observation towers are also broadcasting towers, and observation decks are routinely incorporated into water towers, church steeples, lighthouses, high-rise buildings and even the pylons of bridges. Admission fees and tower restaurants help to offset construction and running costs, and in many cities the tower has become a landmark and a symbol of civic identity.",
    facts: [
      "An observation tower is a tower built wholly or partly to provide an elevated vantage point from which people can look out over the surrounding landscape or cityscape, usually through an unobstructed 360-degree field of view.",
      "Observation towers are typically at least 20 metres (66 ft) tall, so that they clear the surrounding tree canopy or built environment, and have historically been constructed in stone, brick, timber and iron; reinforced concrete, structural steel and glued laminated timber predominate in modern examples.",
      "=== Structural forms === Four structural systems account for the great majority of observation towers: Masonry towers — the traditional form of the 18th- and 19th-century prospect tower, built of quarried stone or brick with a solid or cavity wall and an internal spiral stair.",
      "The Eiffel Tower (1889) is the archetype; a distinct sub-family is the hyperboloid structure, pioneered by Vladimir Shukhov, in which straight members arranged as a doubly ruled surface produce a curved, highly efficient shell.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 64,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Observation tower",
    },
  },
  {
    slug: "empire-state-building",
    name: "Empire State Building",
    subtitle: "Catalogue entry",
    description:
      "Its name is derived from \"Empire State\", the nickname of New York state. As of 2025, the building is the eighth-tallest building in New York City, the tenth-tallest completed skyscraper in the United States, and the 59th-tallest completed skyscraper in the world. The site of the Empire State Building, on the west side of Fifth Avenue between West 33rd and 34th Streets, was developed in 1893 as the Waldorf-Astoria Hotel. In 1929, Empire State Inc.",
    facts: [
      "The Empire State Building is a 102-story, supertall skyscraper in the Midtown South neighborhood of Manhattan, New York City, United States.",
      "The building was designed in the Art Deco style by Shreve, Lamb & Harmon and constructed between 1930 and 1931.",
      "The building has a roof height of 1,250 feet (380 m) and stands a total of 1,454 feet (443.2 m) tall including its antenna.",
      "The Empire State Building was the world's tallest building until the North Tower of the World Trade Center was topped out in 1970; following the September 11 attacks in 2001, the Empire State Building was once more New York City's tallest building until it was surpassed in 2012 by One World Trade Center.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 65,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Empire State Building",
    },
  },
  {
    slug: "frankfurt",
    name: "Frankfurt",
    subtitle: "Catalogue entry",
    description:
      "Frankfurt am Main, usually shortened to Frankfurt, is the most populous city in the German state of Hesse. Home to the European Central Bank, the city serves as one of the four institutional seats of the European Union. Frankfurt is classified by the GaWC as an Alpha world city. Frankfurt was a city state, the Free City of Frankfurt, for nearly five centuries, and was one of the most important cities of the Holy Roman Empire, as a site of Imperial coronations; it lost its sovereignty upon the collapse of the empire in 1806, regained it in 1815 and then lost it again in 1866, when it was annexed by the Kingdom of Prussia following the Austro-Prussian War.",
    facts: [
      "Its 778,589 inhabitants as of 2025 make it the fifth-most populous city in Germany.",
      "Located in the foreland of the Taunus on its namesake river Main, the city forms a continuous conurbation with Offenbach; its urban area has a population of more than 2.7 million.",
      "Frankfurt is the heart of the larger Rhine-Main metropolitan region, which has a population of more than 5.8 million and is Germany's fourth-largest metropolitan region after the Rhine-Ruhr region, the Berlin/Brandenburg Metropolitan Region and the Munich Metropolitan Region.",
      "Frankfurt was first mentioned in a document in 794 and has been an imperial city since 1372.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 66,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Frankfurt",
    },
  },
  {
    slug: "tower-restaurant",
    name: "National Bakery School",
    subtitle: "Catalogue entry",
    description:
      "He was impressed enough to invite Blandy to the Polytechnic for his advice on setting up a school for the technical and practical training of bakers. On 10 October 1894 evening classes for Bakers and Confectioners were opened by Mr Henry C Kutz, President of the London Master Bakers' Protection Society. By 1898 bakers were the largest group in the Borough Polytechnic Institute's student body (142 students) and the success prompted John Blandy to propose that a national bakery school should be set up at the Polytechnic. The proposal prompted the National Association of Master Bakers (founded 1887) to take over the management of the Polytechnic's Bakery School on 25 September 1899 at their own cost.",
    facts: [
      "The National Bakery School, a culinary school at London South Bank University, London, England, was founded in 1894 and is now the world's oldest bakery school.",
      "== History == In December 1893, Sir Philip Magnus, a governor of the Borough Polytechnic Institute, now London South Bank University, proposed that a bakery school should be set up at the Polytechnic.",
      "During the following year Magnus visited a private bakery school run by a Mr John Blandy in Uxbridge (established 1889).",
      "The scheme was approved by the London County Council Education Board in April 1894 and funds granted.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 67,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — National Bakery School",
    },
  },
  {
    slug: "broadcast-tower-game-ready",
    name: "Radio masts and towers",
    subtitle: "Catalogue entry",
    description:
      "Radio masts and towers are typically tall structures designed to support antennas for telecommunications and broadcasting, including television. There are two main types: guyed and self-supporting structures. They are among the tallest human-made structures. Masts are often named after the broadcasting organizations that originally built them or currently use them.",
    facts: [
      "== History == The first experiments in radio communication were conducted by Guglielmo Marconi beginning in 1894.",
      "In 1895–1896 he invented the vertical monopole or Marconi antenna, which was initially a wire suspended from a tall wooden pole.",
      "Radio began to be used commercially for radiotelegraphic communication around 1900.",
      "The first 20 years of commercial radio were dominated by radiotelegraph stations, transmitting over long distances by using very long wavelengths in the very low frequency band – such long waves that they are nearly unused at present.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 68,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Radio masts and towers",
    },
  },
  {
    slug: "water-tower",
    name: "Water tower",
    subtitle: "Catalogue entry",
    description:
      "A water tower is an elevated structure supporting a water tank constructed at a height sufficient to pressurize a distribution system for potable water, and to provide emergency storage for fire protection. Water towers often operate in conjunction with underground or surface service reservoirs, which store treated water close to where it will be used. Other types of water towers may only store raw (non-potable) water for fire protection or industrial purposes, and may not necessarily be connected to a public water supply. Water towers are able to supply water even during power outages, because they rely on hydrostatic pressure produced by elevation of water (due to gravity) to push the water into domestic and industrial water distribution systems; however, they cannot supply the water for a long time without power, because a pump is typically required to refill the tower.",
    facts: [
      "== History == Although the use of elevated water storage tanks has existed since ancient times in various forms, the modern use of water towers for pressurized public water systems developed during the mid-19th century, as steam-pumping became more common, and better pipes that could handle higher pressures were developed.",
      "By the late 19th century, standpipes grew to include storage tanks to meet the ever-increasing demands of growing cities.",
      "In California and some other states, domestic water towers enclosed by siding (tankhouses) were once built (1850s–1930s) to supply individual homes; windmills pumped water from hand-dug wells up into the tank in New York.",
      "Early steam locomotives required water stops every 7 to 10 miles (11 to 16 km).",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 69,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Water tower",
    },
  },
  {
    slug: "vertical-axis-wind-turbine",
    name: "Vertical-axis wind turbine",
    subtitle: "Catalogue entry",
    description:
      "A vertical-axis wind turbine (VAWT) is a type of wind turbine where the main rotor shaft is set transverse to the wind while the main components are located at the base of the turbine. This arrangement allows the generator and gearbox to be located close to the ground, facilitating service and repair. VAWTs do not need to be pointed into the wind, which removes the need for wind-sensing and orientation mechanisms. Major drawbacks for the early designs (Savonius, Darrieus and giromill) included the significant torque ripple during each revolution and the large bending moments on the blades.",
    facts: [
      "For example, the original Darrieus patent, US patent 1835018, includes both options.",
      "Computer modelling suggests that vertical-axis wind turbines arranged in wind farms may generate more than 15% more power per turbine than when acting in isolation.",
      "== General aerodynamics == The forces and the velocities acting in a Darrieus turbine are depicted in Figure 1.",
      "Maximum velocity is found for θ = 0 ∘ {\\displaystyle \\theta =0{}^{\\circ }} and the minimum is found for θ = 180 ∘ {\\displaystyle \\theta =180{}^{\\circ }} , where θ {\\displaystyle \\theta } is the azimuthal or orbital blade position.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 70,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Vertical-axis wind turbine",
    },
  },
  {
    slug: "thermal-power-plant",
    name: "Thermal power station",
    subtitle: "Catalogue entry",
    description:
      "A thermal power station, also known as a thermal power plant, is a type of power station in which the heat energy generated from various fuel sources (e.g., coal, natural gas, nuclear fuel, etc.) is converted to electrical energy. The heat from the source is converted into mechanical energy using a thermodynamic power cycle (such as a Diesel cycle, Rankine cycle, Brayton cycle, etc.). The most common cycle involves a working fluid (often water) heated and boiled under high pressure in a pressure vessel to produce high-pressure steam. This high pressure-steam is then directed to a turbine, where it rotates the turbine's blades.",
    facts: [
      "Thermal power stations produce 70% of the world's electricity.",
      "Virtually all electric power stations use three-phase electrical generators to produce alternating current (AC) electric power at a frequency of 50 Hz or 60 Hz.",
      "Steam-driven power stations have been used to drive most ships in most of the 20th century.",
      "== History == The reciprocating steam engine has been used to produce mechanical power since the 18th century, with notable improvements being made by James Watt.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 71,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Thermal power station",
    },
  },
  {
    slug: "wind-power-plant",
    name: "Wind turbine",
    subtitle: "Catalogue entry",
    description:
      "A wind turbine is a device that converts the kinetic energy of wind into electrical energy. Wind turbines are an increasingly important source of intermittent renewable energy, and are used in many countries to lower energy costs and reduce reliance on fossil fuels. Wind turbines are manufactured in a wide range of sizes, with either horizontal or vertical axes, though horizontal is most common. Commercial power production horizontal-axis turbines usually have three blades, upwind of their towers.",
    facts: [
      "As of 2024, hundreds of thousands of large turbines, in installations known as wind farms, were generating over 1,136 gigawatts of power, with 117 GW added each year.",
      "One study claimed that, as of 2009, wind had the \"lowest relative greenhouse gas emissions, the least water consumption demands and the most favorable social impacts\" compared to photovoltaic, hydro, geothermal, coal and gas energy sources.",
      "== History == The windwheel of Hero of Alexandria (10–70 CE) marks one of the first recorded instances of wind powering a machine.",
      "However, the first known practical wind power plants were built in Sistan, an Eastern province of Persia (now Iran), from the 7th century.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 72,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Wind turbine",
    },
  },
  {
    slug: "model",
    name: "Model",
    subtitle: "Catalogue entry",
    description:
      "A model is an informative representation of an object, person, or system. Models can be divided into physical models (e.g. a ship model) and abstract models (e.g. a set of mathematical equations describing the workings of the atmosphere for the purpose of weather forecasting).",
    facts: [
      "The term originally denoted the plans of a building in 16th-century English, and derived via French and Italian ultimately from Latin modulus, 'a measure'.",
      "a 15th-century criminal representing the biblical Judas in Leonardo da Vinci's painting The Last Supper Model (person), a person who serves as a template for others to copy, as in a role model, often in the context of advertising commercial products; e.g.",
      "the first fashion model, Marie Vernet Worth in 1853, wife of designer Charles Frederick Worth.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 73,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Model",
    },
  },
  {
    slug: "hoover-dam",
    name: "Hoover Dam",
    subtitle: "Catalogue entry",
    description:
      "The Hoover Dam is a concrete arch–gravity dam in the Black Canyon of the Colorado River, on the boundary between the U.S. states of Nevada and Arizona. Roosevelt. Bills passed by Congress during its construction referred to it as Hoover Dam (after President Herbert Hoover), but the Roosevelt administration named it Boulder Dam.",
    facts: [
      "Constructed between 1931 and 1936, during the Great Depression, it was dedicated on September 30, 1935, by President Franklin D.",
      "Its construction was the result of a massive effort involving thousands of workers, and cost over 96 lives.",
      "In 1947, Congress reinstated the name Hoover Dam.",
      "Since about 1900, the Black Canyon and nearby Boulder Canyon had been investigated for their potential to support a dam that would control floods, provide irrigation water, and produce hydroelectric power.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 74,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hoover Dam",
    },
  },
  {
    slug: "dam",
    name: "Dam",
    subtitle: "Catalogue entry",
    description:
      "A dam is a structure that impounds water or restricts its flow. Dams are classified into four basic types: gravity dams are massive structures made of concrete or masonry that rely on their weight to resist the force of impounded water; embankment dams are large earthworks consisting of rocks, clay, sand, soil, or gravel; buttress dams consist of a sloped, concrete face supported on the downstream side by a series of triangular buttresses; and arch dams use a curved concrete wall to transfer the weight of the water to the surrounding valley walls. Dams provide for irrigation, hydropower, water supply, flood management, recreation, inland navigation, and fish farming. Dams generate hydropower, providing a clean and renewable source of electricity, and also supply water for household and industrial needs.",
    facts: [
      "Irrigation is a critical application of dams: about 20% of the world's arable land is irrigated using water from reservoirs impounded by dams.",
      "An early dam was Jawa Dam in modern Jordan, built around 3000 BCE.",
      "The Hittite Empire built several dams in modern Turkey between the 17th and 13th centuries BCE.",
      "In the 1st century CE, the Roman Empire began building masonry gravity dams – typically with vertical faces on both upstream and downstream sides.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 75,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Dam",
    },
  },
  {
    slug: "tillamook-rock-lighthouse",
    name: "Tillamook Rock Light",
    subtitle: "Catalogue entry",
    description:
      "Tillamook Rock Light (known locally as Terrible Tilly or just Tilly) is a deactivated lighthouse on the northern Oregon Coast of the United States. Only the ship's dog was saved. At the time, it was the most expensive lighthouse to be built on the West Coast. Due to the local erratic weather conditions, and the dangerous commute for both keepers and suppliers, the lighthouse earned the nicknamed \"Terrible Tilly\" (or \"Tillie\").",
    facts: [
      "It is located approximately 1.2 miles (1.9 km) offshore from Tillamook Head, and 20 miles (32 km) south of the mouth of the Columbia River near Astoria, situated on less than an acre of basalt rock in the Pacific Ocean.",
      "The construction of the lighthouse was commissioned in 1878 by the United States Congress and took more than 500 days to complete.",
      "Shortly before the completion of the lighthouse in January 1881, the barque Lupatia was wrecked near the rock during foggy weather and sank, with the loss of all 16 crew members.",
      "Tillamook Rock Light was officially lit on January 21, 1881.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 76,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Tillamook Rock Light",
    },
  },
  {
    slug: "seven-foot-knoll-lighthouse",
    name: "Seven Foot Knoll Light",
    subtitle: "Catalogue entry",
    description:
      "It was located atop Seven Foot Knoll in the Chesapeake Bay until it was replaced by a modern navigational aid and relocated to Baltimore's Inner Harbor as a museum exhibit. The northern tidal reach of this river is the Baltimore Harbor, where the now-decommissioned lighthouse has been placed as a museum exhibit. The gallery deck was located 9 feet (2.7 m) above the average high tide waters. The house was the second section, sitting directly atop the gallery deck.",
    facts: [
      "The Seven Foot Knoll Light was built in 1855 (according to some sources, 1856) and is the oldest screw-pile lighthouse in Maryland.",
      "== Location == It was initially installed on a rocky shoal called Seven Foot Knoll (at 39.1572°N 76.4034°W / 39.1572; -76.4034), in the mouth of the Patapsco River.",
      "In 1997 the lighthouse was transferred to the Baltimore Maritime Museum (now the Historic Ships in Baltimore museum) and is permanently installed at the south end of Pier 5.",
      "== Construction == Constructed of 1-inch (25 mm) rolled iron, the lighthouse consists of three main sections.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 77,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Seven Foot Knoll Light",
    },
  },
  {
    slug: "suspension-bridge",
    name: "Suspension bridge",
    subtitle: "Catalogue entry",
    description:
      "A suspension bridge is a type of bridge in which the deck is hung below suspension cables on vertical suspenders. Simple suspension bridges, which lack vertical suspenders, have a long history in many mountainous regions worldwide. Besides the bridge type most commonly called suspension bridges, covered in this article, there are other types of suspension bridges. The type covered here has cables suspended between towers, with vertical suspender cables that transfer the live and dead loads of the deck below, upon which traffic crosses.",
    facts: [
      "The first modern examples of this type of bridge were built in the early 19th century.",
      "In 1433, Gyalpo built eight bridges in eastern Bhutan.",
      "The last surviving chain-linked bridge of Gyalpo's was the Thangtong Gyalpo Bridge in Duksum en route to Trashi Yangtse, which was finally washed away in 2004.",
      "The Inca used rope bridges, documented as early as 1615.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 78,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Suspension bridge",
    },
  },
  {
    slug: "train-station",
    name: "Train station",
    subtitle: "Catalogue entry",
    description:
      "A train station, railroad station, or railway station is a railway facility where trains stop to load or unload passengers, freight, or both. It generally consists of at least one platform, one track, and a station building providing such ancillary services as ticket sales, waiting rooms, and baggage/freight service. Stations on a single-track line often have a passing loop to accommodate trains traveling in the opposite direction. Locations at which passengers only occasionally board or leave a train, sometimes consisting of a short platform and a waiting area but sometimes indicated by no more than a sign, are variously referred to as \"stops\", \"flag stops\", \"halts\", or \"provisional stopping places\".",
    facts: [
      "== History == The world's first recorded railway station, for trains drawn by horses rather than engined locomotives, began passenger service in 1807.",
      "The world's oldest for engined trains was Heighington railway station, on the Stockton and Darlington railway in north-east England built by George Stephenson in the early 19th century, operated by locomotive Locomotion No.",
      "The station opened in 1827 and was in use until the 1970s.",
      "The building, Grade II*-listed, was in bad condition, but was restored in 1984 as an inn.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 79,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Train station",
    },
  },
  {
    slug: "milwaukee-road-depot",
    name: "Milwaukee Road Depot",
    subtitle: "Catalogue entry",
    description:
      "Milwaukee Road Depot can refer to the following former and active train stations used by the Chicago, Milwaukee, St. Paul and Pacific Railroad:, Chicago, Milwaukee & St Paul, Chicago, Milwaukee & Puget Sound Railway, Idaho & Washington Northern and Washington, Idaho & Montana RY, Plus all other former variations of the Milwaukee Road. Most of these had permanent structures. == Idaho == MAINLINE Avery Depot – located on the mainline from Chicago, Illinois to Tacoma, Washington St Maries Depot - now used as the St Maries River Railroad office.",
    facts: [
      "The published September 1910 passenger schedule lists over 1300 stops.",
      "Highway 71/Iowa Highway 9 where the Milwaukee Road line from Spirit Lake, Iowa to Spencer, Iowa sat between 1883 and 1972.",
      "Mendota Station - located on the line between Davis Junction and Oglesby which was abandoned in 1980.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 80,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Milwaukee Road Depot",
    },
  },
  {
    slug: "gwangju-biennale",
    name: "Gwangju Biennale",
    subtitle: "Catalogue entry",
    description:
      "The Biennale is curated by both Korean and International curators and art critics and is hosted by the Gwangju Biennale Foundation and the city of Gwangju. == History == 1995: Beyond Borders 1997: Unmapping the Earth 2000: Man and Space 2002: P_A_U_S_E 2004: A Grain of Dust A Drop of Water 2006: Fever Variations 2008: On the Road / Position Papers / Insertions 2010: 10,000 LIVES 2012: ROUNDTABLE 2014: Burning Down the House, curated by Jessica Morgan, Fatoş Üstek and Emiliano Valdes 2016: The Eighth Climate (What does art do?) 2018: Imagined Borders 2021: Minds Rising Spirits Tuning, curated by Defne Ayas and Natasha Ginwala 2023: Soft and Weak Like Water, curated by Sook-Kyung Lee, Kerryn Greenberg, Sooyoung Leam and Harry C. H.",
    facts: [
      "The Gwangju Biennale is a contemporary art biennale founded in September 1995 in Gwangju, South Jeolla province, South Korea.",
      "The Gwangju Biennale Foundation also hosts the Gwangju Design Biennale, founded in 2004.",
      "In 2026, the Chinese government compelled Chinese artists to boycott the event due to the use of the name \"Taiwan Pavilion\" to represent Taiwan’s National Taiwan Museum of Fine Arts.",
      "Choi 2024: Pansori, a soundscape of the 21st century, curated by Nicolas Bourriaud 2026: You Must Change Your Life, directed by Ho Tzu Nyen with assistant curation by Che Kyongfa, Park Gahee, and Brian Kuan Wood == References == == External links == Official website",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 81,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Gwangju Biennale",
    },
  },
  {
    slug: "war-memorial-opera-house",
    name: "War Memorial Opera House",
    subtitle: "Catalogue entry",
    description:
      "The War Memorial Opera House is an opera house in San Francisco, California, United States, located on the western side of Van Ness Avenue across from the west side/rear facade of San Francisco City Hall. It is part of the San Francisco War Memorial and Performing Arts Center. The architects of the building complex were Arthur Brown Jr., who had also designed the adjacent San Francisco City Hall between 1912 and 1916, and G. Albert Lansburgh, a theater designer responsible for San Francisco's Orpheum and the Shrine Auditorium in Los Angeles.",
    facts: [
      "It has been the home of the San Francisco Opera since opening night in 1932.",
      "It was the site of the San Francisco Conference, the first assembly of the newly organized United Nations in April 1945.",
      "It was also where the Treaty of San Francisco was signed, which reestablished peaceful relations between Japan and the Allies after World War II in September 1951.",
      "== Architecture == In 1927, $4 million in municipal bonds were issued to finance the design and construction of the first municipally owned opera house in the United States.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 82,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — War Memorial Opera House",
    },
  },
  {
    slug: "opera-house",
    name: "Opera house",
    subtitle: "Catalogue entry",
    description:
      "An opera house is a theater building used for performances of opera. Like many theaters, it usually includes a stage, an orchestra pit, audience seating, backstage facilities for costumes and building sets, as well as offices for the institution's administration. While some venues are constructed specifically for operas, other opera houses are part of larger performing arts centers. Indeed, the term opera house is often used as a term of prestige for any large performing arts center.",
    facts: [
      "== History == === Greco-Roman antiquity === Based on Aristoxenus's musical system, and paying homage to the architects of ancient Greek theater, Vitruvius described, in the 1st century BC, in his treatise De architectura, the ideal acoustics of theaters.",
      "The Jeu de Daniel (\"Play of Daniel\") was a sung play, characteristic of the medieval Renaissance of the 12th century.",
      "In the 15th century, sung theater of a religious nature found a special place in the mystery plays performed on cathedral squares.",
      "Secular musical theater also existed, but had a more popular and intimate aspect (see, for example, Adam de la Halle's Jeu de Robin et Marion (\"Play of Robin and Marion\"), in the 13th century).",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 83,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Opera house",
    },
  },
  {
    slug: "theatre",
    name: "Theatre",
    subtitle: "Catalogue entry",
    description:
      "Theatre or theater is a collaborative form of performing art that uses live performers, usually actors, to present experiences of a real or imagined event before a live audience in a specific place, often a stage. The performers may communicate this experience to the audience through combinations of gesture, speech, song, music, and dance. It is the oldest form of drama, though live theatre has now been joined by modern recorded forms. Elements of art, such as painted scenery and stagecraft such as lighting are used to enhance the physicality, presence and immediacy of the experience.",
    facts: [
      "The origins of theatre in ancient Greece, according to Aristotle (384–322 BCE), the first theoretician of theatre, are to be found in the festivals that honoured Dionysus.",
      "The performances were given in semi-circular auditoria cut into hillsides, capable of seating 10,000–20,000 people.",
      "Having emerged sometime during the 6th century BCE, it flowered during the 5th century BCE (from the end of which it began to spread throughout the Greek world), and continued to be popular until the beginning of the Hellenistic period.",
      "No tragedies from the 6th century BCE and only 32 of the more than a thousand that were performed in during the 5th century BCE have survived.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 84,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Theatre",
    },
  },
  {
    slug: "regions-bank-building",
    name: "Regions Bank building",
    subtitle: "Catalogue entry",
    description:
      "Corporate Headquarters Regions Center (Little Rock) in Little Rock, Arkansas Regions-Harbert Plaza in Birmingham, Alabama Regions Plaza (Atlanta, Georgia) Regions Plaza (Jackson, Mississippi) Regions Tower in Shreveport, Louisiana. Regions Tower in Indianapolis, Indiana One Nashville Place in Nashville, Tennessee Regions Bank Building (Jackson, Mississippi) in Jackson, Mississippi.",
    facts: [
      "Regions Bank building can refer to a number of buildings currently, formerly, or unofficially named for Regions Bank: 100 North Tampa, previously the Regions Building, in Tampa, Florida Regions Bank Building (Mobile) in Mobile, Alabama Regions Center (Birmingham) in Birmingham, Alabama.",
      "Regions 615 in Charlotte, North Carolina Regions Bank Building in Orlando, Florida",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 85,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Regions Bank building",
    },
  },
  {
    slug: "bank",
    name: "Bank",
    subtitle: "Catalogue entry",
    description:
      "A bank is a financial institution that accepts deposits from the public and creates a demand deposit while making loans. Lending activities can be directly performed by the bank or indirectly through capital markets. Banks play an important role in financial stability and the economy of a country, so most countries exercise a high degree of regulation over banks. Most countries have institutionalized a system known as fractional-reserve banking, under which banks hold liquid assets equal to only a portion of their current liabilities.",
    facts: [
      "Banking in its modern sense evolved in the 14th century in the prosperous cities of Renaissance Italy but, in many ways, functioned as a continuation of ideas and concepts of credit and lending that have their roots in the ancient world.",
      "The oldest existing retail bank is Banca Monte dei Paschi di Siena (founded in 1472), while the oldest existing merchant bank is Berenberg Bank (founded in 1590).",
      "In the past 20 years, American banks have taken many measures to ensure that they remain profitable while responding to increasingly changing market conditions.",
      "The organization would provide these services from the 12th century until their disbandment in the early 14th century.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 86,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Bank",
    },
  },
  {
    slug: "us-bank-tower",
    name: "U.S. Bank Tower (Los Angeles)",
    subtitle: "Catalogue entry",
    description:
      "U.S. The building was designed by Henry N. It is one of the most recognizable buildings in Los Angeles, and often appears in establishing shots for the city in films and television programs. == Ownership == U.S.",
    facts: [
      "Bank Tower, known locally as the Library Tower and formerly as the First Interstate Bank World Center, is a 1,018-foot (310.3 m) skyscraper located in the Financial District of downtown Los Angeles, California.",
      "Construction of the tower began in 1987 with completion in 1989.",
      "Cobb of the architectural firm Pei Cobb Freed & Partners and cost $350 million to build.",
      "The building is, by structural height, the third-tallest building in California, the second-tallest building in Los Angeles, and the 24th-tallest building in the United States.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 87,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — U.S. Bank Tower (Los Angeles)",
    },
  },
  {
    slug: "kyoto-shiyakusho-mae-kyoto-city-hall-sta",
    name: "Kyoto Shiyakusho-mae Station",
    subtitle: "Catalogue entry",
    description:
      "Kyoto Shiyakusho-mae Station (京都市役所前駅 Kyōto shiyakusho-mae eki) is a stop on the Tozai Line of Kyoto Municipal Subway in Kyoto, Japan. It is in Nakagyo-ku. Because it lies beneath the Kawaramachi-Oike intersection, the station also carries signs with the name Kawaramachi Oike. The station has one island platform serving two tracks.",
    facts: [
      "With the station number designation T12, its station color is kara kurenai.",
      "== History == The Kyoto Shiyakusho-mae Station opened on October 12, 1997, date when the Tōzai line initiated operations between Daigo Station and Nijō Station.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 88,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Kyoto Shiyakusho-mae Station",
    },
  },
  {
    slug: "los-angeles-city-hall",
    name: "Los Angeles City Hall",
    subtitle: "Catalogue entry",
    description:
      "== History == The building was designed by John Parkinson, John C. Austin, and Albert C. Dedication ceremonies were held on April 26, 1928. It has 32 floors and, at 454 feet (138 m) high, is the tallest base-isolated structure in the world, having undergone a seismic retrofit from 1998 to 2001, so that the building will sustain minimal damage and remain functional after a magnitude 8.2 earthquake.",
    facts: [
      "Los Angeles City Hall, completed in 1928, is the center of the government of the city of Los Angeles, California, and houses the mayor's office and the meeting chambers and offices of the Los Angeles City Council.",
      "It is located in the Civic Center district of downtown Los Angeles in the city block bounded by Main, Temple, First, and Spring streets, which was the heart of the city's central business district during the 1880s and 1890s.",
      "It was the tallest building in Los Angeles from 1928 until 1966 and remains the tallest base-isolated structure in the world.",
      "Martin, Sr., and was completed in 1928.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 89,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Los Angeles City Hall",
    },
  },
  {
    slug: "city",
    name: "City",
    subtitle: "Catalogue entry",
    description:
      "A city is a human settlement of a substantial size. The term \"city\" has different meanings around the world and in some places the settlement can be very small. Even where the term is limited to larger settlements, there is no universally agreed definition of the lower numerical boundary for their size. In a more specific sense, a city can be defined as a permanent and densely populated place with administratively defined boundaries whose members work primarily on non-agricultural tasks.",
    facts: [
      "Because of these major influences on global issues, the international community has prioritized investment in sustainable cities through Sustainable Development Goal 11.",
      "== Meaning == === Urban settlements === Common population definitions for an urban area (city or town) range between minimum values of 1,500 and 50,000 people, with most U.S.",
      "states using a minimum between 1,500 and 5,000 inhabitants.",
      "==== Population size, density ==== The degree of urbanization is a modern metric to help define what comprises a city: \"a population of at least 50,000 inhabitants in contiguous dense grid cells (>1,500 inhabitants per square kilometer)\".",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — City",
    },
  },
  {
    slug: "catholic-church",
    name: "Catholic Church",
    subtitle: "Catalogue entry",
    description:
      "The largest one of these churches is the Latin Church. Throughout history, the church has had a large role in the development of Western civilization. Catholic communities are present worldwide through missions, immigration, and conversions. The majority of Catholics live in the Global South, reflecting rapid demographic growth in Africa, Asia, and Latin America, as well as secularization in parts of Europe and North America.",
    facts: [
      "The Catholic Church (Latin: Ecclesia Catholica), also called the Roman Catholic Church (Latin: Ecclesia Catholica Romana), is the largest Christian church, with an estimated 1.28 to 1.41 billion baptized members worldwide as of 2026.",
      "It consists of 24 autonomous (sui iuris) churches.",
      "Besides it, there are 23 smaller Eastern Catholic Churches.",
      "Together, the Latin Church and Eastern Catholic churches are organized into nearly 3,500 dioceses and eparchies governed by bishops.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 51,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Catholic Church",
    },
  },
  {
    slug: "roman-temple",
    name: "Roman temple",
    subtitle: "Catalogue entry",
    description:
      "Ancient Roman temples were among the most important buildings in Roman culture, and some of the richest buildings in Roman architecture, though only a few survive in any sort of complete state. Today they remain \"the most obvious symbol of Roman architecture\". Their construction and maintenance was a major part of ancient Roman religion, and all towns of any importance had at least one main temple, as well as smaller shrines. The main room (cella) housed the cult image of the deity to whom the temple was dedicated, and often a table for supplementary offerings or libations and a small altar for incense.",
    facts: [
      "The decline of Roman religion was relatively slow, and the temples themselves were not appropriated by the government until a decree of the Emperor Honorius in 415.",
      "Santi Cosma e Damiano, in the Roman Forum, originally the Temple of Romulus, was not dedicated as a church until 527.",
      "For example, the \"Temple of Dionysus\" on the terrace by the theatre at Pergamon (Ionic, 2nd century BC, on a hillside), had many steps in front, and no columns beyond the portico.",
      "After the eclipse of the Etruscan models, the Greek classical orders in all their details were closely followed in the façades of Roman temples, as in other prestigious buildings, with the direct adoption of Greek models apparently beginning around 200 BC, under the late Republic.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Roman temple",
    },
  },
  {
    slug: "lotus-temple",
    name: "Lotus Temple",
    subtitle: "Catalogue entry",
    description:
      "The Lotus Temple, also known as the Baháʼí House of Worship, New Delhi, is a Baháʼí House of Worship at Bahapur in south Delhi, India. Construction by the ECC Construction Group of Larsen & Toubro, to a structural design by the London engineers Flint & Neill, ran from 1980 to 1986. The temple is among the most visited sites in India, drawing more than five million visitors a year and, by 2014, more than 100 million in all. Reviewers compared it with the Sydney Opera House on its completion, and it received awards from bodies including the Institution of Structural Engineers and the American Concrete Institute.",
    facts: [
      "Designed by the architect Fariborz Sahba, it takes the form of a half-open lotus of 27 free-standing marble-clad concrete petals, arranged in three rings of nine around a central hall.",
      "It was dedicated on 24 December 1986 and opened to the public on 1 January 1987.",
      "Baháʼís in India first sought permission for a House of Worship in 1920, and the land at Bahapur was bought in 1954 under a plan set by Shoghi Effendi.",
      "On 1 April 1974, the Universal House of Justice led plans for its development as part of a Baháʼí Five Year Plan.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Lotus Temple",
    },
  },
  {
    slug: "chinese-temple",
    name: "Chinese temple",
    subtitle: "Catalogue entry",
    description:
      "Chinese temples are structures used as place of worship of Chinese Buddhism, Taoism, Confucianism, or Chinese folk religion, where people revere ethnic Chinese gods and ancestors. They can be classified as: miào (廟) or diàn (殿), simply means \"temple\" and mostly enshrines gods of the Chinese pantheon, such as the Dragon King, Tudigong or Matsu; or mythical or historical figures, such as Guandi or Shennong. cí (祠), cítáng (祠堂), zōngcí (宗祠) or zǔmiào (祖廟), referring to ancestral temples, mostly enshrining the ancestral gods of a family or clan. Taoist temples and monasteries: 觀 guàn or 道觀 dàoguàn; and Chinese Buddhist temples and monasteries: 寺 sì or 寺院 sìyuàn Temple of Confucius which usually functions as both temple and town school: 文廟 wénmiào or 孔廟 kŏngmiào.",
    facts: [
      "== History == In 1898, Kang Youwei persuaded the Emperor to issue an edict confiscating folk religion temples which were not performing state sacrifices and turn them into schools.",
      "Beginning in 1901, and more so after 1904, local officials and reform activists seized temple land and infrastructure to build schools, self-administration bureaus, barracks, police stations, post offices, and other newly mandated public buildings.",
      "The 1928 \"Standards for retaining or abolishing gods and shrines\" formally abolished all cults of gods with the exception of human heroes such as Yu the Great, Guan Yu and Confucius.",
      "After 1928, the ROC campaign to against folk religion temples became more intense, particularly in north China, and increasingly emphasized the physical destruction of temples.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Chinese temple",
    },
  },
  {
    slug: "mosque",
    name: "Mosque",
    subtitle: "Catalogue entry",
    description:
      "A mosque ( MOSK), also called a masjid ( MASS-jid, MUSS-), is a place of worship for Muslims. The term usually refers to a covered building, but can be any place where Islamic prayers are performed, such as an outdoor courtyard. Originally, mosques were simple places of prayer for the early Muslims, and may have been open spaces rather than elaborate buildings. It is typical of mosque buildings to have a special ornamental niche (a mihrab) set into the wall in the direction of the city of Mecca (the qibla), which Muslims must face during prayer, as well as a facility for ritual cleansing (wudu).",
    facts: [
      "In the first stage of Islamic architecture (650–750 CE), early mosques comprised open and closed covered spaces enclosed by walls, often with minarets, from which the Islamic call to prayer was issued on a daily basis.",
      "== History == === Origins === Islam was established in Arabia during the lifetime of Muhammad in the 7th century CE.",
      "The first mosque in history could be either the sanctuary built around the Ka'bah in Mecca, known today as Al-Masjid al-Haram ('The Sacred Mosque'), or the Quba Mosque in Medina, the first structure built by Muhammad upon his emigration from Mecca in 622 CE, both located in the Hejaz region in present-day Saudi Arabia.",
      "Since as early as 638 CE, the Sacred Mosque of Mecca has been expanded on several occasions to accommodate the increasing number of Muslims who either live in the area or make the annual pilgrimage known as Hajj to the city.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mosque",
    },
  },
  {
    slug: "chinese-pagoda",
    name: "Pagoda",
    subtitle: "Catalogue entry",
    description:
      "A pagoda is a tiered tower with multiple eaves, common across Asia. Most pagodas were built to have a religious function, most often Buddhist, but sometimes Taoist or Hindu, and were often in or near viharas. The pagoda traces its origins to the stupa, while its design was developed in ancient India. Chinese pagodas (Chinese: 塔; pinyin: Tǎ) are a traditional part of Chinese architecture.",
    facts: [
      "Most have between three and 13 tiers (almost always an odd number) and the classic gradual tiered eaves.",
      "== Etymology == Variants of the term pagoda across all European languages derive directly or indirectly from 16th-century Portuguese pagode, originally in specific reference to Hindu temples of southwestern India along the Malabar Coast and their main idols.",
      "== History == The origin of the pagoda can be traced to the stupa (3rd century BCE).",
      "Japan has a total of 22 five-storied timber pagodas constructed before 1850.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 56,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Pagoda",
    },
  },
  {
    slug: "ruiguang-pagoda",
    name: "Pan Gate",
    subtitle: "Catalogue entry",
    description:
      "Pan Gate, Panmen, or Panmen Gate is a historical landmark in Suzhou, Jiangsu Province, China. It consists of a section of the old Suzhou City Wall that includes two separate gates, one opening to a road for pedestrian and vehicular traffic and another opening to a canal for waterborne vessels. It is thus sometimes known as Suzhou's Land and Water Gate. Pan Gate at the southwest corner of the city's central historic district, with the water gate connecting the city's inner canals and former defensive moat with the nearby Grand Canal.",
    facts: [
      "== History == A gate has stood at the location since the construction of the city wall of Wu in 514 bc, during the Spring and Autumn Period of the later Zhou dynasty.",
      "1351 during the 11th year of the reign of Ukhaatu Khan, the Zhizheng Emperor of the Yuan dynasty.",
      "Originally dating to ad 247, the Ruiguang Pagoda is the oldest of the city's pagodas, constructed of brick walls with wooden platforms at each floor.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Pan Gate",
    },
  },
  {
    slug: "rand-tower",
    name: "Rand Tower Hotel",
    subtitle: "Catalogue entry",
    description:
      "== History == The Rand Tower Hotel was designed by Holabird & Root for Rufus Rand, a World War I aviator who was part of the family that owned the Minneapolis Gas Company (Minnegasco), now part of CenterPoint Energy. Rand had flown in the Lafayette Flying Corps during the war. Much of the building is covered in Art Deco ornamentation that follows an aviation theme and there is a sculpture Wings in the lobby by Oskar J. W.",
    facts: [
      "Rand Tower Hotel is a 26-story high rise hotel in Minneapolis, Minnesota, United States.",
      "It was one of the city's tallest structures when it was completed as an office building in 1929.",
      "It was converted to a hotel in 2020.",
      "A skyway was attached to the building in 1969.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 58,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Rand Tower Hotel",
    },
  },
  {
    slug: "northwestern-mutual-tower",
    name: "Northwestern Mutual Tower and Commons",
    subtitle: "Catalogue entry",
    description:
      "The grand opening was on August 21, 2017. At 554 feet (169 m), the Northwestern Mutual Tower and Commons is the second-tallest building in Milwaukee. In October 2015, Northwestern Mutual announced plans to build a 34-story residential tower with retail and parking in downtown Milwaukee. 7Seventy7 was completed in 2018.",
    facts: [
      "The Northwestern Mutual Tower and Commons is a 554-foot, 32-story skyscraper located at 805 East Mason Street in Milwaukee, Wisconsin.",
      "On September 25, 2013, Northwestern Mutual unveiled the design for its new office tower.",
      "The company's former 16-story building was demolished to make room for the new tower.",
      "The new tower was completed in 2017 at an estimated cost of $450 million.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Northwestern Mutual Tower and Commons",
    },
  },
  {
    slug: "3-world-trade-center",
    name: "3 World Trade Center",
    subtitle: "Catalogue entry",
    description:
      "The tower is located on Greenwich Street along the eastern side of the World Trade Center site. The building was designed by Rogers Stirk Harbour + Partners, and is managed by Silverstein Properties through a ground lease with the Port Authority of New York and New Jersey (PANYNJ), the landowner. The original building was the Marriott World Trade Center, a 22-story, 825-room hotel located in the southwest corner of the World Trade Center complex. Opened in July 1981 as the Vista International Hotel, it was destroyed during the September 11 attacks in 2001, along with the rest of the World Trade Center.",
    facts: [
      "3 World Trade Center (3 WTC; also known as 175 Greenwich Street) is a skyscraper constructed as part of the new World Trade Center in Lower Manhattan, New York City.",
      "It is 1,079 ft (329 m) high, with 80 stories.",
      "As of 2025, it is the tenth-tallest building in the city.",
      "The current edifice is the second on the World Trade Center site to bear the address 3 World Trade Center.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — 3 World Trade Center",
    },
  },
  {
    slug: "metlife-building",
    name: "MetLife Building",
    subtitle: "Catalogue entry",
    description:
      "The MetLife Building contains an elongated octagonal massing with the longer axis perpendicular to Park Avenue. The building sits atop two levels of railroad tracks leading into Grand Central Terminal. The facade is one of the first precast concrete exterior walls in a building in New York City. In the lobby is a pedestrian passage to Grand Central's Main Concourse, a lobby with artwork, and a parking garage at the building's base.",
    facts: [
      "The MetLife Building (also 200 Park Avenue and formerly the Pan Am Building) is a skyscraper at Park Avenue and 45th Street, north of Grand Central Terminal, in the Midtown Manhattan neighborhood of New York City, New York, U.S.",
      "Designed in the International style by Richard Roth, Walter Gropius, and Pietro Belluschi and completed in 1962, the MetLife Building is 808 feet (246 m) tall with 59 stories.",
      "It was advertised as the world's largest commercial office space by square footage at its opening, with 2.4 million square feet (220,000 m2) of usable office space.",
      "As of November 2022, the MetLife Building remains one of the 100 tallest buildings in the United States.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — MetLife Building",
    },
  },
  {
    slug: "cottage",
    name: "Cottage",
    subtitle: "Catalogue entry",
    description:
      "A cottage during England's feudal period was the holding by a cottager (known as a cotter or bordar) of a small house with enough garden to feed a family and in return for the cottage, the cottager had to provide some form of service to the manorial lord. However, in time cottage just became the general term for a small house. In modern usage, a cottage is usually a modest, often cosy dwelling, typically in a rural or semi-rural location and not necessarily in England. In British English the term now denotes a small, cosy dwelling of traditional build, although it can also be applied to modern construction designed to resemble traditional houses (\"mock cottages\").",
    facts: [
      "The cottage orné, often quite large and grand residences built by the nobility, dates back to a movement of \"rustic\" stylised cottages of the late 18th and early 19th century during the Romantic movement.",
      "Examples of this may be found in 15th century manor court rolls.",
      "=== Industrial Revolution === In England from about the 18th century onwards, the development of industry led to the development of weavers' cottages and miners' cottages.",
      "Friedrich Engels cites 'Cottages' as a poor quality dwelling in his 1845 work The Condition of the Working Class in England.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 62,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Cottage",
    },
  },
  {
    slug: "house",
    name: "House",
    subtitle: "Catalogue entry",
    description:
      "A house is a residential building. It may range in complexity from a rudimentary hut to a complex structure of wood, masonry, concrete or other material, outfitted with plumbing, electrical, and heating, ventilation, and air conditioning systems. Houses use a range of different roofing systems to keep precipitation such as rain from getting into the dwelling space. Houses generally have doors or locks to secure the dwelling space and protect its inhabitants and contents from burglars or other trespassers.",
    facts: [
      "During the 15th and 16th centuries, the Italian Renaissance Palazzo consisted of plentiful rooms of connectivity.",
      "An early example of the segregation of rooms and consequent enhancement of privacy may be found in 1597 at the Beaufort House built in Chelsea, London.",
      "English architect Sir Roger Pratt states \"the common way in the middle through the whole length of the house, [avoids] the offices from one molesting the other by continual passing through them.\" Social hierarchies within the 17th century were highly regarded, as architecture was able to epitomize the servants and the upper class.",
      "More privacy is offered to the occupant as Pratt further claims, \"the ordinary servants may never publicly appear in passing to and fro for their occasions there.\" This social divide between rich and poor favored the physical integration of the corridor into housing by the 19th century.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — House",
    },
  },
  {
    slug: "union-carbide-building",
    name: "270 Park Avenue (1960–2021)",
    subtitle: "Catalogue entry",
    description:
      "At the time of its destruction, the Union Carbide Building was the tallest voluntarily demolished building in the world, and it remains the tallest voluntarily demolished building in the United States. The building occupied a full city block bounded by Madison Avenue, 48th Street, Park Avenue, and 47th Street. It was composed of two sections: a 52-story tower facing Park Avenue to the east and a 12-story annex facing Madison Avenue to the west, both surrounded by public plazas. About two-thirds of 270 Park Avenue was built over two levels of underground railroad tracks, which feed directly into Grand Central Terminal to the south.",
    facts: [
      "270 Park Avenue, also known as the JPMorgan Chase Tower and the Union Carbide Building, was a skyscraper in the Midtown Manhattan neighborhood of New York City, United States.",
      "Built in 1960 for chemical company Union Carbide, it was designed by the architects Gordon Bunshaft and Natalie de Blois of Skidmore, Owings & Merrill (SOM).",
      "The 52-story, 707-foot (215 m) skyscraper later became the global headquarters for JPMorgan Chase.",
      "It was demolished in 2021 to make way for a taller skyscraper at the same address.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 64,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — 270 Park Avenue (1960–2021)",
    },
  },
  {
    slug: "wath-hall",
    name: "Wath Hall",
    subtitle: "Catalogue entry",
    description:
      "Wath Hall is a former private residence and former municipal structure in Church Street, Wath upon Dearne, South Yorkshire, England. The hall, which was the headquarters of Wath upon Dearne Urban District Council, is a Grade II listed building. The design involved a symmetrical main frontage with five bays facing onto Church Street; the central section of three bays, which slightly projected forward, featured a panelled door with a fanlight flanked by two Ionic order columns supporting a frieze and a modillioned cornice. There were sash windows in the other bays on the ground floor as well as in the bays on the first floor and a parapet at roof level.",
    facts: [
      "== History == The area occupied by the town hall was originally the site of a manor house built for the Fleming family in the 14th century.",
      "Reiner le Fleming, who was lord of the manor of Wath upon Dearne, founded Kirklees Priory in 1155 during the reign of King Henry II.",
      "The current building was designed in the neoclassical style as a private residence, built in red brick rendered with cement and completed in 1770.",
      "The building was the home of a medical doctor, William Kaye, in the late 18th century.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 65,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Wath Hall",
    },
  },
  {
    slug: "water-treatment-plant",
    name: "Water treatment",
    subtitle: "Catalogue entry",
    description:
      "Water treatment is any process that improves the quality of water to make it appropriate for a specific end-use. The end use may be drinking, industrial water supply, irrigation, river flow maintenance, water recreation or many other uses, including being safely returned to the environment. Water treatment removes contaminants and undesirable components, or reduces their concentration so that the water becomes fit for its desired end-use. This treatment is crucial to human health and allows humans to benefit from both drinking and irrigation use.",
    facts: [
      "China adopted its own drinking water standard GB3838-2002 (Type II) enacted by Ministry of Environmental Protection in 2002.",
      "Such designs may employ solar water disinfection methods, using solar irradiation to inactivate harmful waterborne microorganisms directly, mainly by the UV-A component of the solar spectrum, or indirectly through the presence of an oxide photocatalyst, typically supported TiO2 in its anatase or rutile phases.",
      "In California, more than 4% of the state's electricity consumption goes towards transporting moderate quality water over long distances, treating that water to a high standard.",
      "A 2021 study found that a large-scale water chlorination program in urban areas of Mexico massively reduced childhood diarrheal disease mortality rates.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 66,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Water treatment",
    },
  },
  {
    slug: "tower-koshki",
    name: "Tower",
    subtitle: "Catalogue entry",
    description:
      "A tower is a tall structure, taller than it is wide, often by a significant factor. Towers are distinguished from masts by their lack of guy-wires and are therefore, along with tall buildings, self-supporting structures. Towers are specifically distinguished from buildings in that they are built not to be habitable but to serve other functions using the height of the tower. For example, the height of a clock tower improves the visibility of the clock, and the height of a tower in a fortified building such as a castle increases the visibility of the surroundings for defensive purposes.",
    facts: [
      "With the Lydian toponyms Τύρρα, Τύρσα, it has been connected with the ethnonym Τυρρήνιοι as well as with Tusci (from *Turs-ci), the Greek and Latin names for the Etruscans (Kretschmer Glotta 22, 110ff.) == History == Towers have been used by humankind since prehistoric times.",
      "The oldest known may be the circular stone tower in walls of Neolithic Jericho (8000 BC).",
      "Some of the earliest towers were ziggurats, which existed in Sumerian architecture since the 4th millennium BC.",
      "The most famous ziggurats include the Sumerian Ziggurat of Ur, built in the 3rd millennium BC, and the Etemenanki, one of the most famous examples of Babylonian architecture.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 67,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Tower",
    },
  },
  {
    slug: "hangar",
    name: "Hangar",
    subtitle: "Catalogue entry",
    description:
      "A hangar is a building or structure designed to hold aircraft or spacecraft. Hangars are built of metal, wood, or concrete. The word hangar comes from Middle French hanghart (\"enclosure near a house\"), of Germanic origin, from Frankish *haimgard (\"home-enclosure\", \"fence around a group of houses\"), from *haim (\"home, village, hamlet\") and gard (\"yard\"). The term, gard, comes from the Old Norse garðr (\"enclosure, garden\").",
    facts: [
      "== History == The Wright brothers stored and repaired their aircraft in a wooden hangar constructed in 1902 at Kill Devil Hills in North Carolina for their glider.",
      "Carl Richard Nyberg used a hangar to store his 1908 Flugan (fly) in the early 20th century and in 1909, Louis Bleriot crash-landed on a northern French farm in Les Baraques (between Sangatte and Calais) and rolled his monoplane into the farmer's cattle pen.",
      "These were built in 1910 for the Bristol School of Flying and are now Grade II* Listed buildings.",
      "British aviation pioneer Alliott Verdon Roe built one of the first aeroplane sheds in 1907 at Brooklands, Surrey and full-size replicas of this and the 1908 Roe biplane are on display at Brooklands Museum.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 68,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hangar",
    },
  },
  {
    slug: "hangar-midpoly-building-kit",
    name: "Hangar",
    subtitle: "Catalogue entry",
    description:
      "A hangar is a building or structure designed to hold aircraft or spacecraft. Hangars are built of metal, wood, or concrete. The word hangar comes from Middle French hanghart (\"enclosure near a house\"), of Germanic origin, from Frankish *haimgard (\"home-enclosure\", \"fence around a group of houses\"), from *haim (\"home, village, hamlet\") and gard (\"yard\"). The term, gard, comes from the Old Norse garðr (\"enclosure, garden\").",
    facts: [
      "== History == The Wright brothers stored and repaired their aircraft in a wooden hangar constructed in 1902 at Kill Devil Hills in North Carolina for their glider.",
      "Carl Richard Nyberg used a hangar to store his 1908 Flugan (fly) in the early 20th century and in 1909, Louis Bleriot crash-landed on a northern French farm in Les Baraques (between Sangatte and Calais) and rolled his monoplane into the farmer's cattle pen.",
      "These were built in 1910 for the Bristol School of Flying and are now Grade II* Listed buildings.",
      "British aviation pioneer Alliott Verdon Roe built one of the first aeroplane sheds in 1907 at Brooklands, Surrey and full-size replicas of this and the 1908 Roe biplane are on display at Brooklands Museum.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 69,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hangar",
    },
  },
  {
    slug: "hangar-highpoly-building-kit",
    name: "Hangar",
    subtitle: "Catalogue entry",
    description:
      "A hangar is a building or structure designed to hold aircraft or spacecraft. Hangars are built of metal, wood, or concrete. The word hangar comes from Middle French hanghart (\"enclosure near a house\"), of Germanic origin, from Frankish *haimgard (\"home-enclosure\", \"fence around a group of houses\"), from *haim (\"home, village, hamlet\") and gard (\"yard\"). The term, gard, comes from the Old Norse garðr (\"enclosure, garden\").",
    facts: [
      "== History == The Wright brothers stored and repaired their aircraft in a wooden hangar constructed in 1902 at Kill Devil Hills in North Carolina for their glider.",
      "Carl Richard Nyberg used a hangar to store his 1908 Flugan (fly) in the early 20th century and in 1909, Louis Bleriot crash-landed on a northern French farm in Les Baraques (between Sangatte and Calais) and rolled his monoplane into the farmer's cattle pen.",
      "These were built in 1910 for the Bristol School of Flying and are now Grade II* Listed buildings.",
      "British aviation pioneer Alliott Verdon Roe built one of the first aeroplane sheds in 1907 at Brooklands, Surrey and full-size replicas of this and the 1908 Roe biplane are on display at Brooklands Museum.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 70,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hangar",
    },
  },
  {
    slug: "control-tower",
    name: "Air traffic control",
    subtitle: "Catalogue entry",
    description:
      "Air traffic control (ATC) is a service provided by ground-based air traffic controllers who direct aircraft on the ground and through controlled airspace. The primary purpose of ATC is to prevent collisions, organise and expedite the flow of air traffic, and provide information and other support for pilots. In some countries, ATC can also provide advisory services to aircraft in non-controlled airspace. Controllers monitor the location of aircraft in their assigned airspace using radar and communicate with pilots by radio.",
    facts: [
      "== History == In 1920, Croydon Airport near London, England, was the first airport in the world to introduce air traffic control.",
      "The 'aerodrome control tower' was a wooden hut 15 feet (5 metres) high with windows on all four sides.",
      "It was commissioned on 25 February 1920, and provided basic traffic, weather, and location information to pilots.",
      "The first of several air mail radio stations (AMRS) was created in 1922, after World War I, when the U.S.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 71,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Air traffic control",
    },
  },
  {
    slug: "air-traffic-control-tower",
    name: "Air traffic control",
    subtitle: "Catalogue entry",
    description:
      "Air traffic control (ATC) is a service provided by ground-based air traffic controllers who direct aircraft on the ground and through controlled airspace. The primary purpose of ATC is to prevent collisions, organise and expedite the flow of air traffic, and provide information and other support for pilots. In some countries, ATC can also provide advisory services to aircraft in non-controlled airspace. Controllers monitor the location of aircraft in their assigned airspace using radar and communicate with pilots by radio.",
    facts: [
      "== History == In 1920, Croydon Airport near London, England, was the first airport in the world to introduce air traffic control.",
      "The 'aerodrome control tower' was a wooden hut 15 feet (5 metres) high with windows on all four sides.",
      "It was commissioned on 25 February 1920, and provided basic traffic, weather, and location information to pilots.",
      "The first of several air mail radio stations (AMRS) was created in 1922, after World War I, when the U.S.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 72,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Air traffic control",
    },
  },
  {
    slug: "jolteon",
    name: "List of generation I Pokémon",
    subtitle: "Catalogue entry",
    description:
      "Later, Pokémon Yellow and Blue were released in Japan. Alternate forms that result in type changes are included for convenience. Mega evolutions and regional forms are included on the pages for the generation in which they were introduced. MissingNo., a glitch, is also on this list.",
    facts: [
      "The first generation (generation I) of the Pokémon franchise features the original 151 fictional species of monsters introduced to the core video game series in the 1996 Game Boy games Pocket Monsters Red, Green and Blue (known as Pokémon Red, Green and Blue outside of Japan).",
      "The following list details the 151 Pokémon of generation I in order of their National Pokédex number.",
      "The first Pokémon, Bulbasaur, is number 0001 and the last, Mew, is number 0151.",
      "Developed by Game Freak and published by Nintendo, the Japanese franchise began in 1996 with the video games Pokémon Red and Green for the Game Boy, which were later released in North America as Pokémon Red and Blue in 1998.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 73,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — List of generation I Pokémon",
    },
  },
  {
    slug: "fire-station-no-1",
    name: "Fire Station No. 1",
    subtitle: "Catalogue entry",
    description:
      "Fire Station No. 1, and variations, may refer to: in Australia No. 1 (Muncie, Indiana), NRHP-listed Des Moines Fire Department Headquarters' Fire Station No. 1 and Shop Building, Des Moines, Iowa, NRHP-listed Fire House No.",
    facts: [
      "1 Fire Station (Perth, Western Australia), a historic fire station in Australia in the United States Fayetteville Fire Department Fire Station 1, Fayetteville, Arkansas, listed on the National Register of Historic Places (NRHP) Fire Station No.",
      "1 (Los Angeles, California), List of Los Angeles Historic-Cultural Monuments on the East and Northeast Sides Santa Ana Fire Station Headquarters No.",
      "1, Santa Ana, California, NRHP-listed Engine Company 1 Fire Station, Hartford, Connecticut, NRHP-listed Fire Station No.",
      "1 (Denver, Colorado), NRHP-listed Engine Company Number One (Augusta, Georgia), NRHP-listed Fire Station No.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 74,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Fire Station No. 1",
    },
  },
  {
    slug: "car-wash",
    name: "Car wash",
    subtitle: "Catalogue entry",
    description:
      "A car wash, or auto wash, is a facility used to clean the exterior, and in some cases the interior, of cars. Car washes can be self-service, full-service (with attendants who wash the vehicle), or fully automated (possibly connected to a filling station). Car washes may also be events where people pay to have their cars washed by volunteers, often using less specialized equipment, as a fundraiser. == History == The first U.S.",
    facts: [
      "patent for a mechanized car wash was filed in 1900 and soon followed by \"auto laundries\".",
      "The Automobile Laundry in Detroit, Michigan, opened in 1914 by Frank McCormick and J.W.",
      "Manual car wash operations, which used manpower to push or move the cars through stages, peaked at 32 drive-through facilities in the United States.",
      "The first semi-automatic car wash in the United States debuted in 1946 at a facility in Detroit, which used automatic pulley systems and manual brushing.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 75,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Car wash",
    },
  },
  {
    slug: "verres-castle",
    name: "Verrès Castle",
    subtitle: "Catalogue entry",
    description:
      "It has been called one of the most impressive buildings from the Middle Ages in the area. Built as a military fortress by Yblet de Challant in the fourteenth century, it was one of the first examples of a castle constructed as a single structure rather than as a series of buildings enclosed in a circuit wall. The castle stands on a rocky promontory on the opposite side of the Dora Baltea from Issogne Castle. The castle dominates the town of Verrès and the access to the Val d'Ayas.",
    facts: [
      "Verrès Castle (Italian: Castello di Verrès, French: Château de Verrès) is a fortified 14th-century castle in Verrès, in the lower Aosta Valley, in north-western Italy.",
      "== History == === Origins === The earliest documents attesting the existence of a castle at Verrès (in the possession of the De Verretio family) date to 1287.",
      "The De Verretio in particular had harsh disagreements with the prelate over the years, which culminated in the episcopal casaforte in Issogne in 1333.",
      "Around the middle of the fourteenth century, the De Verretio became extinct without leaving any possible heirs, so their property came into the possession of the counts of Savoy, who granted it to Yblet de Challant in 1372 as a reward for diverse duties discharged in their service.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 76,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Verrès Castle",
    },
  },
  {
    slug: "pedestrian-bridge",
    name: "Footbridge",
    subtitle: "Catalogue entry",
    description:
      "A footbridge (also a pedestrian bridge, pedestrian overpass, or pedestrian overcrossing) is a bridge designed solely for pedestrians. While the primary meaning for a bridge is a structure which links \"two points at a height above the ground\", a footbridge can also be a lower structure, such as a boardwalk, that enables pedestrians to cross wet, fragile, or marshy land. Bridges range from stepping stones – possibly the earliest man-made structure to \"bridge\" water – to elaborate steel structures. Another early bridge would have been simply a fallen tree.",
    facts: [
      "Neolithic people also built a form of a boardwalk across marshes; the Sweet Track and the Post Track are examples from England that are around 6,000 years old.",
      "Among the oldest timber bridges is the Holzbrücke Rapperswil-Hurden crossing upper Lake Zürich in Switzerland; the prehistoric timber piles discovered to the west of the Seedamm date back to 1523 B.C.",
      "The first wooden footbridge led across Lake Zürich, followed by several reconstructions at least until the late 2nd century AD, when the Roman Empire built a 6-metre-wide (20 ft) wooden bridge.",
      "Between 1358 and 1360, Rudolf IV, Duke of Austria, built a 'new' wooden bridge across the lake that was used until 1878 – measuring approximately 1,450 metres (4,760 ft) in length and 4 metres (13 ft) in width.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 77,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Footbridge",
    },
  },
  {
    slug: "helix-bridge",
    name: "Helix Bridge",
    subtitle: "Catalogue entry",
    description:
      "The Helix Bridge, officially The Helix, and previously known as the Double Helix Bridge, is a pedestrian bridge linking Marina Centre with Marina South in the Marina Bay area in Singapore. Canopies (made of fritted-glass and perforated steel mesh) are incorporated along parts of the inner spiral to provide shade for pedestrians. The bridge has four viewing platforms sited at strategic locations which provide views of the Singapore skyline and events taking place within Marina Bay. At night, the bridge will be illuminated by a series of lights that highlight the double-helix structure, thereby creating a special visual experience for the visitors.",
    facts: [
      "It was officially opened on 24 April 2010; however, only half was opened due to ongoing construction at the Marina Bay Sands.",
      "The bridge was fully opened on 18 July.",
      "== Architecture == The design consortium is an international team comprising Australian architects the Cox Architecture and engineers Arup, and Singapore based Architects 61.",
      "The intentional left handed DNA-like design, which is the opposite of normal DNA on earth, earned it a place in The Left Handed DNA Hall of Fame in 2010.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 78,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Helix Bridge",
    },
  },
  {
    slug: "millau-viaduct",
    name: "Millau Viaduct",
    subtitle: "Catalogue entry",
    description:
      "The design team was led by engineer Michel Virlogeux and English architect Norman Foster. It was built over three years, formally inaugurated on 14 December 2004, and opened to traffic two days later on 16 December. The bridge has been consistently ranked as one of the greatest engineering achievements of modern times, and received the 2006 Outstanding Structure Award from the International Association for Bridge and Structural Engineering. == History == In the 1980s, high levels of road traffic near Millau in the Tarn valley were causing congestion, especially in the summer due to holiday traffic on the route from Paris to Spain.",
    facts: [
      "The Millau Viaduct (French: Viaduc de Millau [vja.dyk də mi.jo]) is a multispan cable-stayed bridge completed in 2004 across the gorge valley of the Tarn near (west of) Millau in the Aveyron department in the Occitanie Region, in Southern France.",
      "It was the tallest bridge in the world for over two decades (until late 2025), with a structural height of 343 metres (1,125 ft).",
      "The Millau Viaduct is part of the A75–A71 autoroute axis from Paris to Béziers and Montpellier.",
      "The cost of construction was approximately €394 million (£345 million).",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 79,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Millau Viaduct",
    },
  },
  {
    slug: "holborn-viaduct",
    name: "Holborn Viaduct",
    subtitle: "Catalogue entry",
    description:
      "It links Holborn, via Holborn Circus, with Newgate Street, in the City of London, England financial district, passing over Farringdon Street and the subterranean River Fleet. City surveyor William Haywood was the architect and the engineer was Rowland Mason Ordish. == History == Holborn Viaduct was built between 1863 and 1869, as a part of the Holborn Valley Improvements, which included a public works scheme which, at a cost of over £2.5 million (over £257 million in 2025), improved access into the City from the West End, with better traffic flow and distribution around the new Holborn Circus, the creation of Queen Victoria Street, the rebuilding of Blackfriars Bridge, the opening of the Embankment section into the City, the continuation of Farringdon Street as Farringdon Road and associated railway routes with Farringdon station and Ludgate Hill station. The viaduct crosses the junction of Victoria Street with Farringdon Street, at the point where Oldbourne Bridge had spanned the River Fleet before it was culverted for the creation of Farringdon Street and its market in 1734, thus enabling east-west traffic to avoid the steep gradients of the Holborn/Fleet valley at Holborn Hill and Snow Hill (also Skinner Street from 1829).",
    facts: [
      "Holborn Viaduct is a road bridge in London and the name of the street which crosses it (which forms part of the A40 route).",
      "The viaduct spans the steep-sided Holborn Hill and the River Fleet valley at a length of 1,400 feet (430 m) and 80 feet (24 m) wide.",
      "It was opened by Queen Victoria at the same time as the inauguration of the other thoroughfares with a formal coach drive procession on 6 November 1869.",
      "In 1941 the Blitz raids destroyed and damaged most of the area including the north side pavilions; these were copied and reinstated with associated property developments in 2000 (western) and 2014 (eastern), including lifts.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 80,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Holborn Viaduct",
    },
  },
  {
    slug: "leao",
    name: "Émerson Leão",
    subtitle: "Catalogue entry",
    description:
      "He is regarded by pundits as one of the best Brazilian goalkeepers of all time. A documentary video produced by FIFA, FIFA Fever, called him the third-most impressive defense player of all time. He was born in Ribeirão Preto, São Paulo. He then played the two following World Cups as first team player.",
    facts: [
      "Émerson Leão (Portuguese pronunciation: [ˈɛmeʁsõ leˈɐ̃w]; born 11 July 1949) is a Brazilian former football goalkeeper and manager.",
      "== Playing career == He was a FIFA World Cup champion in 1970 as a reserve player, at age 20.",
      "He was the first Brazilian goalkeeper in history to be team captain (during the 1978 World Cup).",
      "Dida repeated the feat in 2006 in a group stage match against Japan.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 81,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Émerson Leão",
    },
  },
  {
    slug: "pub",
    name: "Pub",
    subtitle: "Catalogue entry",
    description:
      "A pub (short for public house) is, in several countries, a drinking establishment licensed to serve alcoholic drinks for consumption on the premises. Today, there is no strict definition, but the Campaign for Real Ale states a pub has four characteristics: is open to the public without membership or residency serves draught beer or cider without requiring food be consumed has at least one indoor area not laid out for meals allows drinks to be bought at a bar (i.e., not only table service) The history of pubs can be traced to taverns in Roman Britain, and through Anglo-Saxon alehouses, but it was not until the early 19th century that pubs, as they are today, first began to appear. The model also became popular in countries and regions of British influence, where pubs are often still considered to be an important aspect of their culture. In many places, especially in villages, pubs are the focal point of local communities.",
    facts: [
      "The term first appeared in England in the late 17th century to differentiate private houses from those open to the public as alehouses, taverns, and inns.",
      "In his 17th-century diary, Samuel Pepys described the pub as \"the heart of England\"; pubs have been established in other countries in modern times.",
      "Pubs often screen sporting events, such as rugby, cricket and football; the pub quiz was established in the UK in the 1970s.",
      "After the departure of Roman authority in the fifth century and the fall of the Romano-British kingdoms, the Anglo-Saxons established alehouses that may have grown out of domestic dwellings, first attested in the 10th century.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 82,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Pub",
    },
  },
  {
    slug: "anphitheatre-pula-pula-arena-croatia",
    name: "Pula Arena",
    subtitle: "Catalogue entry",
    description:
      "The Amphitheatre in Pula (Croatian: Amfiteatar u Puli; Italian: Anfiteatro di Pola), better known as the Pula Arena (Croatian: Pulska Arena; Italian: Arena di Pola), is a Roman amphitheatre located in Pula, Istria, Croatia. It features a complex system of subterranean passages, gates, and towers that were once used to manage performers, animals, and stage machinery. The arena’s architectural design reflects a blend of Roman engineering precision and adaptation to the Adriatic coastal landscape, offering panoramic views over Pula’s harbour. After the fall of the Western Roman Empire, the amphitheatre gradually lost its original function and was used for various purposes, including as a fortress, quarry, and pasture ground.",
    facts: [
      "Constructed between 27 BC and AD 14, during the reign of Augustus and later expanded under Vespasian, the arena is one of the best-preserved ancient Roman amphitheatres in the world and the only remaining example to retain its entire circular wall structure.",
      "Originally built outside the city walls, the arena once accommodated up to 23,000 spectators and served as the main venue for gladiatorial contests, animal hunts, and other forms of public entertainment typical of the Roman Empire.",
      "The structure is built from local limestone and measures approximately 132 by 105 metres, with a height of 32 metres at its highest point.",
      "Systematic preservation efforts began in the 19th century, when the arena became recognized as a cultural monument of exceptional historical value.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 83,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Pula Arena",
    },
  },
  {
    slug: "old-town-plovdiv",
    name: "Old Town (Plovdiv)",
    subtitle: "Catalogue entry",
    description:
      "The old town in Plovdiv is an architectural and historical reserve located on three of Plovdiv's hills: Nebet Tepe, Dzhambaz Tepe and Taksim Tepe. The complex has been formed as a result of the long sequence of habitation from prehistoric times to present day and combines the culture and architecture from Antiquity, Middle Ages and Bulgarian revival. == Ancient monuments == === Nebet Tepe === Nebet Tepe is one of the hills of Plovdiv where the ancient town was founded. The site was first settled by Thracians, later expanded by Philip II of Macedon and the Roman Empire.",
    facts: [
      "The old town in Plovdiv is included in UNESCO World Heritage tentative list since 2004.",
      "The earliest settlements on Nebet Tepe are dated back to 4000 BC.",
      "It was constructed during Roman Emperor Trajan (reigned 98–117 AD), it can host between 5000 and 7000 spectators and it is currently in use.",
      "=== Hisar Kapia === Hisar Kapia is a medieval gate in Plovdiv's old town built in the 11th century AD over the foundations of a gate from Roman times (probably from the 2nd century AD).",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 84,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Old Town (Plovdiv)",
    },
  },
  {
    slug: "ancient-theatre-north",
    name: "North",
    subtitle: "Catalogue entry",
    description:
      "North is one of the four compass points or cardinal directions. It is the opposite of south and is perpendicular to east and west. North is a noun, adjective, or adverb indicating direction or geography. == Etymology == The word north is related to the Old High German nord, both descending from the Proto-Indo-European unit *ner-, meaning \"left; below\" as north is to left when facing the rising sun.",
    facts: [
      "To go north using a compass for navigation, set a bearing or azimuth of 0° or 360°.",
      "\"The world population is north of 7 billion people\" or \"north of 40 [years old]\".",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 85,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — North",
    },
  },
  {
    slug: "theatre-ostia-antica-italy",
    name: "Italy",
    subtitle: "Catalogue entry",
    description:
      "Italy, officially the Italian Republic, is a country in Southern and Western Europe. Italy shares land borders with France to the west; Switzerland and Austria to the north; Slovenia to the east; and the two enclaves of Vatican City and San Marino. Rome is the capital of Italy; other major cities include Milan, Naples, Turin, Palermo, Bologna, Florence, Genoa, Bari, and Venice. The history of Italy goes back to numerous Italic peoples, notably including the ancient Romans, who conquered the Mediterranean world during the Roman Republic and ruled it for centuries during the Roman Empire.",
    facts: [
      "It consists of a peninsula, which extends into the Mediterranean Sea, with the Alps on its northern land border, as well as nearly 800 islands, notably Sicily and Sardinia.",
      "It is the tenth-largest country in Europe by area, covering 301,340 km2 (116,350 sq mi), and the third-most populous member state of the European Union, with nearly 59 million inhabitants.",
      "By the 11th century, Italian city-states and maritime republics expanded, bringing renewed prosperity through commerce and laying the groundwork for modern capitalism.",
      "The Italian Renaissance flourished during the 15th and 16th centuries and spread to the rest of Europe.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 86,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Italy",
    },
  },
  {
    slug: "common-raven",
    name: "Common raven",
    subtitle: "Catalogue entry",
    description:
      "The common raven or northern raven (Corvus corax) is a large all-black passerine bird. It is the most widely distributed of all corvids, found across the Northern Hemisphere. Young birds may travel in flocks but later mate for life, with each mated pair defending a territory. Common ravens have coexisted with humans for thousands of years and in some areas have been so numerous that people have regarded them as pests.",
    facts: [
      "There are 11 accepted subspecies with little variation in appearance, although recent research has demonstrated significant genetic differences among populations from various regions.",
      "It is one of the two largest corvids, alongside the thick-billed raven, and is the heaviest passerine bird; at maturity, the common raven averages 63 centimetres (25 inches) in length and 1.47 kilograms (3.2 pounds) in weight, up to 2 kg (4.4 lb) in the heaviest individuals.",
      "Although their typical lifespan is considerably shorter, common ravens can live more than 23 years in the wild.",
      "== Taxonomy == The common raven was one of the many species originally described, with its type locality given as Europe, by Carl Linnaeus in his landmark 1758 10th edition of Systema Naturae, and it still bears its original name of Corvus corax.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 87,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Common raven",
    },
  },
  {
    slug: "european-stag-beetle",
    name: "Lucanus cervus",
    subtitle: "Catalogue entry",
    description:
      "Lucanus cervus, known as the European stag beetle, or the greater stag beetle, is one of the best-known species of stag beetle (family Lucanidae) in Western Europe, and is the eponymous example of the genus. L. cervus is listed as Near Threatened by the IUCN Red List. == Taxonomy == Lucanus cervus is situated in the genus Lucanus within the family Lucanidae.",
    facts: [
      "In the genus there are two subgenera: Lucanus Scopoli, 1763 and Pseudolucanus Hope and Westwood, 1845.",
      "cervus cervus (Linnaeus, 1758) was established via the original description of the species in 1758.",
      "cervus judaicus Planet, 1900, L.",
      "cervus laticornis Deyrolle, 1864, and L.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 88,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Lucanus cervus",
    },
  },
  {
    slug: "goldcrests",
    name: "Goldcrest",
    subtitle: "Catalogue entry",
    description:
      "The goldcrest (Regulus regulus) is a very small passerine bird in the kinglet family. Its colourful golden crest feathers, as well as being called the \"king of the birds\" in European folklore, gives rise to its English and scientific names. The scientific name, R. regulus, means 'petty king' or prince.",
    facts: [
      "== Description == The goldcrest is the smallest European bird, 8.5–9.5 cm (3.3–3.7 in) in length, with a 13.5–15.5 cm (5.3–6.1 in) wingspan and a weight of 4.5–7.0 g (0.16–0.25 oz).",
      "== Voice == The typical contact call of the goldcrest is a thin, high-pitched zee given at intervals of 1–4 seconds, with all the notes at the same pitch.",
      "The song of the male goldcrest is a very high, thin double note cedar, repeated 5–7 times and ending in a flourish, cedarcedar-cedar-cedar-cedar-stichi-see-pee.",
      "The entire song lasts 3–4 seconds and is repeated 5–7 times a minute.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 89,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Goldcrest",
    },
  },
  {
    slug: "lesser-grey-shrike",
    name: "Lesser grey shrike",
    subtitle: "Catalogue entry",
    description:
      "The lesser grey shrike (Lanius minor) is a passerine bird in the shrike family Laniidae. It breeds in South and Central Europe and western Asia and migrates to winter quarters in southern Africa in the early autumn, returning in spring. It is a scarce vagrant to western Europe, including Great Britain, usually as a spring or autumn erratic. It is similar in appearance to the great grey shrike (Lanius excubitor) and the Iberian grey shrike (Lanius meridionalis); both sexes are predominantly black, white and grey, and males have pink-flushed underparts.",
    facts: [
      "== Taxonomy == The lesser grey shrike was formally described in 1788 by the German naturalist Johann Friedrich Gmelin under the binomial name Lanius minor.",
      "Gmelin based his description on the \"Pie-grièche d'Italie\" that had been described in 1770 by French polymath the Comte de Buffon and illustrated with a hand-coloured engraving by François-Nicolas Martinet.",
      "A molecular phylogenetic study published in 2019 found that within the genus Lanius the lesser grey shrike was sister to the woodchat shrike (Lanius senator), a migratory species that breeds in southern Europe, the Middle East and northwest Africa.",
      "The two species diverged from each other around 3.9–5.0 million years ago.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Lesser grey shrike",
    },
  },
  {
    slug: "starling",
    name: "Starling",
    subtitle: "Catalogue entry",
    description:
      "Starlings are small to medium-sized passerine (perching) birds known for the often dark, glossy iridescent sheen of their plumage; their complex vocalizations including mimicking; and their distinctive, often elaborate swarming behavior, known as murmuration. All members of the family Sturnidae, commonly called sturnids, are known collectively as starlings. The Sturnidae are named for the genus Sturnus, which in turn comes from the Latin word for starling, sturnus. Many Asian species, particularly the larger ones, are called mynas, and many African species are known as glossy starlings because of their iridescent plumage.",
    facts: [
      "The family contains 128 species which are divided into 36 genera.",
      "The shortest-bodied species is Kenrick's starling (Poeoptera kenricki), at 15 cm (6 in), but the lightest-weight species is Abbott's starling (Poeoptera femoralis), which is 34 g (1+1⁄4 oz).",
      "This species can measure up to 36 cm (14 in), and in domestication they can weigh up to 400 g (14 oz).",
      "The longest species in the family is the white-necked myna (Streptocitta albicollis), which can measure up to 50 cm (19+1⁄2 in), although around 60% in this magpie-like species is comprised by its very long tail.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 51,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Starling",
    },
  },
  {
    slug: "pavilion",
    name: "Pavilion",
    subtitle: "Catalogue entry",
    description:
      "In architecture, pavilion has several meanings: It may be a subsidiary building that is either positioned separately or as an attachment to a main building. Often it is associated with pleasure. In palaces and traditional mansions of Asia, there may be pavilions that are either freestanding or connected by covered walkways, as in the Forbidden City (Chinese pavilions), Topkapi Palace in Istanbul, and in Mughal buildings like the Red Fort. As part of a large palace, pavilions may be symmetrically placed building blocks that flank (appear to join) a main building block or the outer ends of wings extending from both sides of a central building block, the corps de logis.",
    facts: [
      "The word is from the early 13c., paviloun, \"large, stately tent raised on posts and used as a movable habitation,\" from Old French paveillon \"large tent; butterfly\" (12c.), from Latin papilionem (nominative papilio) \"butterfly, moth,\" in Medieval Latin \"tent\" (see papillon); the type of tent was so called on its resemblance to wings.",
      "Meaning \"open building in a park, etc., used for shelter or entertainment\" is attested from 1680s.",
      "Sense of \"small or moderate-sized building, isolated from but dependent on a larger or principal building\" (as in a hospital) is by 1858.",
      "These were particularly popular up to the 18th century and can be equated to the Italian casina, formerly rendered in English \"casino\".",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Pavilion",
    },
  },
  {
    slug: "kiosk",
    name: "Kiosk",
    subtitle: "Catalogue entry",
    description:
      "Today, several examples of this type of kiosk still exist in and around the Topkapı Palace in Istanbul, and they can be seen in Balkan countries. The word is used in English-speaking countries for small booths offering goods and services. In Australia they usually offer food service. Freestanding computer terminals dispensing information are called interactive kiosks.",
    facts: [
      "Historically, a kiosk (from Persian کوشک, kušk) was a small garden pavilion open on some or all sides common in Persia, the Indian subcontinent, and in the Ottoman Empire from the 13th century onward.",
      "The former was built in 1473 by Mehmed II (\"the Conqueror\") at the Topkapı Palace, Istanbul, and consists of a two storey building topped with a dome and having open sides overlooking the gardens of the palace.",
      "The Baghdad Koshk was also built at the Topkapı Palace in 1638–39, by Sultan Murad IV.",
      "Sultan Ahmed III (1703–1730) also built a glass room of the Sofa Kiosk at the Topkapı Palace incorporating some Western elements, such as the gilded brazier designed by Duplessis père, which was given to the Ottoman ambassador by King Louis XV of France.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Kiosk",
    },
  },
  {
    slug: "utility-building",
    name: "Public utility building",
    subtitle: "Catalogue entry",
    description:
      "A public utility building (also known as infrastructure building, and utility building) is a building used by a public utility to maintain its office or to house equipment used in connection to the public utility. Examples include pumping stations, gas regulation stations, and other buildings that house infrastructure components and equipment of water purification systems, water distribution networks, sewage treatment systems, electric power distribution, district heating, telephone exchanges, and public service telecommunication equipment. == Exterior design strategies == === Decorative cloak === After the Industrial Revolution, cities in industrialized countries were required to construct and maintain infrastructure facilities to support city growth. Three types of structures were unique to the water industry: pumping stations (including water and wastewater), water towers, and dams.",
    facts: [
      "The modern water industry was one of the early types of city infrastructure, born in the early 19th century out of that necessity.",
      "In particular, the pumping stations that housed large steam engines in the 19th and early 20th centuries were built intentionally to be symbolic.",
      "An example of electrical substations is seen in a 1931 Commonwealth Edison substation at 115 North Dearborn Street in Chicago.",
      "In New York City, many substations built in the 1920s and 1930s to power its subway system incorporated Art Deco ornamental features.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Public utility building",
    },
  },
  {
    slug: "gazebo",
    name: "Gazebo",
    subtitle: "Catalogue entry",
    description:
      "A gazebo () is a pavilion structure, sometimes octagonal or turret-shaped, often built in a park, garden, or spacious public area. Some are used on occasions as bandstands. In British English, the word is also used for a tent-like canopy with open sides to provide shelter from sun and rain at outdoor events. L.",
    facts: [
      "== Etymology == The etymology given by Oxford Dictionaries is \"Mid 18th century: perhaps humorously from gaze, in imitation of Latin future tenses ending in -ebo: compare with lavabo.\" L.",
      "The word gazebo appears in a mid-18th century English book by the architects John and William Halfpenny: Rural Architecture in the Chinese Taste.",
      "There Plate 55, \"Elevation of a Chinese Gazebo\", shows \"a Chinese Tower or Gazebo, situated on a Rock, and raised to a considerable Height, and a Gallery round it to render the Prospect more complete.\" George Washington had a small eight-sided garden structure at Mount Vernon.",
      "Such structures first appeared in Egyptian gardens approximately 5,000 years ago and appear in the literature of China, Persia and other classical civilizations.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Gazebo",
    },
  },
  {
    slug: "clock-tower",
    name: "Clock tower",
    subtitle: "Catalogue entry",
    description:
      "Clock towers are a specific type of structure that house a turret clock and have one or more clock faces on the upper exterior walls. Many clock towers are freestanding structures but they can also adjoin or be located on top of another building. Some other buildings also have clock faces on their exterior but these structures serve other main functions. Clock towers are a common sight in many parts of the world with some being iconic buildings.",
    facts: [
      "Before the middle of the twentieth century, most people did not have watches, and prior to the 18th century even home clocks were rare.",
      "The earliest clock tower was the Tower of the Winds in Athens, which featured eight sundials and was created in the 1st century BC during the period of Roman Greece.",
      "In Song dynasty China, an astronomical clock tower was designed by Su Song and erected at Kaifeng in 1088, featuring a liquid escapement mechanism.",
      "In England, a clock was put up in a clock tower, the medieval precursor to Big Ben, at Westminster, in 1288; and in 1292 a clock was put up in Canterbury Cathedral.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 56,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Clock tower",
    },
  },
  {
    slug: "bromo-seltzer-tower",
    name: "Emerson Bromo-Seltzer Tower",
    subtitle: "Catalogue entry",
    description:
      "For years, the landmark tower was surrounded by and part of the Emerson Drug Company with its office headquarters and manufacturing plant for the carbonated headache pain relief tablets or powder Bromo-Seltzer. Later, the Emerson building around it was razed and replaced by the Baltimore City Fire Department's John Steadman Fire Station, which serves the west side of downtown Baltimore. The Steadman Station combined several earlier engine and truck companies in firehouses on the west side. Built in the Brutalist architecture style of poured concrete, the station has lines echoing the surviving tower to its south and west.",
    facts: [
      "The Emerson Tower (often called the Bromo-Seltzer Tower or the Bromo Tower) is a 15-story, 88 m (289 ft) clock tower in downtown Baltimore, Maryland.",
      "Erected in 1907–1911 at 21 South Eutaw Street, at the northeast corner of Eutaw and West Lombard Streets, it was the tallest building in the city from 1911 to 1923, when it was supplanted by the Citizens National Bank building.",
      "It was designed by local architect Joseph Evans Sperry (1854–1930) for Isaac Edward Emerson (1859–1931), who invented the Bromo-Seltzer headache remedy.",
      "== History == It was the tallest building in Baltimore from 1911 until 1923.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Emerson Bromo-Seltzer Tower",
    },
  },
  {
    slug: "bell-tower",
    name: "Bell tower",
    subtitle: "Catalogue entry",
    description:
      "A bell tower is a tower that contains one or more bells, or that is designed to hold bells even if it has none. Such a tower commonly serves as part of a Christian church, and will contain church bells, but there are also many secular bell towers, often part of a municipal building, an educational establishment, or a tower built specifically to house a carillon. Church bell towers often incorporate clocks, and secular towers usually do, as a public service. The term campanile ( KAM-pə-NEE-lee, -⁠lay, US also KAHM-, Italian: [kampaˈniːle]), from Italian and deriving from campana \"bell\", is synonymous with bell tower; though, in English usage, campanile tends to be used to refer to a free standing bell tower.",
    facts: [
      "The tallest free-standing bell tower in the world, 113.2 metres (371 ft) high, is the Mortegliano Bell Tower, in the Friuli-Venezia Giulia region, Italy.",
      "The early Christians thus came to pray the Lord's Prayer at 9 am, 12 pm and 3 pm; as such, in Christianity, many Lutheran and Anglican churches ring their church bells from belltowers three times a day: in the morning, at noon and in the evening calling Christians to recite the Lord's Prayer.",
      "Many Catholic Christian churches ring their bells thrice a day, at 6 a.m., noon, and 6 p.m., to call the faithful to recite the Angelus, a prayer recited in honour of the Incarnation of God.",
      "== History == === Europe === In 400 AD, Paulinus of Nola introduced church bells into the Christian Church.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 58,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Bell tower",
    },
  },
  {
    slug: "bantay-bell-tower",
    name: "Bantay Church",
    subtitle: "Catalogue entry",
    description:
      "The Parish of Saint Augustine of Hippo, also known as the Archdiocesan Shrine of Our Lady of Charity and colloquially known as Bantay Church, is a Roman Catholic church in Bantay, Ilocos Sur in the Philippines. Dedicated to Saint Augustine of Hippo, the church is under the jurisdiction of the Archdiocese of Nueva Segovia. It houses enshrined an image of the Blessed Virgin Mary venerated under the title of Our Lady of Charity. The decree was signed by the Secretary Deacon Giulio Rossi and notarized by the Grand Chancellor, Girolamo Ricci.",
    facts: [
      "Pope Pius XII issued a pontifical decree of coronation titled Quas Tuas Optime on 3 August 1955, towards the venerated image of Our Lady of Charity, being granted to the Archbishop of Nueva Segovia, Santiago Caragnan y Sancho.",
      "The rite of coronation was executed on 12 January 1956 by the Apostolic Nuncio to the country, Cardinal Egidio Vagnozzi and named as \"Patroness of Ilocandia\".",
      "== Architecture == The church was heavily damaged during World War II, and its reconstruction started in 1950.",
      "== 2022 earthquake == On July 27, 2022, parts of the Bantay Bell Tower crumbled after a 7.0 magnitude earthquake struck the province of Abra and nearby provinces.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Bantay Church",
    },
  },
  {
    slug: "bell",
    name: "Bell",
    subtitle: "Catalogue entry",
    description:
      "A bell /ˈbɛl/ () is a directly struck idiophone percussion instrument. Most bells have the shape of a hollow cup that—when struck—vibrates in a single strong strike tone, with its sides forming an efficient resonator. The strike may be made by an internal \"clapper\" or \"uvula\", an external hammer, or—in small bells—by a small loose sphere enclosed within the body of the bell (jingle bell). Bells are usually cast from bell metal (a type of bronze) for its resonant properties, but can also be made from other hard materials.",
    facts: [
      "== History == The earliest archaeological evidence of bells dates from the 3rd millennium BCE, and is traced to the Yangshao culture of Neolithic China.",
      "In West Asia, the first bells appear in 1000 BCE.",
      "The earliest metal bells, with one found in the Taosi site and four in the Erlitou site, are dated to about 2000 BCE.",
      "1050 BCE), they were relegated to subservient functions; at Shang and Zhou sites, they are also found as part of the horse-and-chariot gear and as collar-bells of dogs.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Bell",
    },
  },
  {
    slug: "water-tower-post-apocalyptic",
    name: "Water tower",
    subtitle: "Catalogue entry",
    description:
      "A water tower is an elevated structure supporting a water tank constructed at a height sufficient to pressurize a distribution system for potable water, and to provide emergency storage for fire protection. Water towers often operate in conjunction with underground or surface service reservoirs, which store treated water close to where it will be used. Other types of water towers may only store raw (non-potable) water for fire protection or industrial purposes, and may not necessarily be connected to a public water supply. Water towers are able to supply water even during power outages, because they rely on hydrostatic pressure produced by elevation of water (due to gravity) to push the water into domestic and industrial water distribution systems; however, they cannot supply the water for a long time without power, because a pump is typically required to refill the tower.",
    facts: [
      "== History == Although the use of elevated water storage tanks has existed since ancient times in various forms, the modern use of water towers for pressurized public water systems developed during the mid-19th century, as steam-pumping became more common, and better pipes that could handle higher pressures were developed.",
      "By the late 19th century, standpipes grew to include storage tanks to meet the ever-increasing demands of growing cities.",
      "In California and some other states, domestic water towers enclosed by siding (tankhouses) were once built (1850s–1930s) to supply individual homes; windmills pumped water from hand-dug wells up into the tank in New York.",
      "Early steam locomotives required water stops every 7 to 10 miles (11 to 16 km).",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Water tower",
    },
  },
  {
    slug: "treehouse",
    name: "TreeHouse School",
    subtitle: "Catalogue entry",
    description:
      "The school is located in the London Borough of Haringey, England, and is operated by the charity Ambitious about Autism. The school enrols pupils who have a diagnosis of autism and an Education, Health and Care plan. The school has links with many local businesses, schools and community projects. Some older pupils take part in work experience placements in the area.",
    facts: [
      "TreeHouse School is a non-maintained special school and sixth form for autistic children and young people aged 4 to 19.",
      "Children from 17 local authority areas attend the school.",
      "Founded in 1997, by a group of parents including writer Nick Hornby, it was originally based in a room at Swiss Cottage Library.",
      "It is currently located in Muswell Hill, where over 100 pupils attend.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 62,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — TreeHouse School",
    },
  },
  {
    slug: "the-eiffel-tower",
    name: "Eiffel Tower",
    subtitle: "Catalogue entry",
    description:
      "The Eiffel Tower ( EYE-fəl; French: Tour Eiffel [tuʁ ɛfɛl] ) is a lattice tower on the Champ de Mars in Paris, France. Although initially criticised by some of France's leading artists and intellectuals for its design, it has since become a global cultural icon of France and one of the most recognisable structures in the world. It was designated a monument historique in 1964, and was named part of a UNESCO World Heritage Site (\"Paris, Banks of the Seine\") in 1991. The tower is 330 metres (1,083 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris.",
    facts: [
      "It is named after the engineer Gustave Eiffel, whose company designed and built the tower from 1887 to 1889.",
      "Locally nicknamed \"La dame de fer\" (French for \"Iron Lady\") for its use of wrought iron, it was constructed as the centrepiece of the 1889 World's Fair, and to crown the centennial anniversary of the French Revolution.",
      "The tower received 5,889,000 visitors in 2022.",
      "The Eiffel Tower is the most visited monument with an entrance fee in the world: 6.91 million people ascended it in 2015.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Eiffel Tower",
    },
  },
  {
    slug: "cullahill-castle-tn034-025",
    name: "Cullahill Castle",
    subtitle: "Catalogue entry",
    description:
      "Cullahill Castle takes its name from an ancient forest that covered Cullahill Mountain and extended down to Cullahill village. == Location == In the village of Cullahill in County Laois, Ireland. It was attacked and partially destroyed by Cromwell's forces around 1650. It was probably attacked by cannon from a nearby hill.",
    facts: [
      "Cullahill Castle was the principal stronghold of the MacGillapatricks of Upper Ossory built around 1425 and destroyed around 1650.",
      "Approximately 100 metres out on the road up the nearby hill that gives the area its name.",
      "== History == Built around 1425, probably by Finghin MacGillapatrick Reportedly came under attack on several occasions by the \"sovereign and citizens of Kilkenny\" under reward from King Henry VI.",
      "Such attacks were reported in 1441 and 1517.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 64,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Cullahill Castle",
    },
  },
  {
    slug: "rattin-castle-wm034-008",
    name: "Rattin Castle",
    subtitle: "Catalogue entry",
    description:
      "Rattin Castle (Irish: Caisleán Raitin) is a ruined castle located southwest of the town of Kinnegad in County Westmeath, Ireland. The lands were originally owned by Hugh De Lacy, before he passed it onto John D'Arcy.",
    facts: [
      "The castle dates to the 16th century, and was built as a defensive tower for the local lands.",
      "The castle remained in the family's possession until the Irish Rebellion of 1641, in which it was forfeited.",
      "The M6 Motorway now passes close to the castle ruins - which are still largely intact.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 65,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Rattin Castle",
    },
  },
  {
    slug: "cullahill-castle-tn034-025001",
    name: "Cullahill Castle",
    subtitle: "Catalogue entry",
    description:
      "Cullahill Castle takes its name from an ancient forest that covered Cullahill Mountain and extended down to Cullahill village. == Location == In the village of Cullahill in County Laois, Ireland. It was attacked and partially destroyed by Cromwell's forces around 1650. It was probably attacked by cannon from a nearby hill.",
    facts: [
      "Cullahill Castle was the principal stronghold of the MacGillapatricks of Upper Ossory built around 1425 and destroyed around 1650.",
      "Approximately 100 metres out on the road up the nearby hill that gives the area its name.",
      "== History == Built around 1425, probably by Finghin MacGillapatrick Reportedly came under attack on several occasions by the \"sovereign and citizens of Kilkenny\" under reward from King Henry VI.",
      "Such attacks were reported in 1441 and 1517.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 66,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Cullahill Castle",
    },
  },
  {
    slug: "windmill",
    name: "Windmill",
    subtitle: "Catalogue entry",
    description:
      "A windmill is a machine operated by the force of wind acting on vanes or sails to mill grain (gristmills). == Forerunners == Wind-powered machines have been used earlier. Later, Hero of Alexandria (Heron) in first-century Roman Egypt described what appears to be a wind-driven wheel to power a machine. His description of a wind-powered organ is not a practical windmill but was either an early wind-powered toy or a design concept for a wind-powered machine that may or may not have been a working device, as there is ambiguity in the text and issues with the design.",
    facts: [
      "Windmills were used throughout the high medieval and early modern periods; the horizontal or panemone windmill first appeared in Persia during the 9th century, and the vertical windmill first appeared in northwestern Europe in the 12th century.",
      "The Babylonian emperor Hammurabi had used wind mill power for his irrigation project in Mesopotamia in the 17th century BC.",
      "400, the 7th century, or after the 9th century.",
      "One of the earliest recorded working windmill designs found was invented sometime around 700–900 AD in Persia.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 67,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Windmill",
    },
  },
  {
    slug: "gantry-crane",
    name: "Gantry crane",
    subtitle: "Catalogue entry",
    description:
      "A gantry crane is a crane built atop a gantry, which is a structure used to straddle an object or workspace. They can range from enormous \"full\" gantry cranes, capable of lifting some of the heaviest loads in the world, to small shop cranes, used for tasks such as lifting automobile engines out of vehicles. They are also called portal cranes, the \"portal\" being the empty space straddled by the gantry. The terms gantry crane and overhead crane (or bridge crane) are often used interchangeably, as both types of crane straddle their workload.",
    facts: [
      "As container ship sizes and widths have increased throughout the 20th Century, ship-to-shore gantry cranes and the implementation of those gantry cranes have become more individualized in order to effectively load and unload vessels while maximizing profitability and minimizing time in port.",
      "The first quayside container gantry crane was developed in 1959 by Paceco Corporation.",
      "They have spans of 140 metres (460 ft) and can lift loads of up to 840 tonnes (830 long tons; 930 short tons) to a height of 70 metres (230 ft).",
      "In 2008, the world's strongest gantry crane, Taisun, which can lift 20,000 tonnes (19,700 long tons; 22,000 short tons), was installed in Yantai, China at the Yantai Raffles Shipyard.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 68,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Gantry crane",
    },
  },
  {
    slug: "floating-island",
    name: "Floating island",
    subtitle: "Catalogue entry",
    description:
      "A floating island is a mass of floating aquatic plants, mud, and peat ranging in thickness from several centimeters to a few meters. Sometimes referred to as tussocks, floatons, or suds, floating islands are found in many parts of the world. They exist less commonly as an artificial island. Floating islands are generally found on marshlands, lakes, and similar wetland locations, and can be many hectares in size.",
    facts: [
      "In Crow Wing County, Minnesota a floating bog over one point six hectares (4 acres) in size moved about the area resulting in docks and boat lifts being destroyed.",
      "Floating habitat islands were installed with salicornia salt marsh plants at Sydney Olympic Park Authority in 2011 providing nesting sites for local and migratory birds including black swans, black-winged stilts, red-necked avocets, Pacific black ducks and chestnut teals, using the Aqua Biofilter product.",
      "A commercially produced floating island was installed in the river otter enclosure at Zoo Montana in 2007.",
      "In 2009 and the beginning of 2010, a few larger islands were launched to provide nesting habitat for Caspian tern colonies.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 69,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Floating island",
    },
  },
];
