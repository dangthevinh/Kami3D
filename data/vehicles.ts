import type { CatalogEntry } from "./catalog-entry.ts";

/**
 * Vehicles: the fourth subject in the catalogue, and the first one that moves.
 *
 * ## The rule
 *
 * A vehicle belongs here when it is a **real, named machine, or a named class of them**, and it moves
 * people or freight from one place to another: a Boeing 747, a Tesla Model S, a Routemaster, not
 * "a jet", "a car" and "a bus". Where the subject is a class, a marque or a type rather than one
 * airframe - the Shinkansen, a Harley-Davidson, a road bicycle, a fire engine, a hot air balloon - the
 * entry says so in its description, and `metadata` carries **null** for every figure that is true of
 * one member of the class and false of the next. That is the same choice `data/landmarks/world-1.ts`
 * makes for the sites that are compounds rather than one structure.
 *
 * Rockets are deliberately absent. A launch vehicle is a Space entry, and a slug that exists in two
 * catalogues is a model downloaded twice.
 *
 * ## Where the numbers come from
 *
 * Every date, speed, length and weight below was checked on **2026-10-05** against the **English
 * Wikipedia article text, infobox and specification table** - the same source the landmark batches were
 * written from - and the article each figure came from is named in that entry's `metadata.source`.
 * Nothing here is estimated, converted by us, or rounded to look tidier. Where the source publishes a
 * range, or publishes a speed only as a Mach number, the entry follows the source and one of the
 * conventions below instead of inventing a single value.
 *
 * Four conventions, applied to every entry:
 *
 *   1. **`mass_kg` is the mass the source publishes**, whatever that mass is: maximum take-off weight
 *      for an aircraft, submerged displacement for a submarine, deadweight tonnage for a container ship,
 *      displacement for an ocean liner. The facts say which, and so does the source string.
 *   2. **`top_speed_kmh` is the fastest speed the source prints in km/h**, including its own conversion
 *      of a Mach number at the altitude it names - Mach numbers are given in the facts, because a Mach
 *      number has no single km/h value without an altitude and a temperature.
 *   3. **"Class or marque" entries carry null rather than one member's figures.** Where a figure that is
 *      true of the current model is useful, it is recorded and the fact names the model: the Corolla's
 *      length is the twelfth-generation saloon's, not a figure for twelve generations.
 *   4. **`first_built` is the year the source gives for the machine's first appearance**: the first
 *      flight for an aircraft, the first prototype or entry into service for a bus or a ship, the first
 *      machine built for a marque or a type.
 *
 * ## The figures that are argued over, and what was written instead
 *
 *   - **Formula 1 car, 375 km/h.** The article gives "up to 375 km/h" both for the current 1.6-litre
 *     turbo hybrid car and for the 3.0-litre V10 cars of 1989-2005. The fastest speed recorded at a
 *     Grand Prix weekend is a different number and is not what the article states, so it is not here.
 *   - **Boeing 747, 68.6 m and 377,842 kg.** The 747-200B figures, because that is the variant the
 *     article's specification section carries; the 747-8 is 76.3 m and heavier, and the entry describes
 *     the variant the source documents rather than a mixture of two.
 *   - **Boeing 747, 900 km/h.** The article's own conversion of the Mach 0.85 cruise speed. Its
 *     maximum, Mach 0.92, is never converted to km/h anywhere in the source, so the figure recorded is
 *     the cruise and the Mach figures are in the facts.
 *   - **Airbus A380, 903 km/h and 955 km/h.** The specification table converts Mach 0.85 to 903 km/h at
 *     43,000 ft and Mach 0.89 to 955 km/h at 34,000 ft. Those are the source's conversions, at the
 *     altitudes it prints them for; the entry does not convert anything itself.
 *   - **Concorde, 2,179 km/h.** The article gives the maximum as Mach 2.04, "temperature limited", and
 *     2,179 km/h. The same article's cruise figure, 2,158 km/h, is lower and is not the one recorded.
 *   - **Shinkansen, 320 km/h.** The speed trains have run regularly on the Tōhoku Shinkansen since 2014,
 *     not a record. The network's fastest conventional-rail run, 443 km/h, was a 1996 test by the Class
 *     955, and the 603 km/h of 2015 belongs to the L0 maglev - which is not a Shinkansen train, and says
 *     so in the fact that carries it.
 *   - **Toyota Corolla, 4,630 mm and 1,430 kg.** The twelfth-generation international saloon. A nameplate
 *     redesigned twelve times has no single length, so the entry records the current model's and the fact
 *     names the generation.
 *   - **Tesla Model S, 5,021 mm and 2,250 kg.** The infobox publishes a range for each - 4,980-5,021 mm
 *     and 4,323-4,960 lb - across fourteen model years. The entry records the top of each range, the
 *     longest and heaviest car the article covers, and the ranges themselves are in the facts.
 *   - **Emma Maersk, 14,770 TEU.** Maersk first advertised 11,000 TEU. The article explains that the two
 *     figures count containers of different weights, so both are given in the facts and the count, not a
 *     container weight, is what the entry states.
 *   - **Titanic, 39 km/h.** The article's conversion of "just under 21 knots", the maximum she reached on
 *     her trials, on which she averaged 18 knots (33 km/h). Some accounts give the class a higher top
 *     speed; nothing in the source does.
 *   - **Los Angeles class, 46.3 km/h.** The United States Navy's published line is "25+ knots (28+ miles
 *     per hour, 46.3+ kph)" and the real maximum is classified. Published estimates of 30-33 knots, and
 *     Tom Clancy's 37 knots, are estimates and are not recorded.
 *   - **Harley-Davidson, 1903.** The year the first machine was finished; the engine had been drawn in
 *     1901 and the first attempt could not climb Milwaukee's hills without pedalling.
 *   - **Road bicycle, 1885.** The year the source gives for the first chain-driven safety bicycle, which
 *     is the shape a road bike still has. It is not the year of the road bicycle as a named type, and the
 *     source does not give one.
 *   - **Fire engine, 1841.** The year the first self-propelled steam pumper was built, in New York. Hand
 *     and horse-drawn engines are far older - the article's history starts with a hand pump in the 2nd
 *     century BC and a compressed-air engine of 1650 - so 1841 dates the self-propelled engine, not the
 *     fire engine.
 *   - **Hot air balloon, 1783.** The year of the first free manned flight, 21 November. The Montgolfiers
 *     flew an unmanned balloon publicly on 4 June 1783 and a tethered flight carried a person in October.
 *
 * ## What is null, and why
 *
 *   - `top_speed_kmh` is null for the Harley-Davidson (the maker publishes no top speed), the Corolla
 *     (Toyota's published figures do not include one), the road bicycle (its speed is the rider's), the
 *     fire engine (its speed is whatever chassis it is built on) and the hot air balloon (it drifts with
 *     the wind; the 394 km/h in its facts is a ground-speed record set inside a jet stream, which belongs
 *     to that flight and not to the vehicle).
 *   - `length_m` is null for the Shinkansen (a network of many train types), the Harley-Davidson, the
 *     road bicycle, the fire engine and the hot air balloon, and `mass_kg` is null for the same five
 *     plus the Routemaster, whose source gives its weight only as three-quarters of a long ton less
 *     than the buses it replaced.
 *   - Emma Maersk publishes no displacement, so `mass_kg` carries her deadweight tonnage instead, which
 *     is a mass and is named as such in the source string.
 *
 * ## The name is the gate, so the name is short
 *
 * The slug is the model file name, so every slug is the kebab-case of the name the entry carries, and
 * `data/vehicles-queries.json` holds one search string per slug for the pipeline that finds the model.
 *
 * `lib/catalog-gate.ts` accepts a model only when **every word of the entry's name** appears in the
 * candidate's title, so the name is the thing the pipeline can actually find. Each name here is
 * therefore the shortest form a seller's title is likely to carry, and the fuller name lives in the
 * description, where a title gate cannot see it:
 *
 *   - **Titanic**, not "RMS Titanic" - a title that says only "Titanic" is the ship.
 *   - **Bell UH-1**, not "Bell UH-1 Iroquois" - the aircraft is almost always filed as the UH-1 or the
 *     Huey, and a title without the word "Iroquois" would be refused.
 *   - **Routemaster**, not "AEC Routemaster" - AEC built it and London Transport designed it, and the
 *     title that names the bus says "Routemaster".
 *   - **Harley-Davidson**, not "Harley-Davidson Motorcycle" - the entry is the marque, and demanding the
 *     word "motorcycle" would refuse every model filed under a model name.
 *   - **Formula 1 Car**, the name the gate's own check suite uses, and **Emma Maersk** rather than
 *     "Emma Mærsk": the gate folds a name to ASCII, and the Danish æ is not an ASCII letter, so the
 *     accented spelling would fold to "emma m rsk" and no title would ever match it.
 *
 * `kind` has no "truck" in its vocabulary, so the fire engine is filed as a **car**. It is the kind that
 * puts it on a road with wheels; the subtitle is where the entry says what it really is.
 */

export const VEHICLE_ENTRIES: CatalogEntry[] = [
  {
    slug: "formula-1-car",
    name: "Formula 1 Car",
    subtitle: "Car · Formula One",
    description:
      "A Formula 1 car is a single-seat, open-cockpit racing car built to the FIA's Formula One regulations, the rules that give the formula its name. The current cars carry a 1.6-litre turbocharged V6 with hybrid energy recovery, quoted at up to 710 kW (950 hp), inside a carbon-fibre monocoque. The rules cap the car at 5.63 m long, 2 m wide and 0.9 m high, and set a minimum weight of 798 kg including the driver, with dry-weather tyres fitted and no fuel aboard.",
    facts: [
      "The regulations set a minimum weight of 798 kg including the driver, with dry-weather tyres fitted and no fuel aboard.",
      "A car may be no longer than 5.63 m, no wider than 2 m and no taller than 0.9 m under the current rules.",
      "The 1.6-litre turbo hybrid V6 is quoted at up to 710 kW (950 hp), and the car at speeds of up to 375 km/h.",
      "A modern car makes downforce equal to twice its own weight at 190 km/h, and brakes from 100 km/h to a stop in under 15 m.",
    ],
    model_url: "/models/vehicles/formula-1-car.glb",
    accent: ["#f0e6e6", "#8c1d1d"],
    popularity: 88,
    metadata: {
      kind: "car",
      first_built: 1950,
      top_speed_kmh: 375,
      length_m: 5.63,
      mass_kg: 798,
      operator_or_maker: "Built by the constructors entered in the FIA Formula One World Championship",
      source:
        "Wikipedia, \"Formula One car\" (design and performance sections) and \"Formula One\" (1950 first World Championship), checked 2026-10-05",
    },
  },
  {
    slug: "boeing-747",
    name: "Boeing 747",
    subtitle: "Airliner · Jet",
    description:
      "The Boeing 747 was the first wide-body airliner and the first aircraft the press called a jumbo jet, with a partial second deck and a raised cockpit that let the nose swing up for freight. It first flew on 9 February 1969, entered service with Pan Am on 22 January 1970, and stayed the largest passenger airliner in service until the Airbus A380 arrived in 2007. The figures here are the 747-200B, the variant the source documents: 68.6 m long, 377,842 kg at maximum take-off weight, cruising at Mach 0.85.",
    facts: [
      "It first flew on 9 February 1969 and entered service with Pan Am on 22 January 1970.",
      "The 747-200B is 68.6 m long with a 59.6 m wingspan, and weighs 377,842 kg (833,000 lb) at maximum take-off.",
      "Its cruise speed is Mach 0.85, which the source converts to 900 km/h, and its maximum speed is given as Mach 0.92.",
      "It carries 366 passengers in three classes with a ten-abreast economy cabin, plus five cargo pallets and fourteen containers.",
    ],
    model_url: "/models/vehicles/boeing-747.glb",
    accent: ["#dfe9f2", "#1c3f6e"],
    popularity: 90,
    metadata: {
      kind: "aircraft",
      first_built: 1969,
      top_speed_kmh: 900,
      length_m: 68.6,
      mass_kg: 377842,
      operator_or_maker: "Boeing",
      source: "Wikipedia, \"Boeing 747\" (747-200B specifications), checked 2026-10-05",
    },
  },
  {
    slug: "airbus-a380",
    name: "Airbus A380",
    subtitle: "Airliner · Jet",
    description:
      "The Airbus A380 is the largest passenger airliner anyone has built and the only full-length double-deck jet, with two complete passenger decks running the whole fuselage. It first flew on 27 April 2005, entered service with Singapore Airlines on 25 October 2007, and production ended in 2021 after 254 aircraft. The A380-800 is 72.72 m long, weighs 575 t at maximum take-off, and the source gives its cruise as Mach 0.85, which its own conversion puts at 903 km/h at 43,000 ft.",
    facts: [
      "It is the only airliner with two full-length passenger decks, and the largest passenger aircraft ever built.",
      "The A380-800 is 72.72 m long with a 79.75 m wingspan, and weighs 575 t (1,268,000 lb) at maximum take-off.",
      "Its typical cruise is Mach 0.85, which the source converts to 903 km/h at 43,000 ft; its maximum is given as Mach 0.89 (955 km/h).",
      "It entered service on 25 October 2007, and the last aircraft was delivered to Emirates on 16 December 2021.",
    ],
    model_url: "/models/vehicles/airbus-a380.glb",
    accent: ["#e3ecf6", "#26456e"],
    popularity: 87,
    metadata: {
      kind: "aircraft",
      first_built: 2005,
      top_speed_kmh: 955,
      length_m: 72.72,
      mass_kg: 575000,
      operator_or_maker: "Airbus",
      source: "Wikipedia, \"Airbus A380\" (A380-800 specifications table), checked 2026-10-05",
    },
  },
  {
    slug: "concorde",
    name: "Concorde",
    subtitle: "Airliner · Supersonic",
    description:
      "Concorde was the Anglo-French supersonic airliner, an ogival delta with four Rolls-Royce/Snecma Olympus 593 turbojets, reheat for the transonic push and a drooping nose so the crew could see the runway. It first flew from Toulouse on 2 March 1969 and entered service on 21 January 1976, and only twenty were built. It is 61.66 m long, weighed 185,070 kg at maximum take-off, and its maximum speed is given as Mach 2.04, which the source converts to 2,179 km/h.",
    facts: [
      "Its maximum speed is given as Mach 2.04 (2,179 km/h) and is temperature limited; its cruise is lower at 2,158 km/h.",
      "It first flew from Toulouse on 2 March 1969 and entered service on 21 January 1976 with Air France and British Airways.",
      "Only twenty were built, and the two state airlines that ordered them were the only operators they ever had.",
      "It is 61.66 m long with a 25.6 m wingspan, and weighed 185,070 kg at maximum take-off.",
    ],
    model_url: "/models/vehicles/concorde.glb",
    accent: ["#eef0f4", "#3a3f52"],
    popularity: 89,
    metadata: {
      kind: "aircraft",
      first_built: 1969,
      top_speed_kmh: 2179,
      length_m: 61.66,
      mass_kg: 185070,
      operator_or_maker: "Aérospatiale and the British Aircraft Corporation",
      source: "Wikipedia, \"Concorde\" (specifications and development), checked 2026-10-05",
    },
  },
  {
    slug: "shinkansen",
    name: "Shinkansen",
    subtitle: "Train · High-speed rail",
    description:
      "The Shinkansen is Japan's high-speed rail network, opened as the Tōkaidō Shinkansen on 1 October 1964, shortly before the Tokyo Olympics, on a line built for high speed rather than adapted from an older one. Its first trains, the 0 series, ran at up to 210 km/h, and trains have run regularly at up to 320 km/h on the Tōhoku Shinkansen since 2014. No length and no weight are recorded here, because the Shinkansen is a network of many train types rather than one vehicle.",
    facts: [
      "The first line, the Tōkaidō Shinkansen, opened on 1 October 1964, shortly before the Tokyo Olympics.",
      "The 0 series ran at up to 210 km/h, later raised to 220 km/h; more than 3,200 cars were built and the type was withdrawn in 2008.",
      "Trains have run regularly at up to 320 km/h on the Tōhoku Shinkansen since 2014, the highest scheduled speed on the network.",
      "The fastest conventional-rail run on the network is 443 km/h, set by the Class 955 in 1996; the 603 km/h of 2015 belongs to the L0 maglev, not a Shinkansen train.",
    ],
    model_url: "/models/vehicles/shinkansen.glb",
    accent: ["#e6f0f4", "#1f4a5c"],
    popularity: 85,
    metadata: {
      kind: "train",
      first_built: 1964,
      top_speed_kmh: 320,
      length_m: null,
      mass_kg: null,
      operator_or_maker: "Japan Railways Group (JR Group)",
      source: "Wikipedia, \"Shinkansen\" (opening date and operating speeds), checked 2026-10-05",
    },
  },
  {
    slug: "toyota-corolla",
    name: "Toyota Corolla",
    subtitle: "Car · Compact",
    description:
      "The Toyota Corolla has been in production since 1966 and is the best-selling car nameplate of all time, passing the Volkswagen Beetle in 1997. Toyota reached 50 million Corollas over twelve generations in 2021 and had sold more than 54 million by early 2026. The length and weight recorded here are the twelfth-generation international saloon, 4,630 mm long and between 1,290 and 1,430 kg, because a nameplate redesigned twelve times has no single size.",
    facts: [
      "The first generation appeared in November 1966 with a new 1,100 cc K pushrod engine, and the Sprinter fastback followed in 1968.",
      "Toyota reached 50 million Corollas over twelve generations in 2021, and more than 54 million by early 2026.",
      "The twelfth-generation international saloon is 4,630 mm long on a 2,700 mm wheelbase, and weighs 1,290-1,430 kg.",
      "It overtook the Volkswagen Beetle in 1997 as the best-selling automobile nameplate of all time.",
    ],
    model_url: "/models/vehicles/toyota-corolla.glb",
    accent: ["#e9eef2", "#3d4a55"],
    popularity: 86,
    metadata: {
      kind: "car",
      first_built: 1966,
      top_speed_kmh: null,
      length_m: 4.63,
      mass_kg: 1430,
      operator_or_maker: "Toyota Motor Corporation",
      source:
        "Wikipedia, \"Toyota Corolla\" (production history) and \"Toyota Corolla (E210)\" (twelfth-generation saloon dimensions), checked 2026-10-05",
    },
  },
  {
    slug: "tesla-model-s",
    name: "Tesla Model S",
    subtitle: "Car · Electric",
    description:
      "The Tesla Model S is the battery-electric saloon that made a long-range electric car an ordinary thing to own, in production from 2012 until May 2026. The 2021 update brought the three-motor Plaid, quoted at 760 kW (1,020 hp), a 0-60 mph time of 1.98 seconds and a maximum speed of 200 mph. The source publishes its length and weight as ranges rather than single figures, so the entry records the top of each and the facts give the ranges.",
    facts: [
      "The Plaid uses three permanent magnet motors producing 760 kW (1,020 hp) in total, and reaches 60 mph in 1.98 seconds.",
      "Its maximum speed is quoted at 200 mph (322 km/h), and the stated range at 390 miles (630 km).",
      "The source gives the length as 4,980-5,021 mm and the weight as 4,323-4,960 lb (1,961-2,250 kg) across model years.",
      "Series production began at the Fremont factory in June 2012, and Tesla ended production of the car in May 2026.",
    ],
    model_url: "/models/vehicles/tesla-model-s.glb",
    accent: ["#f2e6e6", "#8f1f22"],
    popularity: 84,
    metadata: {
      kind: "car",
      first_built: 2012,
      top_speed_kmh: 322,
      length_m: 5.021,
      mass_kg: 2250,
      operator_or_maker: "Tesla, Inc.",
      source:
        "Wikipedia, \"Tesla Model S\" (infobox dimensions and weight, Plaid performance), checked 2026-10-05",
    },
  },
    {
    slug: "titanic",
    name: "Titanic",
    subtitle: "Ship · Ocean liner",
    description:
      "RMS Titanic was a White Star Line ocean liner of the Olympic class, 269.06 m long and 52,310 tonnes of displacement, and the largest ship afloat when she entered service in 1912. She struck an iceberg on her maiden voyage from Southampton to New York and sank in the early hours of 15 April 1912, with about 1,500 of the 2,208 people aboard dying. Her trials recorded an average of 18 knots and a maximum of just under 21 knots, which the source converts to 39 km/h.",
    facts: [
      "She was 269.06 m long and displaced 52,310 tonnes, and measured 46,329 gross register tons.",
      "She sank in the early hours of 15 April 1912 after hitting an iceberg on her maiden voyage; about 1,500 of the 2,208 aboard died.",
      "Her trials averaged 18 knots (33 km/h) over 80 nautical miles and reached a maximum of just under 21 knots (39 km/h).",
      "She was the second of three Olympic-class liners, all built by Harland and Wolff in Belfast.",
    ],
    model_url: "/models/vehicles/titanic.glb",
    accent: ["#e4e9ee", "#26404f"],
    popularity: 93,
    metadata: {
      kind: "ship",
      first_built: 1912,
      top_speed_kmh: 39,
      length_m: 269.06,
      mass_kg: 52310000,
      operator_or_maker: "Harland and Wolff for the White Star Line",
      source: "Wikipedia, \"Titanic\" (dimensions and sea trials), checked 2026-10-05",
    },
  },
  {
    slug: "harley-davidson",
    name: "Harley-Davidson",
    subtitle: "Motorcycle · American V-twin",
    description:
      "Harley-Davidson's first motorcycle was a motorised pedal bicycle with a 116 cc single, drawn up by William S. Harley in 1901 and finished in 1903, and it could not climb the hills around Milwaukee without pedal assistance. The next machine, with a 405 cc engine and a loop frame, took the design out of the motorised-bicycle class and set the pattern the marque has followed since. No top speed, length or weight is recorded here, because the entry covers the maker's machines as a group and Harley-Davidson publishes no top speed for them.",
    facts: [
      "The first engine William S. Harley drew in 1901 displaced 7.07 cubic inches (116 cc) and turned four-inch flywheels.",
      "Some 90,000 military motorcycles, mostly WLA and WLC models, were built for the Second World War.",
      "The WLA was the military version of the 45-cubic-inch (740 cc) WL line, and its A stood for Army.",
      "In 1921 Otto Walker won a race on a Harley-Davidson at an average speed above 100 mph (160 km/h), a first for a motorcycle.",
    ],
    model_url: "/models/vehicles/harley-davidson.glb",
    accent: ["#efe9e3", "#4a3524"],
    popularity: 88,
    metadata: {
      kind: "motorcycle",
      first_built: 1903,
      top_speed_kmh: null,
      length_m: null,
      mass_kg: null,
      operator_or_maker: "Harley-Davidson Motor Company",
      source: "Wikipedia, \"Harley-Davidson\" (history section), checked 2026-10-05",
    },
  },
  {
    slug: "bell-uh-1",
    name: "Bell UH-1",
    subtitle: "Helicopter · Utility",
    description:
      "The Bell UH-1 Iroquois, known to everyone as the Huey, was the first turbine-powered helicopter to go into production for the United States Army, and it became the transport helicopter of the Vietnam War. Its prototype first flew on 20 October 1956 and the Army placed a production contract in 1959. The UH-1H is 17.618 m long with its rotors turning, weighs 4,309 kg at maximum take-off, and turns in a main rotor 14.63 m across.",
    facts: [
      "The UH-1H is 17.618 m long with rotors turning, and its main rotor is 14.63 m in diameter.",
      "Its maximum speed at maximum take-off weight is 204 km/h (127 mph), which is also its never-exceed speed at that weight.",
      "Empty weight is 2,363 kg and maximum take-off weight is 4,309 kg, leaving 1,760 kg for troops, stretchers or cargo.",
      "The prototype XH-40 first flew on 20 October 1956, and the Army ordered 182 HU-1As in 1959.",
    ],
    model_url: "/models/vehicles/bell-uh-1.glb",
    accent: ["#e7ece4", "#3c4a32"],
    popularity: 78,
    metadata: {
      kind: "helicopter",
      first_built: 1956,
      top_speed_kmh: 204,
      length_m: 17.618,
      mass_kg: 4309,
      operator_or_maker: "Bell Helicopter",
      source: "Wikipedia, \"Bell UH-1 Iroquois\" (UH-1H specifications from Jane's), checked 2026-10-05",
    },
  },
    {
    slug: "road-bicycle",
    name: "Road Bicycle",
    subtitle: "Bicycle · Road",
    description:
      "A road bicycle is built to travel fast on paved roads, and it is a consistent set of choices: narrow high-pressure tyres, dropped handlebars that lean the rider forward, derailleur gears and a frame of aluminium alloy or carbon fibre. The pattern is old, because the basic shape of the safety bicycle has changed little since the first chain-driven model appeared around 1885, and it is efficient, with up to 99% of the power a rider puts into the pedals reaching the wheels. No top speed or weight is recorded here, because a bicycle's speed is its rider's and its weight depends on what it is built from.",
    facts: [
      "Up to 99% of the energy a rider puts into the pedals reaches the wheels, though gearing can take another 10-15%.",
      "The basic shape of the safety bicycle has changed little since the first chain-driven model appeared around 1885.",
      "A carbon fibre frame can weigh less than 2 pounds (1 kg), and pneumatic tyres and chain drive both began on bicycles.",
      "Road bicycles use narrow, smooth, high-pressure tyres and dropped handlebars to cut rolling resistance and air drag.",
    ],
    model_url: "/models/vehicles/road-bicycle.glb",
    accent: ["#e9f0e6", "#2f4a2c"],
    popularity: 70,
    metadata: {
      kind: "bicycle",
      first_built: 1885,
      top_speed_kmh: null,
      length_m: null,
      mass_kg: null,
      operator_or_maker: "Many manufacturers",
      source: "Wikipedia, \"Road bicycle\" and \"Bicycle\" (construction and efficiency), checked 2026-10-05",
    },
  },
  {
    slug: "routemaster",
    name: "Routemaster",
    subtitle: "Bus · London double-decker",
    description:
      "The AEC Routemaster is the London double-decker with the open rear platform, designed by London Transport and built by AEC and Park Royal Vehicles over the fourteen years after 1954. The first prototype was finished in September 1954 and the first bus entered service on 8 February 1956; the last was delivered in 1968 and the type stayed in regular service until December 2005. Most were 27 ft 6 in long and seated 64, on an integral aluminium body with independent front suspension, power steering and a fully automatic gearbox.",
    facts: [
      "The first prototype was completed in September 1954, the first bus entered service on 8 February 1956, and the last was delivered in 1968.",
      "The standard bus was 27 ft 6 in (8.38 m) long; the lengthened RML was 30 ft (9.14 m), and 24 were built as a trial from 1961.",
      "The last Routemasters were withdrawn from regular service in December 2005, after nearly fifty years of work.",
      "It seated 64 passengers and was three-quarters of a long ton lighter than the RT-family buses it replaced, which seated 56.",
    ],
    model_url: "/models/vehicles/routemaster.glb",
    accent: ["#f3e6e6", "#8c1f1f"],
    popularity: 76,
    metadata: {
      kind: "bus",
      first_built: 1954,
      top_speed_kmh: null,
      length_m: 8.38,
      mass_kg: null,
      operator_or_maker: "London Transport; built by AEC and Park Royal Vehicles",
      source: "Wikipedia, \"AEC Routemaster\" (design, prototypes and lengths), checked 2026-10-05",
    },
  },
  {
    slug: "fire-engine",
    name: "Fire Engine",
    subtitle: "Fire engine · Road vehicle",
    description:
      "A fire engine is a truck built to carry firefighters, water and equipment to a fire, and the trade divides it into engines, which carry their own water, and aerial apparatus, which carries a boom or a turntable ladder. The history is long: Hans Hautsch built a compressed-air engine in 1650 that threw a jet 20 m high, Richard Newsham's London engines reached New York by 1731, and the first self-propelled steam pumper was built in New York in 1841. No top speed, length or weight is recorded here, because an appliance is sized to its chassis and to the rules of the service that orders it.",
    facts: [
      "The first self-propelled steam pumper fire engine was built in New York in 1841.",
      "Hans Hautsch's compressed-air engine of 1650 used fourteen men a side on one piston rod and threw water up to 20 m.",
      "Richard Newsham's London fire engines reached New York City in 1731, and Thomas Lote built the first American-made engine in 1743.",
      "Sellers and Pennock's 1822 Hydraulion is described as the first suction engine, the change that made the bucket brigade obsolete.",
    ],
    model_url: "/models/vehicles/fire-engine.glb",
    accent: ["#f2e7e2", "#8a2b16"],
    popularity: 68,
    metadata: {
      kind: "car",
      first_built: 1841,
      top_speed_kmh: null,
      length_m: null,
      mass_kg: null,
      operator_or_maker: "Many builders; the first self-propelled example was built in New York in 1841",
      source: "Wikipedia, \"Fire engine\" (history and types), checked 2026-10-05",
    },
  },
  {
    slug: "hot-air-balloon",
    name: "Hot Air Balloon",
    subtitle: "Balloon · Lighter than air",
    description:
      "A hot air balloon is an envelope of heated air with a basket hung beneath it, kept up by the burner and steered only by choosing a height where the wind is blowing the way the pilot wants to go. The Montgolfier brothers demonstrated one publicly on 4 June 1783, and Jean-François Pilâtre de Rozier and François Laurent d'Arlandes made the first free manned flight in one on 21 November 1783. It has no speed, length or weight of its own, so the figures in its facts belong to the flights that set them.",
    facts: [
      "The first free manned flight was made over Paris on 21 November 1783 by Pilâtre de Rozier and d'Arlandes, in a balloon built by the Montgolfier brothers.",
      "The hot air balloon altitude record is 21,027 m (68,986 ft), set by Vijaypat Singhania on 26 November 2005.",
      "The Virgin Pacific Flyer recorded the fastest ground speed for a manned balloon at 394 km/h (245 mph) in 1991, with a 74,000 cubic metre envelope.",
      "The first modern hot air balloon built in the United Kingdom was the Bristol Belle, in 1967.",
    ],
    model_url: "/models/vehicles/hot-air-balloon.glb",
    accent: ["#f4ece0", "#8a5a1f"],
    popularity: 66,
    metadata: {
      kind: "balloon",
      first_built: 1783,
      top_speed_kmh: null,
      length_m: null,
      mass_kg: null,
      operator_or_maker: "Montgolfier brothers",
      source: "Wikipedia, \"Hot air balloon\" (history and records), checked 2026-10-05",
    },
  },
];
