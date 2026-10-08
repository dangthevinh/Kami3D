/**
 * Historic architecture — the second batch, sixteen more landmarks.
 *
 * The same catalogue as data/landmarks.ts, written the same way: a real place with a date, a height
 * and a named source behind every number, and `model_url` left null for the model pipeline to fill
 * in. This file imports the `Landmark` type and nothing else, so plain Node can read it and
 * `node --test` can check it.
 *
 * Where the numbers come from. Every date, height and name below was checked on 2026-10-05 against
 * the English Wikipedia article text and infobox for the site, and — where the article attributes a
 * figure to the body that runs the place — against that attribution: Nepal's Department of
 * Archaeology for Boudhanath's 36 m, the US National Park Service's "Carving History" page for
 * Mount Rushmore's 60-foot faces, the Golden Gate Bridge district for the 1937 opening, and the
 * resort itself for Marina Bay Sands. Where a figure could not be checked it is left out or null,
 * not guessed.
 *
 * Two slugs are short forms of their names rather than the kebab-case of them — "boudhanath" for
 * Boudhanath Stupa and "djenne-mosque" for the Great Mosque of Djenné. The slug is the model file
 * name the pipeline writes and was fixed before the display name, so the display name gives way;
 * scripts/check-landmarks-world-2.mjs pins both exceptions by name so they cannot multiply.
 *
 * The contested figures, and what was written instead:
 *
 *   - Petronas Towers, 1996. The interiors and the spires of both towers were finished in 1996, the
 *     year recorded here; the towers were opened on 31 August 1999.
 *   - Burj Khalifa, 2009. The exterior was completed on 1 October 2009 and the tower opened on
 *     4 January 2010. 2009 is the completion, 2010 is the opening.
 *   - Marina Bay Sands, 207 m. That is the height each of the three identical hotel towers is
 *     listed at; the Sands SkyPark laid across their roofs is described by the resort as sitting at
 *     200 m, so the two published figures are not measuring the same point.
 *   - Empire State Building, 381 m. That is to the 102nd floor, which is the roof. With the antenna
 *     fitted in 1953 the tip is 443.2 m; a reference that says 381 m and one that says 443.2 m are
 *     both right.
 *   - Golden Gate Bridge, 227 m. That is the towers above the water; the roadway clears high water
 *     by an average of 67 m.
 *   - Sydney Harbour Bridge. 134 m is the top of the arch above the water. The span of that arch is
 *     given as 503 m in the infobox and 504 m in the body text of the same article.
 *   - Château Frontenac, 79.9 m. That is from its base, on ground that is itself 54 m above the
 *     Saint Lawrence; higher figures quoted for the hotel are measured from the river.
 *   - Great Mosque of Djenné, 1907. The rebuilding is dated 1906 in the infobox and completed in
 *     1907 in the article's own text. The later of the two is recorded here, and the disagreement
 *     is written into the description rather than smoothed away.
 *   - Boudhanath, 2016. The stupa's form is 14th-century, but the structure as it stands today was
 *     rebuilt and reopened on 22 November 2016 after the April 2015 earthquake. 2016 is the year
 *     the structure as it stands was completed, not the year the site was founded.
 *   - Petra, Moai and Uluru are not single structures — a rock-cut city, a whole sculptural
 *     tradition, a natural monolith — so `height_m` is null rather than a number that would be
 *     true of one tomb, one statue or one flank of the rock.
 *   - Petra, 100, and Moai, 1500. Neither has a documented completion date. 100 is the end of the
 *     independent Nabataean building phase, before Rome annexed the kingdom in 106; 1500 is the end
 *     of the main moai-carving period as the quarry at Rano Raraku is read. Uluru has no completion
 *     date at all and is not a building: 1985 is the year the title was handed back to the Aṉangu,
 *     which is a documented date for the site as it is run today.
 *   - `architect` is null for Petra, the moai, Boudhanath, Uluru and the Great Mosque of Djenné.
 *     Nobody is credited for the first four. For Djenné the attribution is still argued: the mason
 *     Ismaila Traoré directed the 1907 rebuilding, and Félix Dubois and later Michel Leiris both
 *     held that the French colonial administration designed the building that stands.
 *   - Mount Rushmore, 18.3 m. That is each of the four faces, not the mountain, which is 1,745 m
 *     above sea level. The memorial is one work — four heads cut into one granite face — so the
 *     carving's own height is the figure recorded.
 */

import type { Landmark } from "../landmarks.ts";

export const BATCH: Landmark[] = [
  {
    slug: "petronas-towers",
    name: "Petronas Towers",
    city: "Kuala Lumpur",
    country: "Malaysia",
    completed: 1996,
    height_m: 451.9,
    style: "Postmodern, with Islamic geometric motifs",
    architect: "César Pelli, with Adamson Associates as executive architect",
    purpose: "The headquarters of the state oil company Petronas, and the centrepiece of the KLCC development.",
    description:
      "The Petronas Towers are a pair of 88-storey towers in the KLCC district of Kuala Lumpur, designed by César Pelli for the state oil company Petronas. They are 451.9 m to the tip of the spires, the figure the official height is measured to, though the roof stops at 405.5 m and the highest occupied floor is at 375 m; the interiors and spires were finished in 1996 and the towers were opened on 31 August 1999. A double-decker skybridge joins them at the 41st and 42nd floors, and they were the tallest buildings in the world from 1998 until Taipei 101 passed them in 2004. Imported steel was too expensive, so they were built instead in high-strength reinforced concrete.",
    fun_facts: [
      "The 451.9 m is to the tip of the spire: the roof is at 405.5 m and the highest occupied floor at 375 m.",
      "The skybridge on the 41st and 42nd floors is a double-decker, described as the highest two-storey bridge in the world.",
      "Imported steel was too expensive, so the towers were built in high-strength reinforced concrete instead.",
      "Felix Baumgartner BASE-jumped from a window-cleaning crane on the towers on 15 April 1999, a record at the time.",
    ],
    model_url: "/models/landmarks/petronas-towers.glb",
    accent: ["#dfe9f2", "#1f3550"],
    popularity: 92,
    kind: "tower",
  },
  {
    slug: "marina-bay-sands",
    name: "Marina Bay Sands",
    city: "Singapore",
    country: "Singapore",
    completed: 2010,
    height_m: 207,
    style: "Contemporary, three curved towers under a cantilevered SkyPark",
    architect: "Moshe Safdie",
    purpose: "An integrated resort — hotel, casino, convention centre, mall and museum — on reclaimed land at Marina Bay.",
    description:
      "Marina Bay Sands is an integrated resort on reclaimed land at Marina Bay, designed by Moshe Safdie and opened in 2010 at a reported cost of S$8 billion, which made it the most expensive standalone casino property in the world at the time. Its three 55-storey hotel towers hold 1,850 rooms and are listed at 207 m each, while the Sands SkyPark laid across their roofs — 1.2 hectares of gardens and one of the world's longest public cantilevers — is described by the resort as sitting at 200 m, so the two figures are not measuring the same point. The resort opened in stages: a soft opening on 27 April 2010, an official opening on 23 June 2010 and a grand opening on 17 February 2011.",
    fun_facts: [
      "The three hotel towers are listed at 207 m each and were topped out in July 2009; the SkyPark across their roofs is described by the resort as being at 200 m.",
      "The Sands SkyPark covers 1.2 hectares, and the resort says its 12,400 square metres are big enough for three football pitches.",
      "The resort cost S$8 billion at its 2010 opening, then the most expensive standalone casino property ever built.",
      "Each tower has two asymmetric legs, the curved eastern leg leaning on the other, which needed temporary supports and real-time monitoring while it was built.",
    ],
    model_url: "/models/landmarks/marina-bay-sands.glb",
    accent: ["#e4eef3", "#134054"],
    popularity: 90,
    kind: "tower",
  },
  {
    slug: "burj-khalifa",
    name: "Burj Khalifa",
    city: "Dubai",
    country: "United Arab Emirates",
    completed: 2009,
    height_m: 828,
    style: "Neo-futurist, derived from Islamic architecture",
    architect: "Adrian Smith of Skidmore, Owings & Merrill, with Bill Baker as chief structural engineer",
    purpose: "A mixed-use tower of offices, residences, a hotel and observation decks, and the centrepiece of Downtown Dubai.",
    description:
      "The Burj Khalifa is a 163-storey tower in Downtown Dubai, designed by Adrian Smith of Skidmore, Owings & Merrill with Bill Baker as chief structural engineer, and it has been the tallest building in the world since it was finished. It is 828 m to the tip of the spire, 739.4 m to the roof and 585.4 m to the highest occupied floor; its exterior was completed on 1 October 2009 and it officially opened on 4 January 2010. The plan is Y-shaped and the structure is a buttressed core, a form drawn from Islamic architecture such as the Great Mosque of Samarra. It was called Burj Dubai until the day it opened, when it was renamed for Sheikh Khalifa bin Zayed Al Nahyan of Abu Dhabi.",
    fun_facts: [
      "It is 828 m to the tip, 739.4 m to the roof and 585.4 m to the highest occupied floor — three different answers to how tall it is.",
      "The name changed on opening day: the tower was Burj Dubai until 4 January 2010, when it was renamed for Sheikh Khalifa of Abu Dhabi.",
      "Its double-deck lifts run at up to 10 m/s, and the façade carries more than 26,000 glass panels over 142,000 square metres.",
      "The observation deck on the 124th floor is at 555.7 m; The Lounge, opened in February 2019 at 585 m, retook the record for the highest observation deck.",
    ],
    model_url: "/models/landmarks/burj-khalifa.glb",
    accent: ["#e9e4d9", "#3b3a35"],
    popularity: 96,
    kind: "tower",
  },
  {
    slug: "petra",
    name: "Petra",
    city: "Ma'an",
    country: "Jordan",
    completed: 100,
    height_m: null,
    style: "Nabataean rock-cut architecture, Hellenistic in its detail",
    architect: null,
    purpose: "The capital of the Nabataean kingdom, a caravan city on the incense and spice routes.",
    description:
      "Petra is a Nabataean city cut into the sandstone of a valley in southern Jordan, and it is a whole archaeological site rather than one building, so this entry carries no height. It flourished in the 1st century AD, when its population peaked at an estimated 20,000 and Al-Khazneh — 39.1 m high and cut as a tomb, probably for King Aretas IV — was carved into the cliff. The year recorded here, 100, is the end of the independent Nabataean building phase: Rome annexed the kingdom in 106 and the city declined as sea trade took its traffic away, helped along by an earthquake in 363. It stayed unknown to the western world until the Swiss traveller Johann Ludwig Burckhardt reached it in 1812, and UNESCO listed it in 1985.",
    fun_facts: [
      "Al-Khazneh, the Treasury, is 39.1 m high and was cut from the cliff as a tomb, probably for King Aretas IV, who reigned from 9 BC to AD 40.",
      "Rome annexed the Nabataean kingdom in 106, and an earthquake in 363 destroyed many of the city's buildings and crippled its water system.",
      "The Swiss traveller Johann Ludwig Burckhardt reached Petra in 1812, and until then the city had been unknown to the western world.",
      "The site covers about 264 square kilometres at roughly 810 m above sea level, and UNESCO listed it as a World Heritage Site in 1985.",
    ],
    model_url: "/models/landmarks/petra.glb",
    accent: ["#f0d9c4", "#5a2f24"],
    popularity: 91,
    kind: "ruin",
  },
  {
    slug: "boudhanath",
    name: "Boudhanath Stupa",
    city: "Kathmandu",
    country: "Nepal",
    completed: 2016,
    height_m: 36,
    style: "Nepalese Buddhist stupa on a mandala plan",
    architect: null,
    purpose: "A Buddhist stupa and pilgrimage site, and the centre of Tibetan Buddhism in Nepal.",
    description:
      "Boudhanath is a stupa in the Kathmandu valley and one of the largest in the world, 36 m tall on the figure Nepal's Department of Archaeology publishes. The form of the stupa is most likely 14th-century, and the Tibetan record links its restoration to the Newar monk Shakya Zangpo; no architect is credited. The year recorded here, 2016, is the year the structure as it stands was completed: the earthquake of 25 April 2015 cracked the spire, everything above the dome was examined and saved or replaced, and the stupa reopened on 22 November 2016. That rebuilding was organised by the Boudhanath Area Development Committee and paid for entirely by private donations, at a reported cost of $2.1 million and more than 30 kg of gold.",
    fun_facts: [
      "The 2015 earthquake cracked the spire; the stupa reopened on 22 November 2016 after repairs that cost $2.1 million and used more than 30 kg of gold.",
      "Its height is given as 36 m by Nepal's Department of Archaeology, measured from the base to the top of the spire.",
      "UNESCO listed Boudhanath in 1979, and Tibetan refugees who arrived after the 1959 uprising settled in numbers around it.",
      "The rebuilding was funded entirely by private donations from Buddhist groups and volunteers, with no state money.",
    ],
    model_url: "/models/landmarks/boudhanath.glb",
    accent: ["#f5efe0", "#6b3410"],
    popularity: 80,
    kind: "temple",
  },
  {
    slug: "hassan-ii-mosque",
    name: "Hassan II Mosque",
    city: "Casablanca",
    country: "Morocco",
    completed: 1993,
    height_m: 210,
    style: "Modern Moroccan, in the Moorish tradition",
    architect: "Michel Pinseau",
    purpose: "A mosque built for King Hassan II, standing partly over the Atlantic, with a prayer hall for 25,000.",
    description:
      "The Hassan II Mosque stands at Casablanca on a platform built out over the Atlantic, commissioned by King Hassan II and completed on 30 August 1993 to designs by the French architect Michel Pinseau. Its minaret is 210 m tall, the tallest minaret in the world when it was finished, while the mosque below it is a hall 200 m by 100 m with a roof that opens. Capacity is given as 105,000 people: 25,000 inside the prayer hall and another 80,000 on the grounds. The contractor was Bouygues, whose engineers developed a high-strength concrete for the minaret, and 6,000 Moroccan artisans worked on the decoration.",
    fun_facts: [
      "The minaret is 210 m, the tallest in the world when the mosque was completed in 1993.",
      "The retractable roof over the prayer hall weighs 1,100 tonnes, covers 3,400 square metres and opens in five minutes.",
      "The mosque holds 105,000 people: 25,000 indoors in a hall 200 m by 100 m, and 80,000 more on the esplanade.",
      "6,000 Moroccan master artisans worked on the decoration, which uses titanium, bronze, granite, pale blue marble and zellige tile.",
    ],
    model_url: "/models/landmarks/hassan-ii-mosque.glb",
    accent: ["#e2ecec", "#12454a"],
    popularity: 83,
    kind: "temple",
  },
  {
    slug: "djenne-mosque",
    name: "Great Mosque of Djenné",
    city: "Djenné",
    country: "Mali",
    completed: 1907,
    height_m: 16,
    style: "Sudano-Sahelian, built in adobe",
    architect: null,
    purpose: "The Friday mosque of Djenné, and the largest building in the world made of mud brick.",
    description:
      "The Great Mosque of Djenné is the largest adobe building in the world, a Sudano-Sahelian mosque on the flood plain of the Bani river whose qibla wall carries three box-like towers, the central one about 16 m high. A mosque has stood on the site since at least the 13th century, but the building that stands today was rebuilt between 1906 and 1907; the article's infobox dates the rebuilding to 1906 and its own text dates the completion to 1907, and no source puts a finer date on it. The work was directed by Ismaila Traoré, head of the town's guild of masons, though the French journalist Félix Dubois, who saw the result in 1910, and later the ethnologist Michel Leiris both held that the colonial administration was responsible for the design. Every year the whole town replasters the mosque at a festival that doubles as the building's repair, because the rains undo it annually.",
    fun_facts: [
      "The central tower of the qibla wall is about 16 m high; the mosque is a walled courtyard building, so no single height describes it.",
      "Bundles of rodier palm sticks, called toron, are set into the walls: they decorate the façade and serve as permanent scaffolding for the annual replastering.",
      "UNESCO listed the Old Towns of Djenné, including the mosque, as a World Heritage Site in 1988.",
      "On 5 November 2009 the upper section of the southern tower collapsed after 75 mm of rain fell in 24 hours; the Aga Khan Trust for Culture paid to rebuild it.",
    ],
    model_url: "/models/landmarks/djenne-mosque.glb",
    accent: ["#f2e2c4", "#6b4a1f"],
    popularity: 72,
    kind: "temple",
  },
  {
    slug: "empire-state-building",
    name: "Empire State Building",
    city: "New York City",
    country: "United States",
    completed: 1931,
    height_m: 381,
    style: "Art Deco",
    architect: "Shreve, Lamb and Harmon, with the design produced by William F. Lamb",
    purpose: "An office building on Fifth Avenue, with public observation decks on the 86th and 102nd floors.",
    description:
      "The Empire State Building is a 102-storey Art Deco skyscraper on Fifth Avenue in Manhattan, built as offices, and its design was produced by William F. Lamb of Shreve, Lamb and Harmon. It is 381 m to the 102nd floor, which is the roof, and 443.2 m to the top of the antenna fitted in 1953. Construction began on 17 March 1930 and the structure was complete on 11 April 1931, 410 days later and twelve days ahead of schedule; at the peak more than 3,500 workers were on the site, 3,439 of them on 14 August 1930 alone. It was the tallest building in the world until the World Trade Center was topped out in 1970, though the Ostankino Tower had passed it as a free-standing structure in 1967.",
    fun_facts: [
      "It went up in 410 days, from 17 March 1930 to 11 April 1931, and was finished twelve days ahead of schedule.",
      "It is 381 m to the 102nd floor and 443.2 m to the antenna added in 1953, so the height depends on where you stop measuring.",
      "3,439 workers were on the site on 14 August 1930, out of more than 3,500 at the peak of the job.",
      "Al Smith shot the last rivet of the frame, and it was made of solid gold.",
    ],
    model_url: "/models/landmarks/empire-state-building.glb",
    accent: ["#e9e2d4", "#3a3a3f"],
    popularity: 94,
    kind: "tower",
  },
  {
    slug: "golden-gate-bridge",
    name: "Golden Gate Bridge",
    city: "San Francisco",
    country: "United States",
    completed: 1937,
    height_m: 227,
    style: "Suspension bridge with Art Deco towers",
    architect: "Joseph Strauss, chief engineer, with Charles Alton Ellis and Leon Moisseiff on the design and Irving Morrow on the towers and the colour",
    purpose: "A road bridge carrying US 101 across the Golden Gate strait between San Francisco and Marin County.",
    description:
      "The Golden Gate Bridge is a suspension bridge across the strait between San Francisco and Marin County, opened to the public on 27 May 1937 after construction that began on 5 January 1933. Its two towers stand 227 m above the water, the main span is 1,280 m and held the record until the Verrazzano-Narrows opened in 1964, and the roadway clears high water by an average of 67 m. Joseph Strauss was chief engineer and took the credit, but Charles Alton Ellis did the mathematical work, Leon Moisseiff advised on suspension design and Irving Morrow designed the shape of the towers and chose the International Orange paint. It cost more than $35 million and eleven men died building it, ten of them on 17 February 1937 when a scaffold fell.",
    fun_facts: [
      "The towers are 227 m above the water and the main span is 1,280 m; the roadway clears high water by an average of 67 m.",
      "The colour is International Orange, chosen by Irving Morrow over other proposals including the US Navy's suggestion of black and yellow stripes.",
      "A safety net slung under the deck saved nineteen men, who called themselves the Half Way to Hell Club; eleven others died in falls.",
      "The day before vehicles were allowed on, 200,000 people crossed the bridge on foot or on roller skates.",
    ],
    model_url: "/models/landmarks/golden-gate-bridge.glb",
    accent: ["#fbe6d8", "#8a2f14"],
    popularity: 93,
    kind: "bridge",
  },
  {
    slug: "mount-rushmore",
    name: "Mount Rushmore",
    city: "Keystone",
    country: "United States",
    completed: 1941,
    height_m: 18.3,
    style: "Colossal granite sculpture",
    architect: "Gutzon Borglum, with the work finished under his son Lincoln Borglum",
    purpose: "A national memorial: the heads of four United States presidents carved into a granite mountain in the Black Hills.",
    description:
      "Mount Rushmore is a national memorial in the Black Hills of South Dakota where the sculptor Gutzon Borglum carved 18.3 m heads of George Washington, Thomas Jefferson, Abraham Lincoln and Theodore Roosevelt into a granite mountain. Borglum was invited to find a site by the state historian Doane Robinson in 1924 and chose this one for its southeast face and the sunlight it gets; carving ran from 4 October 1927 until 31 October 1941. The money ran out before the original design was finished, which would have shown each president from head to waist, and Borglum died in March 1941, leaving his son Lincoln to complete what could be done. The four faces were dedicated separately — Washington on 4 July 1934, Jefferson in 1936, Lincoln on 17 September 1937 and Roosevelt in 1939 — and the whole project cost $989,992.32.",
    fun_facts: [
      "Carving ran from 4 October 1927 to 31 October 1941 and employed 400 workers; the whole project cost $989,992.32.",
      "Each face is 18.3 m high, and the memorial sits at 1,745 m above sea level.",
      "Thomas Jefferson was begun on rock that proved unsuitable, so that figure was dynamited and carved again elsewhere on the mountain.",
      "Calvin Coolidge spoke at the dedication on 10 August 1927 and promised federal money, which private fundraising had not produced.",
    ],
    model_url: "/models/landmarks/mount-rushmore.glb",
    accent: ["#e8e4dd", "#4c4a45"],
    popularity: 88,
    kind: "monument",
  },
  {
    slug: "cn-tower",
    name: "CN Tower",
    city: "Toronto",
    country: "Canada",
    completed: 1976,
    height_m: 553.3,
    style: "Modernist concrete communications tower",
    architect: "WZMH Architects — John Andrews, Webb Zerafa, Menkes Housden",
    purpose: "A television and radio mast for Toronto, with observation decks and a revolving restaurant.",
    description:
      "The CN Tower is a 553.3 m concrete communications and observation tower in downtown Toronto, built to lift broadcast antennas above the new skyscrapers that were spoiling reception, and opened on 26 June 1976 at a cost of CA$63 million. The height is measured to the top of the antenna; the roof of the main pod is at 457.2 m and the highest floor at 446.5 m. It was the world's tallest free-standing structure for 32 years, from 31 March 1975, while it was still being built, until the Burj Khalifa passed it on 12 September 2007, and the world's tallest tower until the Canton Tower took that title in 2009. A glass floor was installed at 342 m in 1994, and the EdgeWalk, which puts visitors on the roof of the main pod at 356 m, opened on 1 August 2011.",
    fun_facts: [
      "The tower is 553.3 m to the top of the antenna, with the pod roof at 457.2 m and the highest floor at 446.5 m.",
      "It was the tallest free-standing structure in the world for 32 years, from 31 March 1975 until 12 September 2007.",
      "The glass floor at 342 m was installed in 1994; the EdgeWalk outside the main pod at 356 m opened on 1 August 2011.",
      "It has 114 floors on paper, but only seven of them are in the main pod and one in the SkyPod.",
    ],
    model_url: "/models/landmarks/cn-tower.glb",
    accent: ["#dfe6ee", "#243a52"],
    popularity: 85,
    kind: "tower",
  },
  {
    slug: "chateau-frontenac",
    name: "Château Frontenac",
    city: "Quebec City",
    country: "Canada",
    completed: 1893,
    height_m: 79.9,
    style: "Châteauesque",
    architect: "Bruce Price, with the central tower of the 1920–24 expansion by William Sutherland Maxwell",
    purpose: "A grand railway hotel built by the Canadian Pacific Railway, and a hotel still.",
    description:
      "The Château Frontenac is a Châteauesque hotel on the cliff above the Saint Lawrence in Old Quebec, built by the Canadian Pacific Railway to a design by the American architect Bruce Price and opened on 18 December 1893. It stands 79.9 m at its highest, on ground that is itself 54 m above the river, which is why the heights quoted for it differ; the central tower that gives it its present silhouette was added in the expansion of 1920–24 led by William Sutherland Maxwell. The hotel was expanded twice more, in 1908–09 and again in 1993, and has 18 floors and 610 rooms. It was the tallest building in Quebec City from 1924 until 1930, and the Allies met there for the First and Second Quebec Conferences of 1943 and 1944.",
    fun_facts: [
      "The 1920–24 expansion, led by William Sutherland Maxwell, added the central tower and made the hotel the tallest building in Quebec City until 1930.",
      "It stands 79.9 m on ground 54 m above the Saint Lawrence, which is why published heights for the hotel differ.",
      "Roosevelt, Churchill and Mackenzie King met at the Château Frontenac for the First and Second Quebec Conferences in 1943 and 1944.",
      "It opened on 18 December 1893 under the Canadian Pacific Railway, and today has 18 floors and 610 guest rooms.",
    ],
    model_url: "/models/landmarks/chateau-frontenac.glb",
    accent: ["#ece1d3", "#4a2c2a"],
    popularity: 78,
    kind: "castle",
  },
  {
    slug: "christ-the-redeemer",
    name: "Christ the Redeemer",
    city: "Rio de Janeiro",
    country: "Brazil",
    completed: 1931,
    height_m: 30,
    style: "Art Deco",
    architect: "Paul Landowski and Heitor da Silva Costa, with Albert Caquot as engineer and Gheorghe Leonida for the face",
    purpose: "A monument to Christ on the peak of Corcovado, looking out over Rio de Janeiro.",
    description:
      "Christ the Redeemer is an Art Deco statue of Jesus on the peak of Corcovado, 700 m above Rio de Janeiro, dedicated on 12 October 1931. The figure is 30 m tall and 28 m across the arms and weighs 635 tonnes; with the pedestal beneath it the monument reaches 38 m, which is why two different heights are quoted for it. It was designed by the French-Polish sculptor Paul Landowski and the Brazilian engineer Heitor da Silva Costa, engineered with Albert Caquot and faced in soapstone over reinforced concrete, with the head and hands made by the Romanian sculptor Gheorghe Leonida. It was consecrated on 12 October 2006 and named one of the New Seven Wonders of the World on 7 July 2007.",
    fun_facts: [
      "The statue is 30 m tall and 28 m across the arms, and the pedestal takes the monument to 38 m in total.",
      "It weighs 635 tonnes and is faced in soapstone over reinforced concrete, the largest Art Deco sculpture in the world.",
      "It was dedicated on 12 October 1931, consecrated on the same date in 2006, and named a New Seven Wonder on 7 July 2007.",
      "The face and hands were carved by the Romanian sculptor Gheorghe Leonida, whom Landowski commissioned in Paris in 1922.",
    ],
    model_url: "/models/landmarks/christ-the-redeemer.glb",
    accent: ["#dbe8e2", "#2f5d4a"],
    popularity: 95,
    kind: "monument",
  },
  {
    slug: "moai",
    name: "Moai",
    city: "Easter Island",
    country: "Chile",
    completed: 1500,
    height_m: null,
    style: "Rapa Nui megalithic sculpture",
    architect: null,
    purpose: "Ancestor figures carved by the Rapa Nui people and set on stone platforms called ahu.",
    description:
      "The moai are the stone ancestor figures of Rapa Nui, carved between about 1250 and 1500 and set on stone platforms called ahu; they are a whole sculptural tradition rather than one structure, so this entry carries no height. More than 900 are known, and all but 53 were cut from the volcanic tuff of Rano Raraku, where 394 are still in the quarry in various states of completion. The average moai is about 4 m tall and weighs around 12.5 tonnes, but Paro, the largest ever raised on a platform, is 9.89 m long and about 82 tonnes. The year recorded here, 1500, is the end of the main carving period as the quarry evidence is read, not a date anyone recorded.",
    fun_facts: [
      "More than 900 moai are known; 394 are still in the quarry at Rano Raraku, and all but 53 of the rest were cut from its tuff.",
      "The average moai is about 4 m tall and 12.5 tonnes; Paro, the largest raised on a platform, is 9.89 m and about 82 tonnes.",
      "The figures face inland towards the villages, except the seven at Ahu Akivi, which face out to sea.",
      "Rapa Nui National Park became a UNESCO World Heritage Site in 1995, listed for the 887 statues recorded on the island.",
    ],
    model_url: "/models/landmarks/moai.glb",
    accent: ["#e5e1d6", "#4b463c"],
    popularity: 84,
    kind: "monument",
  },
  {
    slug: "uluru",
    name: "Uluru",
    city: "Petermann",
    country: "Australia",
    completed: 1985,
    height_m: null,
    style: "Not a building: an arkose sandstone inselberg laid down about 550 million years ago",
    architect: null,
    purpose: "A sacred site for the Aṉangu and the centre of a national park; a natural formation, not a structure.",
    description:
      "Uluru is a sandstone inselberg in the Northern Territory and not a building at all: it is arkose laid down around 550 million years ago, 348 m high, 863 m above sea level and 9.4 km around, so this entry carries no height. It has no completion date either, and the year recorded here, 1985, is the year the Australian government handed the title back to the Aṉangu on 26 October 1985, on condition that they lease it to the parks agency for 99 years and that it be jointly managed. The climb to the summit, which the Aṉangu had long asked visitors to forgo, closed on 26 October 2019 and the chain handhold fitted in 1964 was removed that November. UNESCO listed the site in 1987, and annual visitors passed 400,000 by 2000.",
    fun_facts: [
      "It stands 348 m above the surrounding plain and 863 m above sea level, with a perimeter of 9.4 km; most of its bulk is underground.",
      "Title was handed back to the Aṉangu on 26 October 1985, on a 99-year lease back to the parks agency with joint management.",
      "The climb closed on 26 October 2019 and the chain handhold put up in 1964 was removed that November.",
      "UNESCO listed it in 1987, and annual visitor numbers passed 400,000 by 2000.",
    ],
    model_url: "/models/landmarks/uluru.glb",
    accent: ["#f6d9a8", "#8a3b12"],
    popularity: 90,
    kind: "monument",
  },
  {
    slug: "sydney-harbour-bridge",
    name: "Sydney Harbour Bridge",
    city: "Sydney",
    country: "Australia",
    completed: 1932,
    height_m: 134,
    style: "Steel through arch bridge with granite-faced pylons",
    architect: "John Bradfield, chief engineer, with the detailed steel design by Dorman Long under Sir Ralph Freeman",
    purpose: "A road and rail bridge across Sydney Harbour between Dawes Point and Milsons Point.",
    description:
      "The Sydney Harbour Bridge is a steel through arch across Port Jackson, opened on 19 March 1932 after work that began with the turning of the first sod on 28 July 1923, and it still carries eight road lanes and two railway tracks between the city and the North Shore. It is 134 m from the top of the arch to the water and 1,149 m long, and its arch span is given as 503 m in the infobox and 504 m in the body of the same article, a metre apart depending on where the span is measured. John Bradfield was the driving engineer for the New South Wales Public Works department, but the detailed design was Dorman Long's, carried out by their consulting engineer Sir Ralph Freeman with Georges Imbault, and the question of who deserved the credit ended in a bitter public argument. Six million hand-driven rivets hold it together, and the four granite-faced pylons at the ends of the arch stand 89 m high.",
    fun_facts: [
      "It is 134 m from the top of the arch to the water and 1,149 m long, and the arch span is given as 503 m in one place and 504 m in another.",
      "Six million hand-driven rivets hold the bridge together, and the last of them was driven through the deck on 21 January 1932.",
      "The bridge cost AU£6.25 million in total, a debt that was not paid off until 1988.",
      "On opening day the public was allowed to walk across the deck, and estimates of the crowd run from 300,000 to a million people.",
    ],
    model_url: "/models/landmarks/sydney-harbour-bridge.glb",
    accent: ["#e2e7ea", "#33505f"],
    popularity: 89,
    kind: "bridge",
  },
];
