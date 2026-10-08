import type { CatalogEntry } from "./catalog-entry.ts";

/**
 * Space, batch space-1 — sixteen entries in two groups: ten bodies of the Solar System, and six
 * machines NASA built and flew. The subtitle is what tells them apart on a card: "Star · Solar
 * System", "Planet · Solar System" and "Moon · Earth's" for the first group, "Space Station · NASA",
 * "Telescope · NASA", "Telescope · NASA/ESA/CSA", "Rover · NASA", "Rocket · NASA" and
 * "Spacecraft · NASA" for the second.
 *
 * ## Where the numbers come from
 *
 *   - **Group A, every figure in `metadata` and most of the prose: the NASA Planetary Fact Sheet**
 *     (nssdc.gsfc.nasa.gov/planetary/factsheet/), whose comparison table carries mass (10^24 kg),
 *     diameter (km), distance from the Sun (10^6 km), length of day (hours), orbital period (days),
 *     mean temperature (C) and number of moons for every body named here. The page dates itself
 *     "Last Updated: 9 May 2024". The Sun is **not** in that table: its figures come from the Sun
 *     Fact Sheet on the same site (nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html), which is
 *     also where the one Earth figure the two pages disagree about comes from.
 *   - **Group A, the mission facts: NASA Science pages** (science.nasa.gov/mercury, /venus, /moon,
 *     /jupiter, /saturn, /uranus, /neptune) and nasa.gov/mission/apollo-11/ for the landing date.
 *   - **Group B: NASA's own mission and reference pages** — the station's Facts and Figures page and
 *     the agency's station reference, "Hubble by the numbers", the Webb fact page
 *     (webb.nasa.gov/content/about/faqs/facts.html), the Curiosity mission page, the Saturn V
 *     explainer for grades 5-8, and the Voyager 1 mission page. Saturn V is here rather than the
 *     Apollo Lunar Module or the Space Shuttle because that explainer is the page that states its
 *     height, mass, thrust and payload figures in one place.
 *
 * Every page above was read on **2026-10-05**, and each entry's `metadata.source` names the page its
 * own figures came from. Nothing here is remembered, guessed from a photograph, or averaged between
 * two sources. A figure that could not be read on a page is null and is not mentioned in the prose
 * either; the four nulls are listed at the end of this comment.
 *
 * ## The contested figures, and what was written instead
 *
 *   - **Earth's mass, 5.97 x 10^24 kg, and diameter, 12,756 km.** Both are the planetary fact
 *     sheet's. The same site's Sun fact sheet carries an Earth column that gives the mass as
 *     5.9722 x 10^24 kg and a volumetric mean radius of 6,371 km, which is a diameter of 12,742 km
 *     - so two NASA pages differ in the third digit and by 14 km respectively. The planetary fact
 *     sheet is the one used for the planet, and the other figure is in the facts rather than quietly
 *     dropped.
 *   - **The Sun's diameter, 1,391,400 km.** The Sun fact sheet has no diameter row; this is twice
 *     its volumetric mean radius of 695,700 km. Sources that print 1,392,700 km are using a larger
 *     radius for the same body, and neither page here settles which is right.
 *   - **The Sun's temperature, 5,499 C.** The Sun fact sheet gives the photosphere's effective
 *     temperature as 5,772 K, and 5,499 is that converted, not a separately published figure. The
 *     round "5,500 C" seen elsewhere is the same number.
 *   - **The Sun's day, 609.12 hours.** A star has no day, so this is the Sun fact sheet's sidereal
 *     rotation period, adopted at 16 degrees of latitude. The same page prints the formula showing
 *     the rate varies with latitude, so the number is one latitude's period standing for the disc.
 *   - **Venus's day, 5,832.5 hours.** The fact sheet's rotation row is negative for Venus, which is
 *     how it records a retrograde spin; the sign is dropped in `day_length_hours` and the retrograde
 *     direction is stated in the prose. Its length-of-day row, 2,802.0 hours, is a different
 *     measurement - the solar day - and is not the figure used.
 *   - **The Moon's distance, 384,000 km.** The fact sheet's 0.384 x 10^6 km, in the row the asterisk
 *     marks as distance from Earth. Written as the row gives it, with nothing rounded on top.
 *   - **The Moon's year, 27.3 days.** For a moon that is its orbital period around Earth, which is
 *     what the fact sheet's asterisked orbital-period row measures, and not a year around the Sun.
 *     Its rotation period, 655.7 hours, is the same period and is where the fact that one face
 *     always points at us comes from.
 *   - **Saturn's moons, 274.** The current fact sheet figure, and a moving target: NASA's own Saturn
 *     page will not commit to a number, saying only that Saturn has "dozens of officially recognized
 *     moons in its orbit, more than any other planet". Written as the table gives it on the day it
 *     was read.
 *   - **Uranus's moons, 28.** The fact sheet says 28 and NASA's Uranus page says 28 in its moons
 *     section, then captions its own Webb image with "9 of the planet's 27 moons". The two figures
 *     are on the same page, so the entry uses the one the table and the moons section agree on and
 *     the disagreement is written into the facts.
 *   - **Hubble's mass and length, 12,200 kg and 13 m.** Both are NASA's "Hubble by the numbers",
 *     whose statistics are dated 1 March 2024 rather than to launch, and 43 feet is 13.1 m. This is
 *     the figure NASA publishes for the observatory; a different mass is quoted in other places and
 *     no page read here sources it, so it is not repeated.
 *   - **The station's length, 109 m.** Its Facts and Figures page gives "356 feet (109 meters)
 *     end-to-end" and gives the solar array wingspan as the same 356 feet (109 meters), while the
 *     agency's station reference measures the structure as 109 m across the arrays by 51 m from the
 *     forward end of PMA2 to the aft end of the service module. The two spans are not the same span,
 *     so 109 m is used as the length and the 51 m is stated in the paragraph that means it.
 *   - **Saturn V's height, 111 m.** NASA's explainer prints "111 meters (363 feet)", and 363 feet is
 *     110.6 m; the page rounds up. The 363 feet is carried in the facts so both figures are visible.
 *   - **Webb's mass, 6,200 kg.** NASA's fact page calls it "Total Payload Mass, including
 *     observatory, on-orbit consumables and launch vehicle adaptor", so it is not the observatory
 *     alone, and the fact that says so travels with the number.
 *   - **Curiosity's length, 3.05 m.** The mission page gives 10 feet long, 9 feet wide and 7 feet
 *     tall; 3.05 m is those 10 feet converted, the only metric figure in the row.
 *   - **Group B's operators.** Webb is NASA/ESA/CSA because its own mission page lists those three
 *     partners. Hubble's operator is written as NASA because every page read here calls it NASA's
 *     Hubble Space Telescope and none of them states the European Space Agency's share in a sentence
 *     worth quoting; ESA's own pages are branded ESA/Hubble, but a brand is not a source.
 *   - **The station's `kind` is "spacecraft".** The four kinds this batch allows do not include
 *     space station, so the station carries the kind its shape belongs to and the subtitle says what
 *     it is.
 *   - **The Sun's `moons` is 0 and its `distance_from_sun_km` is 0.** Neither is a measurement: the
 *     Sun is the point that distance is measured from, and a star holds no natural satellites, so
 *     the fact sheet has no row for either. They are 0 because both are true by definition.
 *   - **Pluto is not here.** The fact sheet's table carries it, and the batch is the ten bodies
 *     above; NASA's own site files Pluto under "Pluto & Dwarf Planets", not with the eight.
 *
 * ## The four figures left null
 *
 *   - `moon.distance_from_sun_km` - the fact sheet's asterisked row is the distance from **Earth**,
 *     which is the entry's `distance_from_earth_km`; a moon's distance from the Sun is not a row any
 *     page read here publishes, and the Moon's distance from Earth swings by more than 40,000 km over
 *     one orbit, so a single number would mislead in any case. This one is null by the shape of the
 *     entry.
 *   - `sun.year_length_days` - the Sun does not orbit the Sun.
 *   - `james-webb-space-telescope.length_m` - NASA publishes the 6.5 m mirror and the 21.197 m by
 *     14.162 m sunshield, which is a deployed span and not a length; no page read here gives the
 *     observatory an overall length, so the field is null rather than borrowing the sunshield's
 *     longest dimension.
 *   - `voyager-1.length_m` - the Voyager 1 mission page gives mass, power and instruments, and no
 *     overall length at all.
 *
 * The slugs are the model file names, so each is the kebab-case of the name the entry carries, and
 * the pipeline only accepts a model whose own title names the subject.
 */

export const SPACE_ENTRIES: CatalogEntry[] = [
  {
    slug: "sun",
    name: "Sun",
    subtitle: "Star · Solar System",
    description:
      "The Sun is the star at the centre of the Solar System, and the body whose gravity holds everything else in orbit around it. The Sun Fact Sheet measures it at a volumetric mean radius of 695,700 km, 109.2 times Earth's, and gives its mass as 332,900 times Earth's. Its surface is not solid and does not turn as one thing: the adopted rotation period of 609.12 hours is the figure at 16 degrees of latitude, and the same page prints the formula showing the real rate varies with latitude.",
    facts: [
      "Its mass is 1,988,400 x 10^24 kg, which the fact sheet's own ratio column gives as 332,900 times the mass of Earth.",
      "The diameter is 1,391,400 km, twice the volumetric mean radius of 695,700 km that the Sun Fact Sheet publishes.",
      "The effective temperature of the photosphere is 5,772 K, which is 5,499 degrees Celsius.",
      "The rotation period adopted for the disc is 609.12 hours at 16 degrees of latitude, and the sunspot cycle runs about 11.4 years.",
    ],
    model_url: "/models/space/sun.glb",
    accent: ["#ffe9a8", "#c9680a"],
    popularity: 98,
    metadata: {
      kind: "star",
      diameter_km: 1391400,
      mass_kg: 1.9884e30,
      distance_from_sun_km: 0,
      day_length_hours: 609.12,
      year_length_days: null,
      moons: 0,
      mean_temperature_c: 5499,
      source: "NASA Sun Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "mercury",
    name: "Mercury",
    subtitle: "Planet · Solar System",
    description:
      "Mercury is the smallest planet in the Solar System and the closest to the Sun, orbiting it once every 88.0 days at a mean distance of 57.9 million km. The NASA Planetary Fact Sheet gives it a diameter of 4,879 km, a mean temperature of 167 °C and no moons at all. Its day is the odd part: one solar day lasts 4,222.6 hours, because the planet turns on its axis far more slowly than it travels, and it is the planet the fact sheet measures as the fastest to go round the Sun.",
    facts: [
      "Mercury's diameter is 4,879 km, only slightly larger than the Moon's 3,475 km, and the fact sheet gives it no moons.",
      "It orbits the Sun every 88.0 days at a mean distance of 57.9 million km, faster than any other planet in the table.",
      "A solar day on Mercury lasts 4,222.6 hours, which is just short of twice its 88.0-day year.",
      "NASA's Mariner 10 was the first spacecraft to visit Mercury, and MESSENGER flew past it three times before orbiting for four years.",
    ],
    model_url: "/models/space/mercury.glb",
    accent: ["#dcd6cf", "#4a423c"],
    popularity: 82,
    metadata: {
      kind: "planet",
      diameter_km: 4879,
      mass_kg: 3.3e23,
      distance_from_sun_km: 57900000,
      day_length_hours: 4222.6,
      year_length_days: 88,
      moons: 0,
      mean_temperature_c: 167,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "venus",
    name: "Venus",
    subtitle: "Planet · Solar System",
    description:
      "Venus is the second planet from the Sun and the hottest body in the fact sheet's table, with a mean surface temperature of 464 °C beneath a surface pressure of 92 bars of carbon dioxide. It measures 12,104 km across and has a mass of 4.87 x 10^24 kg, close to Earth's. It also turns the wrong way and slowly: one rotation takes 5,832.5 hours, longer than the 224.7-day year it takes to go round the Sun.",
    facts: [
      "Venus has a mean surface temperature of 464 °C, the hottest of any body in the fact sheet's table.",
      "It rotates once every 5,832.5 hours, a retrograde turn longer than its own 224.7-day year.",
      "Its diameter is 12,104 km, it has no moons, and the surface pressure is 92 bars.",
      "NASA's Mariner 2 was the first spacecraft to visit any planet beyond Earth, flying past Venus on 14 December 1962.",
    ],
    model_url: "/models/space/venus.glb",
    accent: ["#f6e3c0", "#8a5a1e"],
    popularity: 84,
    metadata: {
      kind: "planet",
      diameter_km: 12104,
      mass_kg: 4.87e24,
      distance_from_sun_km: 108200000,
      day_length_hours: 5832.5,
      year_length_days: 224.7,
      moons: 0,
      mean_temperature_c: 464,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "earth",
    name: "Earth",
    subtitle: "Planet · Solar System",
    description:
      "Earth is the third planet from the Sun and the largest of the four rocky ones, with a mean temperature of 15 °C and a single moon. The NASA Planetary Fact Sheet gives it a diameter of 12,756 km and a mass of 5.97 x 10^24 kg, while the Earth column of the same site's Sun Fact Sheet gives 5.9722 x 10^24 kg and a radius that works out to 12,742 km. It orbits at a mean distance of 149.6 million km, taking 365.2 days, and turns once in 24.0 hours.",
    facts: [
      "Earth's diameter is 12,756 km on the planetary fact sheet, while twice the 6,371 km mean radius on the same site's Sun fact sheet is 12,742 km.",
      "It has one moon, orbits the Sun at a mean distance of 149.6 million km, and takes 365.2 days to complete one orbit.",
      "The mean temperature the fact sheet gives for the whole planet is 15 °C, and its mean density is 5,514 kg per cubic metre.",
      "Its mass is 5.97 x 10^24 kg on the planetary fact sheet, and 5.9722 x 10^24 kg in the Earth column of the Sun fact sheet.",
    ],
    model_url: "/models/space/earth.glb",
    accent: ["#bcdcf5", "#1c4f80"],
    popularity: 99,
    metadata: {
      kind: "planet",
      diameter_km: 12756,
      mass_kg: 5.97e24,
      distance_from_sun_km: 149600000,
      day_length_hours: 24,
      year_length_days: 365.2,
      moons: 1,
      mean_temperature_c: 15,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "moon",
    name: "Moon",
    subtitle: "Moon · Earth's",
    description:
      "The Moon is Earth's only natural satellite and the only world beyond Earth that people have walked on. The fact sheet measures it at 3,475 km across and gives its distance from Earth, the row the table marks with an asterisk, as 0.384 million km, which is 384,000 km. Its rotation period of 655.7 hours is the same 27.3 days it takes to orbit Earth, so the same face is always turned towards us, and its mean temperature is -20 °C.",
    facts: [
      "The Moon is 3,475 km across, and the fact sheet has its distance from Earth at 0.384 million km, or 384,000 km.",
      "Its rotation period of 655.7 hours is the same 27.3 days it takes to orbit Earth, so one face always points at us.",
      "The mean temperature the fact sheet gives is -20 °C, and the Moon has no moons of its own.",
      "Apollo 8 photographed Earthrise from lunar orbit in December 1968, and Apollo 11 landed on the surface on 20 July 1969.",
    ],
    model_url: "/models/space/moon.glb",
    accent: ["#e6e8ea", "#4a4f55"],
    popularity: 95,
    metadata: {
      kind: "moon",
      diameter_km: 3475,
      mass_kg: 7.3e22,
      distance_from_sun_km: null,
      distance_from_earth_km: 384000,
      day_length_hours: 708.7,
      year_length_days: 27.3,
      moons: 0,
      mean_temperature_c: -20,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "mars",
    name: "Mars",
    subtitle: "Planet · Solar System",
    description:
      "Mars is the fourth planet from the Sun, a cold desert world with two small moons and a mean temperature of -65 °C. The fact sheet gives it a diameter of 6,792 km, a mass of 0.642 x 10^24 kg and a year of 687.0 days, orbiting at a mean distance of 228.0 million km. Its day is close to Earth's at 24.7 hours, and two NASA rovers are working on its surface.",
    facts: [
      "Mars has two moons and a mean surface temperature of -65 °C on the fact sheet.",
      "Its diameter is 6,792 km and its year lasts 687.0 days, while a day on the planet is 24.7 hours.",
      "NASA's Curiosity rover launched on 26 November 2011 and landed in Gale Crater on 6 August 2012.",
      "Curiosity is still climbing the slope of Mount Sharp, having passed a kilometre of elevation gain by 26 August 2026.",
    ],
    model_url: "/models/space/mars.glb",
    accent: ["#f0c9a8", "#8a3a1c"],
    popularity: 93,
    metadata: {
      kind: "planet",
      diameter_km: 6792,
      mass_kg: 6.42e23,
      distance_from_sun_km: 228000000,
      day_length_hours: 24.7,
      year_length_days: 687,
      moons: 2,
      mean_temperature_c: -65,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "jupiter",
    name: "Jupiter",
    subtitle: "Planet · Solar System",
    description:
      "Jupiter is the largest planet in the Solar System, 142,984 km across and about eleven times Earth's diameter, with a mass of 1,898 x 10^24 kg. The fact sheet gives it 95 moons and a mean temperature of -110 °C, and its year lasts 4,331 days. It turns faster than any other planet in that table, spinning once every 9.9 hours.",
    facts: [
      "Jupiter's diameter is 142,984 km, more than eleven times Earth's, and the fact sheet gives it 95 moons.",
      "It turns once in 9.9 hours, the shortest day of any planet, and takes 4,331 days to orbit the Sun.",
      "Its mean temperature is -110 °C and its surface pressure is listed as unknown, unlike the rocky planets.",
      "NASA's Juno spacecraft is studying Jupiter from orbit, and Europa Clipper launched on 14 October 2024 for the moon Europa.",
    ],
    model_url: "/models/space/jupiter.glb",
    accent: ["#f2ddc2", "#8b5a34"],
    popularity: 91,
    metadata: {
      kind: "planet",
      diameter_km: 142984,
      mass_kg: 1.898e27,
      distance_from_sun_km: 778500000,
      day_length_hours: 9.9,
      year_length_days: 4331,
      moons: 95,
      mean_temperature_c: -110,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "saturn",
    name: "Saturn",
    subtitle: "Planet · Solar System",
    description:
      "Saturn is the sixth planet from the Sun, the ringed one, and the least dense body in the fact sheet's table at 687 kg per cubic metre. It measures 120,536 km across, has a mass of 568 x 10^24 kg and takes 10,747 days to go round the Sun. The table gives it 274 moons, more than any other planet, and NASA's own Saturn page declines to put a number on them at all.",
    facts: [
      "Saturn's mean density of 687 kg per cubic metre is the lowest of any body in the fact sheet's table.",
      "The fact sheet gives Saturn 274 moons, more than any other planet there, and NASA's Saturn page says only that it has dozens.",
      "It is 120,536 km across, its year lasts 10,747 days, and it turns once every 10.7 hours.",
      "Pioneer 11 provided the first close look at Saturn in September 1979, and NASA's Cassini arrived in orbit around it in 2004.",
    ],
    model_url: "/models/space/saturn.glb",
    accent: ["#f4e6c1", "#96702c"],
    popularity: 92,
    metadata: {
      kind: "planet",
      diameter_km: 120536,
      mass_kg: 5.68e26,
      distance_from_sun_km: 1432000000,
      day_length_hours: 10.7,
      year_length_days: 10747,
      moons: 274,
      mean_temperature_c: -140,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "uranus",
    name: "Uranus",
    subtitle: "Planet · Solar System",
    description:
      "Uranus is the seventh planet from the Sun and the one that goes round on its side, with an obliquity to orbit of 97.8 degrees in the fact sheet's table. It is 51,118 km across, orbits at a mean distance of 2,867 million km and takes 30,589 days to do it, with a mean temperature of -195 °C. Only one spacecraft has ever been there.",
    facts: [
      "The fact sheet gives Uranus an obliquity to orbit of 97.8 degrees and 28 known moons.",
      "NASA's Uranus page also says 28 moons, then captions its own Webb image with 9 of the planet's 27 moons.",
      "It orbits at 2,867 million km and takes 30,589 days, and its diameter is 51,118 km.",
      "Voyager 2 made a close approach to Uranus in January 1986, the only spacecraft ever to visit the planet.",
    ],
    model_url: "/models/space/uranus.glb",
    accent: ["#cdeef2", "#2b6f78"],
    popularity: 76,
    metadata: {
      kind: "planet",
      diameter_km: 51118,
      mass_kg: 8.68e25,
      distance_from_sun_km: 2867000000,
      day_length_hours: 17.2,
      year_length_days: 30589,
      moons: 28,
      mean_temperature_c: -195,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "neptune",
    name: "Neptune",
    subtitle: "Planet · Solar System",
    description:
      "Neptune is the eighth planet from the Sun and the farthest of the eight, and it was the first planet located by mathematics rather than by somebody looking at the sky. It measures 49,528 km across, orbits at a mean distance of 4,515 million km and takes 59,800 days to complete one orbit, the longest year in the table. Its mean temperature is -200 °C and it turns once every 16.1 hours.",
    facts: [
      "Neptune's year lasts 59,800 days, the longest of any planet in the fact sheet's table.",
      "Voyager 2 is the first and only spacecraft to study Neptune up close, and it did so in 1989.",
      "It has 16 known moons, a mean temperature of -200 °C, and a diameter of 49,528 km.",
      "It orbits the Sun at a mean distance of 4,515 million km and turns once every 16.1 hours.",
    ],
    model_url: "/models/space/neptune.glb",
    accent: ["#bcd4f7", "#1b3f8f"],
    popularity: 78,
    metadata: {
      kind: "planet",
      diameter_km: 49528,
      mass_kg: 1.02e26,
      distance_from_sun_km: 4515000000,
      day_length_hours: 16.1,
      year_length_days: 59800,
      moons: 16,
      mean_temperature_c: -200,
      source: "NASA Planetary Fact Sheet, NSSDCA (nssdc.gsfc.nasa.gov), last updated 9 May 2024, read 2026-10-05",
    },
  },
  {
    slug: "international-space-station",
    name: "International Space Station",
    subtitle: "Space Station · NASA",
    description:
      "The International Space Station is the largest human-made object in orbit, built and operated by an international partnership of five space agencies from fifteen countries. NASA's own figures put its mass at 419,725 kg and its length at 356 feet, or 109 m, end to end, while the agency's station reference measures 109 m across the solar arrays by 51 m from the forward end of PMA2 to the aft end of the service module, so the size of the station depends on which span is meant. It has been continuously occupied since November 2000.",
    facts: [
      "Assembly began in 1998, and the station has been continuously occupied since November 2000.",
      "Its mass is 419,725 kg, eight solar arrays supply 75 to 90 kilowatts, and about 1.5 million lines of computer code run aboard it.",
      "NASA counts 259 spacewalks at the station since December 1998, and a crew of seven orbits Earth about every 90 minutes at five miles per second.",
      "Its pressurized volume is 35,491 cubic feet, or 1,005 cubic metres, not counting the vehicles docked to it.",
    ],
    model_url: "/models/space/international-space-station.glb",
    accent: ["#dfe6ef", "#2f3b4a"],
    popularity: 90,
    metadata: {
      kind: "spacecraft",
      launched: 1998,
      mass_kg: 419725,
      length_m: 109,
      operator: "NASA",
      source: "NASA, International Space Station Facts and Figures, read 2026-10-05",
    },
  },
  {
    slug: "hubble-space-telescope",
    name: "Hubble Space Telescope",
    subtitle: "Telescope · NASA",
    description:
      "Hubble is a space telescope in low Earth orbit, launched on 24 April 1990 and still observing from about 483 km up. NASA's own numbers page gives it a length of 43 feet (13 m), a mass of 27,000 pounds (12,200 kg) and a primary mirror 7.8 feet (2.4 m) across, with the statistics dated 1 March 2024 rather than to launch. It circles Earth once every 95 minutes at roughly 17,000 miles per hour.",
    facts: [
      "Hubble launched on 24 April 1990 and orbits Earth about once every 95 minutes from an altitude of roughly 483 km.",
      "Its primary mirror is 2.4 m across, 7.8 feet, and collects 40,000 times more light than the human eye.",
      "NASA's numbers page gives its weight as 27,000 pounds, or 12,200 kg, in statistics dated 1 March 2024.",
      "It has travelled more than 5 billion miles in orbit and completed more than 195,000 revolutions of Earth.",
    ],
    model_url: "/models/space/hubble-space-telescope.glb",
    accent: ["#dbe6f2", "#243b52"],
    popularity: 88,
    metadata: {
      kind: "telescope",
      launched: 1990,
      mass_kg: 12200,
      length_m: 13,
      operator: "NASA",
      source: "NASA, Hubble by the numbers, statistics dated 1 March 2024, read 2026-10-05",
    },
  },
  {
    slug: "james-webb-space-telescope",
    name: "James Webb Space Telescope",
    subtitle: "Telescope · NASA/ESA/CSA",
    description:
      "The James Webb Space Telescope is the largest telescope ever launched into space, a joint NASA, ESA and CSA observatory that lifted off on 25 December 2021. It does not orbit Earth: it orbits the Sun 1.5 million kilometres away at the second Lagrange point, which it reached on 24 January 2022. Its gold-coated beryllium mirror is 6.5 m across and made of 18 segments, and its five-layer sunshield measures 21.197 m by 14.162 m.",
    facts: [
      "Webb launched on 25 December 2021 and arrived at its orbit around the second Lagrange point on 24 January 2022.",
      "Its primary mirror is 6.5 m across, built from 18 beryllium segments coated in gold, and the mirror alone has a mass of 705 kg.",
      "Total payload mass is about 6,200 kg, which NASA counts with on-orbit consumables and the launch vehicle adaptor included.",
      "The sunshield measures 21.197 m by 14.162 m and holds the observatory below 50 K, which is roughly -223 degrees Celsius.",
    ],
    model_url: "/models/space/james-webb-space-telescope.glb",
    accent: ["#f6e6b8", "#4a3a12"],
    popularity: 89,
    metadata: {
      kind: "telescope",
      launched: 2021,
      mass_kg: 6200,
      length_m: null,
      operator: "NASA/ESA/CSA",
      source: "NASA, James Webb Space Telescope fact page (webb.nasa.gov), read 2026-10-05",
    },
  },
  {
    slug: "curiosity-rover",
    name: "Curiosity",
    subtitle: "Rover · NASA",
    description:
      "Curiosity is NASA's Mars Science Laboratory rover, launched on 26 November 2011 and landed in Gale Crater on 6 August 2012. NASA gives its size as about that of a small SUV: 10 feet long, 9 feet wide and 7 feet tall without the arm, with a mass of 1,982 pounds (899 kg) in Earth gravity and 743 pounds (337 kg) in Martian gravity. It carries a geology laboratory and a laser that vaporises rock, and it is still climbing the slope of Mount Sharp.",
    facts: [
      "Curiosity launched on 26 November 2011 and landed in Gale Crater on 6 August 2012.",
      "It has a mass of 899 kg in Earth gravity, which is 337 kg in Mars gravity, and its arm reaches about 7 feet.",
      "The rover is 10 feet long, 9 feet wide and 7 feet tall without its arm, about the size of a small SUV.",
      "By 26 August 2026 NASA reported that the rover had gained a kilometre of elevation on the slope of Mount Sharp.",
    ],
    model_url: "/models/space/curiosity-rover.glb",
    accent: ["#e8dccb", "#6a4a2a"],
    popularity: 87,
    metadata: {
      kind: "rover",
      launched: 2011,
      mass_kg: 899,
      length_m: 3.05,
      operator: "NASA",
      source: "NASA Science, Mars Science Laboratory (Curiosity) mission page, read 2026-10-05",
    },
  },
  {
    slug: "saturn-v",
    name: "Saturn V",
    subtitle: "Rocket · NASA",
    description:
      "The Saturn V was the rocket NASA built to send Apollo crews to the Moon, 111 metres tall and weighing 2.8 million kilograms when fully fuelled for liftoff. It generated 34.5 million newtons of thrust at launch and could put about 118,000 kg into Earth orbit or 43,500 kg on its way to the Moon. Its first flight was Apollo 4 in 1967, Apollo 8 in 1968 was its first crewed flight, and it also launched the Skylab space station.",
    facts: [
      "The first Saturn V launched in 1967 as Apollo 4, and Apollo 8 in 1968 was the first crewed flight of the rocket.",
      "Fully fuelled it weighed 2.8 million kg, and it stood 111 m, or 363 feet, tall.",
      "It generated 34.5 million newtons of thrust at launch and could lift about 118,000 kg into Earth orbit.",
      "Apollo 11 was the first mission to land astronauts on the Moon, and Saturn V rockets also flew the later landings through Apollo 17.",
    ],
    model_url: "/models/space/saturn-v.glb",
    accent: ["#e9e2d6", "#3c3a36"],
    popularity: 85,
    metadata: {
      kind: "rocket",
      launched: 1967,
      mass_kg: 2800000,
      length_m: 111,
      operator: "NASA",
      source: "NASA, What Was the Saturn V? (Grades 5-8), read 2026-10-05",
    },
  },
  {
    slug: "voyager-1",
    name: "Voyager 1",
    subtitle: "Spacecraft · NASA",
    description:
      "Voyager 1 is the farthest human-made object from Earth, launched on 5 September 1977 to fly past Jupiter and Saturn and now travelling through interstellar space. NASA gives its mass as 1,592 pounds (721.9 kg), powered by three radioisotope thermoelectric generators producing about 158 watts each at launch. It crossed into interstellar space in August 2012 and still returns data from four working instruments, and it carries a gold-plated copper record 30 centimetres across.",
    facts: [
      "Voyager 1 launched on 5 September 1977 and crossed into interstellar space in August 2012.",
      "Its mass is 721.9 kg, and three radioisotope thermoelectric generators produced about 158 watts each at launch.",
      "The spacecraft made its closest approach to Jupiter on 5 March 1979 on its way out to Saturn.",
      "It carries a gold-plated copper record 30 centimetres in diameter, marked with the location of Earth relative to several pulsars.",
    ],
    model_url: "/models/space/voyager-1.glb",
    accent: ["#e2e7ee", "#2a2f3a"],
    popularity: 86,
    metadata: {
      kind: "spacecraft",
      launched: 1977,
      mass_kg: 721.9,
      length_m: null,
      operator: "NASA",
      source: "NASA Science, Voyager 1 mission page, read 2026-10-05",
    },
  },

  /* ------------------------------------------------------------------ harvested entries
     Collected by scripts/harvest-catalogue-entries.mjs from nasa and Wikipedia, on 2026-10-05. The model_url of each one is written by the model pipeline. */
  {
    slug: "advanced-composition-explorer",
    name: "Advanced Composition Explorer",
    subtitle: "Spacecraft · NASA",
    description:
      "Real-time data from ACE are used by the National Oceanic and Atmospheric Administration (NOAA) Space Weather Prediction Center (SWPC) to improve forecasts and warnings of solar storms. The ACE robotic spacecraft was launched on 25 August 1997, and entered a Lissajous orbit close to the L1 Lagrange point (which lies between the Sun and the Earth at a distance of some 1,500,000 km (930,000 mi) from the latter) on 12 December 1997. The spacecraft is currently operating at that orbit. Because ACE is in a non-Keplerian orbit, and has regular station-keeping maneuvers, the orbital parameters in the adjacent information box are only approximate.",
    facts: [
      "Advanced Composition Explorer (ACE or Explorer 71) is a NASA Explorer program satellite and space exploration mission to study matter comprising energetic particles from the solar wind, the interplanetary medium, and other sources.",
      "As of 2023, the spacecraft is still in generally good condition.",
      "== History == The Advanced Composition Explorer (ACE) was proposed in 1986 as part of the Explorer Concept Study Program.",
      "Following a Phase-A definition study, ACE was selected for development in 1989, and began construction in 1994.",
    ],
    model_url: "/models/space/advanced-composition-explorer.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Advanced Composition Explorer",
    },
  },
  {
    slug: "advanced-crew-escape-suit",
    name: "Advanced Crew Escape Suit",
    subtitle: "Spacecraft · NASA",
    description:
      "The suit is a direct descendant of the U.S. Air Force high-altitude pressure suits worn by the two-man crews of the SR-71 Blackbird, pilots of the U-2 and X-15, and Gemini pilot-astronauts, and the Launch Entry Suits (LES) worn by NASA astronauts starting on the STS-26 flight, the first flight after the Challenger disaster. The suit is manufactured by the David Clark Company of Worcester, Massachusetts. Cosmetically the suit is very similar to the LES.",
    facts: [
      "The Advanced Crew Escape Suit (ACES), or \"pumpkin suit\", is a full pressure suit that Space Shuttle crews began wearing after STS-64, for the ascent and entry portions of flight.",
      "== History == In 1990, the LES was nearing the end of its service life, so a program to produce a successor was initiated.",
      "Favorable crew evaluations of a prototype led to full scale development and qualification that would run until 1992.",
      "Production of the completed design began in February 1993, and the first suit was delivered to NASA in May 1994.",
    ],
    model_url: "/models/space/advanced-crew-escape-suit.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 51,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Advanced Crew Escape Suit",
    },
  },
  {
    slug: "earth-observing-1-eo-1",
    name: "Earth Observing-1",
    subtitle: "Spacecraft · NASA",
    description:
      "It was intended to enable the development of future Earth imaging observatories that will have a significant increase in performance while also having reduced cost and mass. The spacecraft was part of the New Millennium Program. It was the first satellite to map active lava flows from space; the first to measure a facility's methane leak from space; and the first to track re-growth in a partially logged Amazon forest from space. This permitted a greater flexibility in false-color imagery.",
    facts: [
      "Earth Observing-1 (EO-1) was a NASA Earth observation satellite created to develop and validate a number of instrument and spacecraft bus breakthrough technologies.",
      "EO-1 captured scenes such as the ash after the World Trade Center attacks, the flooding in New Orleans after Hurricane Katrina, volcanic eruptions and a large methane leak in southern California.",
      "== Overview == Its Advanced Land Imager (ALI) measured nine different wavelengths simultaneously, instead of the seven measured by the imager in Landsat 7.",
      "In order to compare the two imagers, EO-1 followed Landsat 7 in its orbit by exactly one minute.",
    ],
    model_url: "/models/space/earth-observing-1-eo-1.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Earth Observing-1",
    },
  },
  {
    slug: "extravehicular-mobility-unit",
    name: "Extravehicular Mobility Unit",
    subtitle: "Spacecraft · NASA",
    description:
      "The Extravehicular Mobility Unit (EMU) is an independent spacesuit that provides environmental protection, mobility, life support, and communications for astronauts performing extravehicular activity (EVA) in Earth orbit. It consists of a Space Suit Assembly (SSA) assembly which includes the Hard Upper Torso (HUT), arm sections, gloves, an Apollo-style \"bubble\" helmet, the Extravehicular Visor Assembly (EVVA), and a soft Lower Torso Assembly (LTA), incorporating the Body Seal Closure (BSC), waist bearing, brief, legs, and boots, and a Life Support System (LSS) which incorporates the Primary Life Support System (PLSS), electrical systems, and a Secondary Oxygen Pack (SOP). Prior to donning the pressure garment, the crew member puts on a Maximum Absorbency Garment (MAG) (basically a modified incontinence diaper – Urine Collection Devices (UCDs) are no longer used), and possibly a Thermal Control Undergarment (long johns). The final item donned before putting on the pressure suit is the Liquid Cooling and Ventilation Garment (LCVG), which incorporates clear plastic tubing through which chilled liquid water flows for body temperature control, as well as ventilation tubes for waste gas removal.",
    facts: [
      "Introduced in 1982, it is a two-piece semi-rigid suit, and is one of two types of EVA spacesuits used by crew members on the International Space Station (ISS), the other being the Russian Orlan space suit.",
      "It was used by NASA's Space Shuttle astronauts prior to the end of the Shuttle program in 2011.",
      "== Suit components == The EMU, like the Apollo/Skylab A7L spacesuit, was the result of 21 years of research and development.",
      "The suit's regulator and fans activate when the servicing umbilicals are removed and the suit reaches an internal pressure of 4.3 psi (30 kPa).",
    ],
    model_url: "/models/space/extravehicular-mobility-unit.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Extravehicular Mobility Unit",
    },
  },
  {
    slug: "far-ultraviolet-spectroscopic-explorer",
    name: "Far Ultraviolet Spectroscopic Explorer",
    subtitle: "Spacecraft · NASA",
    description:
      "Far Ultraviolet Spectroscopic Explorer (FUSE, Explorer 77, and MIDEX-0) represented the next generation, high-orbit, ultraviolet space observatory covering the wavelength range of 90.5–119.5 nanometre (nm) of the NASA operated by the Johns Hopkins University Applied Physics Laboratory. FUSE detected light in the far ultraviolet portion of the electromagnetic spectrum, which is mostly unobservable by other telescopes. Its primary mission was to characterize universal deuterium abundance in an effort to learn about the stellar processing of deuterium left over from the Big Bang. == Mission == The primary objective of FUSE was to use high-resolution spectroscopy at far ultraviolet wavelengths to study the origin and evolution of the lightest elements (hydrogen and deuterium) created shortly after the Big Bang, and the forces and processes involved in the evolution of galaxies, stars and planetary systems.",
    facts: [
      "FUSE was launched on a Delta II launch vehicle on 24 June 1999, at 15:44:00 UTC, as a part of NASA's Origins Program.",
      "FUSE resides in a low Earth orbit, approximately 760 km (470 mi) in altitude, with an inclination of 24.98° and a 99.80 minutes orbital period.",
      "Its Explorer program designation is Explorer 77.",
      "Only one previous mission, Copernicus (OAO-3), has given this far-ultraviolet region of the electromagnetic spectrum.",
    ],
    model_url: "/models/space/far-ultraviolet-spectroscopic-explorer.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Far Ultraviolet Spectroscopic Explorer",
    },
  },

  /* ------------------------------------------------------------------ harvested entries
     Collected by scripts/harvest-catalogue-entries.mjs from nasa and Wikipedia, on 2026-10-05. The model_url of each one is written by the model pipeline. */
    {
    slug: "aeronomy-of-ice-in-the-mesosphere",
    name: "Aeronomy of Ice in the Mesosphere",
    subtitle: "Spacecraft · NASA",
    description:
      "It is the ninetieth Explorer program mission and is part of the NASA-funded Small Explorer program (SMEX). The overall goal is to resolve why PMCs form and why they vary. AIM expected lifetime was at least two years. AIM measures PMCs and the thermal, chemical and dynamical environment in which they form.",
    facts: [
      "The Aeronomy of Ice in the Mesosphere (AIM or Explorer 90) was a NASA satellite launched in 2007 to conduct a planned 26-month study of noctilucent clouds (NLCs).",
      "In March 2023, NASA announced that battery power on the spacecraft had declined below the level needed to sustain operation.",
      "The spacecraft re-entered Earth's atmosphere in August 2024.",
      "== Mission == The scientific purpose of the Aeronomy of Ice in the Mesosphere (AIM) mission is focused on the study of polar mesospheric clouds (PMCs) that form about 80 km (50 mi) above the surface of Earth in summer and mostly in the polar regions of Earth.",
    ],
    model_url: "/models/space/aeronomy-of-ice-in-the-mesosphere.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 51,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Aeronomy of Ice in the Mesosphere",
    },
  },
  {
    slug: "bp-tauri",
    name: "BP Tauri",
    subtitle: "Spacecraft · NASA",
    description:
      "== Suspected companions == There were two suspected stellar companions to BP Tauri on projected separations 3.00 and 5.45 arcseconds. These were proven to be a background stars not related to BP Tauri with Gaia data though. == Protoplanetary system == The star is surrounded by a protoplanetary disk. The disk is strongly depleted in carbon and carbon monoxide.",
    facts: [
      "BP Tauri is a young T Tauri star in the constellation of Taurus about 416 light years away, belonging to the Taurus Molecular Cloud.",
      "== Properties == BP Tauri is still accreting mass at the low rate of 9×10−10 M☉ and 1.6×10−7 M☉/year, as evidenced by X-rays produced by infalling matter, and may be still in the process of spin-up.",
      "Its chromospheric magnetic fields are rather strong at 2.5+0.15−0.16 kilogauss, and contains strong non-dipole components.",
      "The star is producing 40% of its luminosity via the energy released by accretion.",
    ],
    model_url: "/models/space/bp-tauri.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — BP Tauri",
    },
  },
  {
    slug: "base-station",
    name: "Base station",
    subtitle: "Spacecraft · NASA",
    description:
      "The term is used in the context of mobile telephony, wireless computer networking and other wireless communications and in land surveying. In surveying, it is a GPS receiver at a known position, while in wireless communications it is a transceiver connecting a number of other devices to one another and/or to a wider area. In mobile telephony, it provides the connection between mobile phones and the wider telephone network. In a computer network, it is a transceiver acting as a switch for computers in the network, possibly connecting them to a/another local area network and/or the Internet.",
    facts: [
      "Base station (or base radio station, BS) is – according to the International Telecommunication Union's (ITU) Radio Regulations (RR) – a \"land station in the land mobile service.\" A base station is called node B in 3G, eNB in LTE (4G), and gNB in 5G.",
      "RF LDMOS amplifiers replaced RF bipolar transistor amplifiers in most base stations during the 1990s, leading to the wireless revolution.",
      "The dispatch point console and remote base station are connected by leased private line telephone circuits, (sometimes called RTO circuits), a DS-1, or radio links.",
      "These terms are defined in regulations inside Part 90 of the commissions regulations.",
    ],
    model_url: "/models/space/base-station.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Base station",
    },
  },
  {
    slug: "robonaut-2",
    name: "Robonaut",
    subtitle: "Spacecraft · NASA",
    description:
      "A robonaut is a humanoid robot, part of a development project conducted by the Dexterous Robotics Laboratory at NASA's Lyndon B. Johnson Space Center (JSC) in Houston, Texas. Robonaut differs from other current space-faring robots in that, while most current space robotic systems (such as robotic arms, cranes and exploration rovers) are designed to move large objects, Robonaut's tasks require more dexterity. The core idea behind the Robonaut series is to have a humanoid machine work alongside astronauts.",
    facts: [
      "Its form factor and dexterity are designed such that Robonaut \"is capable of performing all the tasks required of an EVA-suited crewmember.\" NASA states, \"Robonauts are essential to NASA's future as we go beyond low Earth orbit\", and R2 will provide performance data about how a robot may work side-by-side with astronauts.",
      "The latest Robonaut version, R2, was delivered to the International Space Station (ISS) by STS-133 in February 2011.",
      "The first US-built robot on the ISS, R2 is a robotic torso designed to assist with crew EVAs and can hold tools used by the crew.",
      "However, Robonaut 2 does not have adequate protection needed to exist outside the space station and enhancements and modifications would be required to allow it to move around the station's interior.",
    ],
    model_url: "/models/space/robonaut-2.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Robonaut",
    },
  },
  {
    slug: "rosetta",
    name: "Rosetta",
    subtitle: "Spacecraft · NASA",
    description:
      "== Etymology == The name of the town most likely comes from an Arabic name Rašīd (meaning 'guide') and was transcribed and corrupted in numerous ways – the name Rexi was used by the Crusaders in Middle Ages and Rosetta or Rosette ('little rose' in Italian and French, respectively) was used by the French at the time of Napoleon Bonaparte's campaign in Egypt. The latter lent its name to the Rosetta Stone (French: Pierre de Rosette), which was found by French soldiers at the nearby Fort Julien in 1799. Some scholars believe that there is no evidence that the city's name comes from Egyptian, and the Coptic form ϯⲣⲁϣⲓⲧ is just a late transcription of the Arabic name. Some argue that it could be derived from Ancient Egyptian: rꜣ-šdı͗, lit.",
    facts: [
      "Rosetta ( roh-ZET-ə) or Rashid (Arabic: رشيد, romanized: Rašīd, IPA: [ɾɑˈʃiːd]; Coptic: ϯⲣⲁϣⲓⲧ, romanized: ti-Rashit) is a port city of the Nile Delta, 65 km (40 mi) east of Alexandria, in Egypt's Beheira governorate.",
      "The Rosetta Stone was discovered in nearby Fort Julien in 1799.",
      "Founded around the 9th century on the site of the ancient town of Bolbitine, Rosetta boomed with the decline of Alexandria following the Ottoman conquest of Egypt in 1517, only to wane in importance after Alexandria's revival.",
      "During the 19th century, it was a popular British tourist destination, known for its Ottoman mansions, citrus groves and relative cleanliness.",
    ],
    model_url: "/models/space/rosetta.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Rosetta",
    },
  },
  {
    slug: "skylab",
    name: "Skylab",
    subtitle: "Spacecraft · NASA",
    description:
      "The manifestation of the Apollo Applications Program, Skylab was constructed from a repurposed Saturn V third stage (the S-IVB), a dry workshop, and took the place of the stage during launch. Operations included an orbital workshop, a solar observatory, Earth observation, ten spacewalks, and hundreds of experiments. Its pressurized volume of over 350 m3 was not rivaled until the completion of the first modular space station, Mir, in 1996; the central Orbital Workshop, at 270 m3, dwarfed subsequent station modules, including the largest on the International Space Station (ISS), Kibō, at 150 m3. A successor station, Skylab B, was concurrently constructed in 1970 and considered for integration with Salyut and Soyuz, but cancelled in 1973.",
    facts: [
      "Skylab was the United States' first space station launched by NASA, occupied for about 24 weeks between May 1973 and February 1974.",
      "It was operated by three trios of astronaut crews: Skylab 2, Skylab 3, and Skylab 4.",
      "NASA's station concept had competed with the Department of Defense's Manned Orbiting Laboratory concept from 1963 to 1969.",
      "Skylab was the world's second space station, after the Soviet space program's Salyut 1.",
    ],
    model_url: "/models/space/skylab.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 56,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Skylab",
    },
  },
  {
    slug: "solar-dynamics-observatory",
    name: "Solar Dynamics Observatory",
    subtitle: "Spacecraft · NASA",
    description:
      "The goal of the LWS program is to develop the scientific understanding necessary to effectively address those aspects of the connected Sun–Earth system directly affecting life on Earth and its society. The goal of the SDO is to understand the influence of the Sun on the Earth and near-Earth space by studying the solar atmosphere on small scales of space and time and in many wavelengths simultaneously. SDO has been investigating how the Sun's magnetic field is generated and structured, how this stored magnetic energy is converted and released into the heliosphere and geospace in the form of solar wind, energetic particles, and variations in the solar irradiance. The primary mission lasted five years and three months, with expendables expected to last at least ten years.",
    facts: [
      "The Solar Dynamics Observatory (SDO) is a NASA mission which has been observing the Sun since 2010.",
      "Launched on 11 February 2010, the observatory is part of the Living With a Star (LWS) program.",
      "== General == The SDO spacecraft was developed at NASA's Goddard Space Flight Center in Greenbelt, Maryland, and launched on 11 February 2010, from Cape Canaveral Air Force Station (CCAFS).",
      "=== Extended mission === As of February 2020, SDO is expected to remain operational until 2030.",
    ],
    model_url: "/models/space/solar-dynamics-observatory.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Solar Dynamics Observatory",
    },
  },
  {
    slug: "solar-radiation-and-climate-experiment-s",
    name: "Solar Radiation and Climate Experiment",
    subtitle: "Spacecraft · NASA",
    description:
      "These measurements specifically addressed long-term climate change, natural variability, atmospheric ozone, and UV-B radiation, enhancing climate prediction. These measurements are critical to studies of the Sun, its effect on the Earth's system, and its influence on humankind. SORCE measured the Sun's output using radiometers, spectrometers, photodiodes, detectors, and bolometers mounted on a satellite observatory orbiting the Earth. Spectral measurements identify the irradiance of the Sun by characterizing the Sun's energy and emissions in the form of color that can then be translated into quantities and elements of matter.",
    facts: [
      "The Solar Radiation and Climate Experiment (SORCE) was a 2003–2020 NASA-sponsored satellite mission that measured incoming X-ray, ultraviolet, visible, near-infrared, and total solar radiation.",
      "SORCE was launched on 25 January 2003 on a Pegasus XL launch vehicle to provide NASA's Earth Science Enterprise (ESE) with precise measurements of solar radiation.",
      "Flying in a 645 km (401 mi) orbit at a 40.0° inclination, SORCE was operated by the Laboratory for Atmospheric and Space Physics (LASP) at the University of Colorado Boulder, Colorado.",
      "It continued the precise measurements of total solar irradiance that had begun with the ERB instrument in 1979 and had been later extended with the ACRIM series of measurements (1999+).",
    ],
    model_url: "/models/space/solar-radiation-and-climate-experiment-s.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 58,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Solar Radiation and Climate Experiment",
    },
  },
  {
    slug: "solar-and-heliospheric-observatory",
    name: "Solar and Heliospheric Observatory",
    subtitle: "Spacecraft · NASA",
    description:
      "It is a joint project between the ESA and NASA. SOHO was part of the International Solar Terrestrial Physics Program (ISTP). In addition to its scientific mission, it is a main source of near-real-time solar data for space weather prediction. Along with Aditya-L1, Wind, Advanced Composition Explorer (ACE), Deep Space Climate Observatory (DSCOVR) and other satellites, SOHO is one of five spacecraft in the vicinity of the Earth–Sun L1 point, a point of gravitational balance located approximately 0.99 astronomical unit (AU) from the Sun and 0.01 AU from the Earth.",
    facts: [
      "The Solar and Heliospheric Observatory (SOHO) is a European Space Agency (ESA) spacecraft built by a European industrial consortium led by Matra Marconi Space (now Airbus Defence and Space) that was launched on a Lockheed Martin Atlas IIAS launch vehicle on 2 December 1995, to study the Sun.",
      "It has also discovered more than 5,000 comets.",
      "It began normal operations in May 1996.",
      "Originally planned as a two-year mission, SOHO continues to operate after 30 years in space; the mission has been extended until year 2029, subject to review and confirmation by ESA's Science Programme Committee.",
    ],
    model_url: "/models/space/solar-and-heliospheric-observatory.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Solar and Heliospheric Observatory",
    },
  },

  /* ------------------------------------------------------------------ harvested entries
     Collected by scripts/harvest-catalogue-entries.mjs from both and Wikipedia, on 2026-10-06. The model_url of each one is written by the model pipeline. */
  {
    slug: "agena-target-vehicle",
    name: "Agena target vehicle",
    subtitle: "Catalogue entry",
    description:
      "The Agena Target Vehicle (; ATV), also known as Gemini-Agena Target Vehicle (GATV), was an uncrewed spacecraft used by NASA during its Gemini program to develop and practice orbital space rendezvous and docking techniques, and to perform large orbital changes, in preparation for the Apollo program lunar missions. The spacecraft was based on Lockheed Aircraft's Agena-D upper stage rocket, fitted with a docking target manufactured by McDonnell Aircraft. The name 'Agena' derived from the star Beta Centauri, also known as Agena. == Operations == Each ATV consisted of an Agena-D-derivative upper rocket stage built by Lockheed Aircraft and a docking adapter built by McDonnell Aircraft.",
    facts: [
      "The combined spacecraft was a 26-foot (7.92 m)-long cylinder with a diameter of 5 feet (1.52 m), placed into low Earth orbit with the Atlas-Agena launch vehicle.",
      "It carried about 14,000 pounds (6,400 kg) of propellant and gas at launch, and had a gross mass at orbital insertion of about 7,200 pounds (3,300 kg).",
      "The ATV for Gemini 6 failed on launch on October 25, 1965, which led NASA to develop a backup: the Augmented Target Docking Adapter (ATDA), a smaller spacecraft consisting of the docking target with an attitude control propulsion system but without the Agena orbital change rocket.",
      "The ATDA was used once on Gemini 9A after a second ATV launch failure on May 17, 1966, but failed as a docking target because its launch shroud failed to separate.",
    ],
    model_url: "/models/space/agena-target-vehicle.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Agena target vehicle",
    },
  },
      {
    slug: "ares-1-b",
    name: "Ares I",
    subtitle: "Catalogue entry",
    description:
      "Ares I was the crew launch vehicle that was being developed by NASA as part of the Constellation program. The name \"Ares\" refers to the Greek deity Ares, who is identified with the Roman god Mars. Ares I was originally known as the \"Crew Launch Vehicle\" (CLV). Ares I was to complement the larger, uncrewed Ares V, which was the cargo launch vehicle for Constellation.",
    facts: [
      "NASA planned to use Ares I to launch Orion, the spacecraft intended for NASA human spaceflight missions after the Space Shuttle was retired in 2011.",
      "president Barack Obama in October 2010 with the passage of his 2010 NASA authorization bill.",
      "In September 2011, NASA detailed the Space Launch System as its new vehicle for human exploration beyond Earth's orbit.",
      "== Development == === Advanced Transportation System Studies === In 1995 Lockheed Martin produced an Advanced Transportation System Studies (ATSS) report for the Marshall Space Flight Center.",
    ],
    model_url: "/models/space/ares-1-b.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Ares I",
    },
  },
  {
    slug: "argo",
    name: "Argo",
    subtitle: "Catalogue entry",
    description:
      "In Greek mythology, the Argo ( AR-goh; Ancient Greek: Ἀργώ, romanized: Argṓ) was the ship of Jason and the Argonauts. The ship was built with divine aid and carried the Argonauts on their quest for the Golden Fleece from Iolcos to Colchis. After the journey, the ship was retired and dedicated to Poseidon, the divine ruler of the seas. The ship has gone on to be used as a motif in a variety of sources beyond the original myth from books, films and more.",
    facts: [
      "It was said the boat had to be carried over land for 12 days to get back on course.",
      "=== 1963 film === The version of the Argo that appears in the 1963 film Jason and the Argonauts was modeled after a Greek warship, with shields lining the side of the boat.",
    ],
    model_url: "/models/space/argo.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Argo",
    },
  },
  {
    slug: "astronaut",
    name: "Astronaut",
    subtitle: "Catalogue entry",
    description:
      "An astronaut (from the Ancient Greek ἄστρον (astron), meaning 'star', and ναύτης (nautes), meaning 'sailor') is a person trained, equipped, and deployed by a human spaceflight program to serve as a commander or crew member of a spacecraft. Although generally reserved for professional space travelers, the term is sometimes applied to anyone who travels into space, including scientists, politicians, journalists, and space tourists. In the United States, it is a designated term used by three agencies: NASA, the FAA, and the military. The term is also used for people who are trained to fly in a spacecraft after passing certain training courses, regardless of their experience of space travel.",
    facts: [
      "As of April 2026, 781 humans have flown in space, many of these to space stations.",
      "Over 290 individuals have visited the International Space Station; 105 individuals visited the Mir station.",
      "Until 2002, astronauts were sponsored and trained exclusively by governments, either by the military or by civilian space agencies.",
      "With the suborbital flight of the privately funded SpaceShipOne in 2004, a new category of astronaut was created: the commercial astronaut.",
    ],
    model_url: "/models/space/astronaut.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Astronaut",
    },
  },
    {
    slug: "chandra-x-ray-observatory",
    name: "Chandra X-ray Observatory",
    subtitle: "Catalogue entry",
    description:
      "Since the Earth's atmosphere absorbs the vast majority of X-rays, they are not detectable from Earth-based telescopes; therefore space-based telescopes are required to make these observations. The telescope is named after the Nobel Prize-winning Indian-American astrophysicist Subrahmanyan Chandrasekhar. Its mission is similar to that of ESA's XMM-Newton spacecraft, also launched in 1999 but the two telescopes have different design foci, as Chandra has a much higher angular resolution and XMM-Newton higher spectroscopy throughput. In response to a decrease in NASA funding in 2024 by the US Congress, Chandra is threatened with an early cancellation despite having more than a decade of operation left.",
    facts: [
      "The Chandra X-ray Observatory (CXO), previously known as the Advanced X-ray Astrophysics Facility (AXAF), is a Flagship-class space telescope launched aboard the Space Shuttle Columbia during STS-93 by NASA on July 23, 1999.",
      "Chandra is sensitive to X-ray sources 100 times fainter than any previous X-ray telescope, enabled by the high angular resolution of its mirrors.",
      "Chandra is an Earth satellite in a 64-hour orbit, and its mission is ongoing as of 2025.",
      "Chandra is one of the Great Observatories, along with the Hubble Space Telescope, Compton Gamma Ray Observatory (1991–2000), and the Spitzer Space Telescope (2003–2020).",
    ],
    model_url: "/models/space/chandra-x-ray-observatory.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Chandra X-ray Observatory",
    },
  },
  {
    slug: "clementine",
    name: "Clementine",
    subtitle: "Catalogue entry",
    description:
      "A clementine (Citrus × clementina) is a tangor, a citrus fruit hybrid between a willowleaf mandarin orange (C. × deliciosa) and a sweet orange (C. × sinensis), named in honor of Clément Rodier, a French missionary who first discovered and propagated the cultivar in Algeria. The exterior is a deep orange colour with a smooth, glossy appearance.",
    facts: [
      "Clementines can be separated into 7 to 14 segments.",
      "== History == The clementine is a spontaneous citrus hybrid that arose in the late 19th century in Misserghin, Algeria, in the garden of the orphanage of the French missionary brother Clément Rodier, for whom it would be formally named in 1902.",
      "There are three types of clementines: seedless clementines, clementines (maximum of 10 seeds), and Monreal (more than 10 seeds).",
      "It was introduced into Californian commercial agriculture in 1914, though it was grown at the Citrus Research Center (now part of the University of California, Riverside) as early as 1909.",
    ],
    model_url: "/models/space/clementine.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 58,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Clementine",
    },
  },
  {
    slug: "cloudsat-a",
    name: "CloudSat",
    subtitle: "Catalogue entry",
    description:
      "It used radar to measure the altitude and properties of clouds, adding to the information on the relationship between clouds and climate to help resolve questions about global warming. Ball Aerospace & Technologies Corp. in Boulder, Colorado, designed and built the spacecraft. CloudSat's primary mission was scheduled to continue for 22 months to allow more than one seasonal cycle to be observed.",
    facts: [
      "CloudSat is a Passivated NASA Earth observation satellite, which was launched on a Delta II rocket on April 28, 2006, and is awaiting disposal.",
      "It operated in daytime-only operations from 2011 to 2023 due to battery malfunction, requiring sunlight to power the radar.",
      "On December 15, 2023, the Cloud Profiling Radar was deactivated for the final time, ending the data collection portion of the mission.",
      "The mission was selected under NASA's Earth System Science Pathfinder program in 1999.",
    ],
    model_url: "/models/space/cloudsat-a.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — CloudSat",
    },
  },
  {
    slug: "cloudsat-b",
    name: "CloudSat",
    subtitle: "Catalogue entry",
    description:
      "It used radar to measure the altitude and properties of clouds, adding to the information on the relationship between clouds and climate to help resolve questions about global warming. Ball Aerospace & Technologies Corp. in Boulder, Colorado, designed and built the spacecraft. CloudSat's primary mission was scheduled to continue for 22 months to allow more than one seasonal cycle to be observed.",
    facts: [
      "CloudSat is a Passivated NASA Earth observation satellite, which was launched on a Delta II rocket on April 28, 2006, and is awaiting disposal.",
      "It operated in daytime-only operations from 2011 to 2023 due to battery malfunction, requiring sunlight to power the radar.",
      "On December 15, 2023, the Cloud Profiling Radar was deactivated for the final time, ending the data collection portion of the mission.",
      "The mission was selected under NASA's Earth System Science Pathfinder program in 1999.",
    ],
    model_url: "/models/space/cloudsat-b.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — CloudSat",
    },
  },
  {
    slug: "cloudsat-c",
    name: "CloudSat",
    subtitle: "Catalogue entry",
    description:
      "It used radar to measure the altitude and properties of clouds, adding to the information on the relationship between clouds and climate to help resolve questions about global warming. Ball Aerospace & Technologies Corp. in Boulder, Colorado, designed and built the spacecraft. CloudSat's primary mission was scheduled to continue for 22 months to allow more than one seasonal cycle to be observed.",
    facts: [
      "CloudSat is a Passivated NASA Earth observation satellite, which was launched on a Delta II rocket on April 28, 2006, and is awaiting disposal.",
      "It operated in daytime-only operations from 2011 to 2023 due to battery malfunction, requiring sunlight to power the radar.",
      "On December 15, 2023, the Cloud Profiling Radar was deactivated for the final time, ending the data collection portion of the mission.",
      "The mission was selected under NASA's Earth System Science Pathfinder program in 1999.",
    ],
    model_url: "/models/space/cloudsat-c.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — CloudSat",
    },
  },
    {
    slug: "curiosity-rover-msl",
    name: "Curiosity (rover)",
    subtitle: "Catalogue entry",
    description:
      "Curiosity is a Mars rover that is exploring Gale crater and Mount Sharp on Mars as part of NASA's Mars Science Laboratory (MSL) mission. Mission goals include an investigation of the Martian climate and geology, an assessment of whether the selected field site inside Gale has ever offered environmental conditions favorable for microbial life (including investigation of the role of water), and planetary habitability studies in preparation for human exploration. On August 6, 2022, a detailed overview of accomplishments by the Curiosity rover for the last ten years was reported. The rover is still operational, and as of October 5, 2026, Curiosity has been active on Mars for 5035 sols (5173 total days; 14 years, 60 days) since its landing (see current status).",
    facts: [
      "Launched in 2011 and landed the following year, the car-sized rover continues to operate more than a decade after its original two-year mission.",
      "Curiosity was launched from Cape Canaveral, Florida, on November 26, 2011, at 15:02:00 UTC and landed on Aeolis Palus inside Gale crater on Mars on August 6, 2012, 05:17:57 UTC.",
      "The Bradbury Landing site was less than 2.4 km (1.5 mi) from the center of the rover's touchdown target after a 560 million km (350 million mi) journey.",
      "In December 2012, Curiosity's two-year mission was extended indefinitely.",
    ],
    model_url: "/models/space/curiosity-rover-msl.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Curiosity (rover)",
    },
  },
  {
    slug: "cyclone-global-navigation-satellite-syst",
    name: "Cyclone Global Navigation Satellite System",
    subtitle: "Catalogue entry",
    description:
      "The Cyclone Global Navigation Satellite System (CYGNSS) is a space-based system developed by the University of Michigan and Southwest Research Institute with the aim of improving hurricane forecasting by better understanding the interactions between the sea and the air near the core of a storm. Other participants in CYGNSS' development include the Southwest Research Institute, Sierra Nevada Corporation, and Surrey Satellite Technology. In 2022, one of the satellites, FM06, abruptly ceased operations. == Overview == Forecasting the tracks of tropical cyclones since 1990 has improved by approximately 50%; however, in the same time period there has not been a corresponding improvement in forecasting the intensity of these storms.",
    facts: [
      "In June 2012, NASA sponsored the project for $152 million with the University of Michigan leading its development.",
      "The plan was to build a constellation of eight micro-satellites to be launched simultaneously in a single launch vehicle into low Earth orbit, at 500 km altitude.",
      "The program was scheduled to launch December 12, 2016, and then observe two hurricane seasons.",
      "Problems with a pump on the launching aircraft prevented this first launch, but a second launch attempt took place successfully on December 15, 2016.",
    ],
    model_url: "/models/space/cyclone-global-navigation-satellite-syst.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 64,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Cyclone Global Navigation Satellite System",
    },
  },
        {
    slug: "gemini-spacesuit",
    name: "Gemini spacesuit",
    subtitle: "Catalogue entry",
    description:
      "The Gemini spacesuit is a spacesuit worn by American astronauts for launch, in-flight activities (including EVAs) and landing. All Gemini spacesuits were developed and manufactured by the David Clark Company in Worcester, Massachusetts. It had removable combat-style boots, also made of Nomex fabric, along with a full-pressure helmet (containing a set of earphones and microphones) and gloves detachable by improved locking rings that allowed easy rotation of the wrists. Young and was the only flight to use this suit.",
    facts: [
      "It was designed by NASA based on the X-15 high-altitude pressure suit.",
      "== G3C and G4C suits == The G3C and G4C suits were the primary spacesuits worn for all but the Gemini 7 mission.",
      "The G3C consisted of six layers of nylon (the innermost containing a rubberized nylon \"bladder\") and Nomex, with a link net retaining layer and an outer layer of white Nomex fabric.",
      "On Gemini 3, the G3C suit was worn by both Gus Grissom and John W.",
    ],
    model_url: "/models/space/gemini-spacesuit.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 68,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Gemini spacesuit",
    },
  },
    {
    slug: "global-hawk",
    name: "Northrop Grumman RQ-4 Global Hawk",
    subtitle: "Catalogue entry",
    description:
      "It was initially designed by Ryan Aeronautical (now part of Northrop Grumman), and known as Tier II+ during development. The Global Hawk is operated by the United States Air Force (USAF). It is used as a high-altitude long endurance (HALE) platform covering the spectrum of intelligence collection capability to support forces in worldwide military operations. According to the USAF, the superior surveillance capabilities of the aircraft allow more precise weapons targeting and better protection of friendly forces.",
    facts: [
      "The Northrop Grumman RQ-4 Global Hawk is a high-altitude, remotely-piloted surveillance aircraft introduced in 2001.",
      "The RQ-4 provides a broad overview and systematic surveillance using high-resolution synthetic aperture radar (SAR) and electro-optical/infrared (EO/IR) sensors with long loiter times over target areas.",
      "Cost overruns led to the original plan to acquire 63 aircraft being cut to 45, and to a 2013 proposal to mothball the 21 Block 30 signals intelligence variants.",
      "The initial flyaway cost of each of the first 10 aircraft was US$10 million in 1994.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 70,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Northrop Grumman RQ-4 Global Hawk",
    },
  },
    {
    slug: "hammer",
    name: "Hammer",
    subtitle: "Catalogue entry",
    description:
      "A hammer is a tool, most often a hand tool, consisting of a weighted \"head\" fixed to a long handle that is swung to deliver an impact to an object. This can be used to drive nails into wood, to shape metal (as with a forge), or to crush rock. Hammers are used for a wide range of driving, shaping, breaking and non-destructive striking applications. Traditional disciplines include carpentry, blacksmithing, warfare, and percussive musicianship (as with a gong).",
    facts: [
      "There are over 40 different types of hammers that have many different types of uses.",
      "Stones attached to sticks with strips of leather or animal sinew were being used as hammers with handles by about 30,000 BCE during the middle of the Paleolithic Stone Age.",
      "The name usually refers to a hammer with a 2-to-4-pound (0.91 to 1.81 kg) head and a 10-inch (250 mm) handle, also called a \"single-jack\" hammer because it was used by one person drilling, holding the chisel in one hand and the hammer in the other.",
      "Typical weight is 2–4 lbs (0.9–1.8 kg) with a 12–14-inch (30–35 cm) handle.",
    ],
    model_url: "/models/space/hammer.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 72,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hammer",
    },
  },
  {
    slug: "helmet",
    name: "Helmet",
    subtitle: "Catalogue entry",
    description:
      "A helmet is a form of protective gear worn to protect the head. More specifically, a helmet complements the skull in protecting the human brain. Ceremonial or symbolic helmets (e.g., a policeman's helmet in the United Kingdom) without protective function are sometimes worn. Soldiers wear combat helmets, often made from Kevlar or other lightweight synthetic fibers.",
    facts: [
      "Since the 1990s, most helmets are made from resin or plastic, which may be reinforced with fibers such as aramids.",
      "== Designs == Some British gamekeepers during the 18th and 19th centuries wore helmets made of straw bound together with cut bramble.",
      "Europeans in the tropics often wore the pith helmet, developed in the mid-19th century and made of pith or cork.",
      "Military applications in the 19th–20th centuries saw a number of leather helmets, particularly among aviators and tank crews in the early 20th century.",
    ],
    model_url: "/models/space/helmet.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 73,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Helmet",
    },
  },
    {
    slug: "hubble-space-telescope-a",
    name: "Hubble Space Telescope",
    subtitle: "Catalogue entry",
    description:
      "It was not the first space telescope, but it is one of the largest and most versatile, renowned as a vital research tool and as a public relations boon for astronomy. The Hubble Space Telescope is named after astronomer Edwin Hubble and is one of NASA's Great Observatories. The Space Telescope Science Institute (STScI) selects Hubble's targets and processes the resulting data, while the Goddard Space Flight Center (GSFC) controls the spacecraft. Hubble's orbit outside the distortion of Earth's atmosphere allows it to capture extremely high-resolution images with substantially lower background light than ground-based telescopes.",
    facts: [
      "The Hubble Space Telescope (HST or Hubble) is a space telescope that was launched into low Earth orbit in 1990 and remains in operation.",
      "Hubble features a 2.4 m (7 ft 10 in) mirror, and its five main instruments observe in the ultraviolet, visible, and near-infrared regions of the electromagnetic spectrum.",
      "The Hubble Space Telescope was funded and built in the 1970s by NASA with contributions from the European Space Agency.",
      "Its intended launch was in 1983, but the project was beset by technical delays, budget problems, and the 1986 Challenger disaster.",
    ],
    model_url: "/models/space/hubble-space-telescope-a.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 75,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hubble Space Telescope",
    },
  },
  {
    slug: "hubble-space-telescope-b",
    name: "Hubble Space Telescope",
    subtitle: "Catalogue entry",
    description:
      "It was not the first space telescope, but it is one of the largest and most versatile, renowned as a vital research tool and as a public relations boon for astronomy. The Hubble Space Telescope is named after astronomer Edwin Hubble and is one of NASA's Great Observatories. The Space Telescope Science Institute (STScI) selects Hubble's targets and processes the resulting data, while the Goddard Space Flight Center (GSFC) controls the spacecraft. Hubble's orbit outside the distortion of Earth's atmosphere allows it to capture extremely high-resolution images with substantially lower background light than ground-based telescopes.",
    facts: [
      "The Hubble Space Telescope (HST or Hubble) is a space telescope that was launched into low Earth orbit in 1990 and remains in operation.",
      "Hubble features a 2.4 m (7 ft 10 in) mirror, and its five main instruments observe in the ultraviolet, visible, and near-infrared regions of the electromagnetic spectrum.",
      "The Hubble Space Telescope was funded and built in the 1970s by NASA with contributions from the European Space Agency.",
      "Its intended launch was in 1983, but the project was beset by technical delays, budget problems, and the 1986 Challenger disaster.",
    ],
    model_url: "/models/space/hubble-space-telescope-b.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 76,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hubble Space Telescope",
    },
  },
      {
    slug: "international-space-station-iss-e-intern",
    name: "International Space Station",
    subtitle: "Catalogue entry",
    description:
      "The International Space Station (ISS) is a space station in low Earth orbit (LEO). It is the product of the International Space Station program and is operated by five partner space agencies: NASA (United States), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada). It is the first space station built, maintained and crewed through international cooperation and the largest human spacecraft ever constructed. It is an orbital research station, where scientific experiments in microgravity are conducted and the space environment is studied.",
    facts: [
      "Since 2 November 2000, it has hosted the longest continuous human presence in space.",
      "The station orbits between 51.64° north and south, at about 400 kilometres (250 miles) above Earth, below the Van Allen radiation belts and most space debris.",
      "Its orbit takes it at 7.67 km/s (27,600 km/h; 17,200 mph) roughly every 93 minutes around Earth, 15.5 times a day.",
      "Measuring 109 m (358 ft) (with solar arrays) by 73 m (239 ft), it is as large as a full-sized football or soccer field, and has a pressurised internal volume of 1,005 m3 (35,491 ft3), comparable to a Boeing 747 airliner.",
    ],
    model_url: "/models/space/international-space-station-iss-e-intern.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 79,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — International Space Station",
    },
  },
  {
    slug: "international-x-ray-observatory",
    name: "International X-ray Observatory",
    subtitle: "Catalogue entry",
    description:
      "This proposed the start of a joint study for IXO. ESA, however, decided to reboot the mission on its own developing Advanced Telescope for High Energy Astrophysics as a part of Cosmic Vision program. == Science with IXO == X-ray observations are crucial for understanding the structure and evolution of the stars, galaxies, and the Universe as a whole. X-ray images reveal hot spots in the Universe – regions where particles have been energized or raised to very high temperatures by strong magnetic fields, violent explosions, and intense gravitational forces.",
    facts: [
      "The International X-ray Observatory (IXO) was a cancelled X-ray telescope that was to be launched in 2021 as a joint effort by NASA, the European Space Agency (ESA), and the Japan Aerospace Exploration Agency (JAXA).",
      "In May 2008, ESA and NASA established a coordination group involving all three agencies, with the intent of exploring a joint mission merging the ongoing XEUS and Constellation-X Observatory (Con-X) projects.",
      "NASA was forced to cancel the observatory due to budget constraints in fiscal year 2012.",
      "== IXO configuration == The heart of IXO mission was a single large X-ray mirror with up to 3 square meters of collecting area and 5 arcsec angular resolution, which is achieved with an extendable optical bench with a 20 m focal length.",
    ],
    model_url: "/models/space/international-x-ray-observatory.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 80,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — International X-ray Observatory",
    },
  },
  {
    slug: "interstellar-boundary-explorer-ibex",
    name: "Interstellar Boundary Explorer",
    subtitle: "Catalogue entry",
    description:
      "The mission is led by Dr. David J. McComas (IBEX principal investigator), formerly of the Southwest Research Institute (SwRI) and now with Princeton University. The Los Alamos National Laboratory and the Lockheed Martin Advanced Technology Center built the IBEX-Hi and IBEX-Lo sensors respectively.",
    facts: [
      "Interstellar Boundary Explorer (IBEX or Explorer 91 or SMEX-10) is a NASA satellite in Earth orbit that uses energetic neutral atoms (ENAs) to image the interaction region between the Solar System and interstellar space.",
      "The mission is part of NASA's Small Explorer program and was launched with a Pegasus-XL launch vehicle on 19 October 2008.",
      "The nominal mission baseline duration was two years after commissioning, and the prime ended in early 2011.",
      "In June 2011, IBEX was shifted to a new, more efficient, much more stable orbit.",
    ],
    model_url: "/models/space/interstellar-boundary-explorer-ibex.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 81,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Interstellar Boundary Explorer",
    },
  },
        {
    slug: "kepler-a",
    name: "Johannes Kepler",
    subtitle: "Catalogue entry",
    description:
      "The variety and impact of his work made Kepler one of the founders and fathers of modern astronomy, the scientific method, natural science, and modern science. He has been described as the \"father of science fiction\" for his novel Somnium. Kepler was a mathematics teacher at a seminary school in Graz, where he became an associate of Prince Hans Ulrich von Eggenberg. Later he became an assistant to the astronomer Tycho Brahe in Prague, and eventually the imperial mathematician to Emperor Rudolf II and his two successors Matthias and Ferdinand II.",
    facts: [
      "Johannes Kepler (27 December 1571 – 15 November 1630) was a German polymath who was an astronomer, mathematician, astrologer, natural philosopher and music theorist.",
      "He is a key figure in the 17th-century Scientific Revolution, best known for his laws of planetary motion, and his books Astronomia nova, Harmonice Mundi, and Epitome Astronomiae Copernicanae.",
      "== Early life == === Childhood (1571–1590) === Kepler was born on 27 December 1571, in the Free Imperial City of Weil der Stadt (now part of the Stuttgart Region in the German state of Baden-Württemberg).",
      "At age six, he observed the Great Comet of 1577, writing that he \"was taken by [his] mother to a high place to look at it.\" In 1580, at age nine, he observed another astronomical event, a lunar eclipse, recording that he remembered being \"called outdoors\" to see it and that the Moon \"appeared quite red\".",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 85,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Johannes Kepler",
    },
  },
  {
    slug: "landsat-7",
    name: "Landsat 7",
    subtitle: "Catalogue entry",
    description:
      "The satellite's companion, Earth Observing-1, trailed by one minute and followed the same orbital characteristics, but in 2011 its fuel was depleted and EO-1's orbit began to degrade. Landsat 7 was built by Lockheed Martin Space Systems. In 2016, NASA announced it planned to attempt the first ever refueling of a live satellite by refueling Landsat 7 in 2020 with the OSAM-1 mission. However after multiple delays, NASA announced the cancellation of OSAM-1 in March 2024.",
    facts: [
      "Landsat 7 is the seventh satellite of the Landsat program.",
      "Launched on 15 April 1999, Landsat 7's primary goal is to refresh the global archive of satellite photos, providing up-to-date and cloud-free images.",
      "The Landsat program is managed and operated by the United States Geological Survey, and data from Landsat 7 is collected and distributed by the USGS.",
      "The NASA WorldWind project allows 3D images from Landsat 7 and other sources to be freely navigated and viewed from any angle.",
    ],
    model_url: "/models/space/landsat-7.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 86,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Landsat 7",
    },
  },
  {
    slug: "landsat-8",
    name: "Landsat 8",
    subtitle: "Catalogue entry",
    description:
      "It is the eighth satellite in the Landsat program and the seventh to reach orbit successfully. Originally called the Landsat Data Continuity Mission (LDCM), it is a collaboration between NASA and the United States Geological Survey (USGS). NASA Goddard Space Flight Center in Greenbelt, Maryland, provided development, mission systems engineering, and acquisition of the launch vehicle while the USGS provided for development of the ground systems and will conduct on-going mission operations. It comprises the camera of the Operational Land Imager (OLI) and the Thermal Infrared Sensor (TIRS), which can be used to study Earth surface temperature and is used to study global warming.",
    facts: [
      "Landsat 8 is an American Earth observation satellite launched on 11 February 2013.",
      "During the first 108 days in orbit, LDCM underwent checkout and verification by NASA and on 30 May 2013 operations were transferred from NASA to the USGS when LDCM was officially renamed to Landsat 8.",
      "== Mission overview == With Landsat 5 retiring in early 2013, leaving Landsat 7 as the only on-orbit Landsat program satellite, Landsat 8 ensures the continued acquisition and availability of Landsat data utilizing a two-sensor payload, the Operational Land Imager (OLI) and the Thermal InfraRed Sensor (TIRS).",
      "The satellite was developed with a 5 years mission design life but was launched with enough fuel on board to provide for upwards of ten years of operations.",
    ],
    model_url: "/models/space/landsat-8.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 87,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Landsat 8",
    },
  },
  {
    slug: "laser-interferometer-space-antenna-lisa",
    name: "Laser Interferometer Space Antenna",
    subtitle: "Catalogue entry",
    description:
      "The Laser Interferometer Space Antenna (LISA) is a planned European space mission to detect and measure gravitational waves—slight ripples in the fabric of spacetime—from astronomical sources. LISA will be the first dedicated space-based gravitational-wave observatory. It aims to measure gravitational waves directly by using laser interferometry. The relative acceleration between the satellites is precisely monitored to detect a passing gravitational wave, which are distortions of spacetime travelling at the speed of light.",
    facts: [
      "The LISA concept features three spacecraft arranged in an equilateral triangle with each side 2.5 million kilometres long, flying in an Earth-like heliocentric orbit.",
      "The mission was selected by ESA in 2017 and formally adopted in January 2024.",
      "Construction began in 2025 following the award of the prime industrial contract to OHB System AG.",
      "As of 2026, LISA remains in the development and hardware-construction phase, with launch planned for approximately 2035 aboard an Ariane 6 launch vehicle.",
    ],
    model_url: "/models/space/laser-interferometer-space-antenna-lisa.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 88,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Laser Interferometer Space Antenna",
    },
  },
  {
    slug: "lunar-atmosphere-and-dust-environment-ex",
    name: "LADEE",
    subtitle: "Catalogue entry",
    description:
      "The Lunar Atmosphere and Dust Environment Explorer (LADEE; ) was a NASA lunar exploration and technology demonstration mission. During its seven-month mission LADEE orbited the Moon's equator studying the lunar exosphere and dust in the Moon's vicinity. Its instruments included a dust detector, neutral mass spectrometer, and ultraviolet-visible spectrometer, as well as a technology demonstration consisting of a laser communications terminal. It was initially planned to be launched with the Gravity Recovery and Interior Laboratory (GRAIL) satellites.",
    facts: [
      "It was launched on a Minotaur V rocket from the Mid-Atlantic Regional Spaceport on September 7, 2013.",
      "The mission ended on April 18, 2014, when the spacecraft's controllers intentionally crashed LADEE into the far side of the Moon, which was later determined to be near the eastern rim of Sundman V crater.",
      "== Planning and preparations == LADEE was announced during the presentation of NASA's FY09 budget in February 2008.",
      "Mechanical tests including acoustic, vibration and shock tests were completed prior to full-scale thermal vacuum chamber testing at NASA's Ames Research Center in April 2013.",
    ],
    model_url: "/models/space/lunar-atmosphere-and-dust-environment-ex.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 89,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — LADEE",
    },
  },
  {
    slug: "lunar-reconnaissance-orbiter-a",
    name: "Lunar Reconnaissance Orbiter",
    subtitle: "Catalogue entry",
    description:
      "The Lunar Reconnaissance Orbiter (LRO) is a NASA robotic spacecraft currently orbiting the Moon in an eccentric polar mapping orbit. Data collected by LRO have been described as essential for planning NASA's future human and robotic missions to the Moon. Its detailed mapping program is identifying safe landing sites, locating potential resources on the Moon, characterizing the radiation environment, and demonstrating new technologies. LRO and LCROSS were launched as part of the United States's Vision for Space Exploration program.",
    facts: [
      "Launched on June 18, 2009, in conjunction with the Lunar Crater Observation and Sensing Satellite (LCROSS), as the vanguard of NASA's Lunar Precursor Robotic Program, LRO was the first United States mission to the Moon in over ten years.",
      "The probe has made a 3-D map of the Moon's surface at 100-meter resolution and 98.2% coverage (excluding polar areas in deep shadow), including 0.5-meter resolution images of Apollo landing sites.",
      "The first images from LRO were published on July 2, 2009, showing a region in the lunar highlands south of Mare Nubium (Sea of Clouds).",
      "The total cost of the mission is reported as US$583 million, of which $504 million pertains to the main LRO probe and $79 million to the LCROSS satellite.",
    ],
    model_url: "/models/space/lunar-reconnaissance-orbiter-a.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Lunar Reconnaissance Orbiter",
    },
  },
      {
    slug: "mars-atmosphere-and-volatile-evolution-m",
    name: "MAVEN",
    subtitle: "Catalogue entry",
    description:
      "MAVEN is an inactive NASA spacecraft orbiting Mars that studied the loss of its atmospheric gases to space, providing insight into the history of the planet's climate and water. The name is an acronym for \"Mars Atmosphere and Volatile Evolution\" while the word maven also denotes \"a person who has special knowledge or experience; an expert\". It was the first NASA mission to study the Mars atmosphere. The probe analyzed the planet's upper atmosphere and ionosphere to examine how and at what rate the solar wind is stripping away volatile compounds.",
    facts: [
      "MAVEN was launched on an Atlas V rocket from Cape Canaveral Air Force Station, Florida, on 18 November 2013 and went into orbit around Mars on 22 September 2014.",
      "On 6 December 2025, MAVEN lost contact with Earth.",
      "Despite recovery efforts at NASA's Deep Space Network, contact could not be re-established as of January 2026.",
      "A review board was convened in February 2026, which determined the spacecraft was likely not recoverable.",
    ],
    model_url: "/models/space/mars-atmosphere-and-volatile-evolution-m.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — MAVEN",
    },
  },
    {
    slug: "mars-reconnaissance-orbiter-mro-c",
    name: "Mars Reconnaissance Orbiter",
    subtitle: "Catalogue entry",
    description:
      "The Mars Reconnaissance Orbiter (MRO) is a spacecraft designed to search for the existence of water on Mars and provide support for missions to Mars, as part of NASA's Mars Exploration Program. Mission objectives include observing the climate of Mars, investigating geologic forces, providing reconnaissance of future landing sites, and relaying data from surface missions back to Earth. To support these objectives, the MRO carries different scientific instruments, including three cameras, two spectrometers and a subsurface radar. The spacecraft continues to operate at Mars, far beyond its intended design life.",
    facts: [
      "It was launched from Cape Canaveral on August 12, 2005, at 11:43 UTC and reached Mars on March 10, 2006, at 21:24 UTC.",
      "In November 2006, after six months of aerobraking, it entered its final science orbit and began its primary science phase.",
      "As of July 29, 2023, the MRO has returned over 450 terabits of data, helped choose safe landing sites for NASA's Mars landers, and discovered pure water ice in new craters and further evidence that water once flowed on the surface on Mars.",
      "Due to its critical role as a high-speed data-relay for ground missions, NASA intends to continue the mission as long as possible, at least through the late 2020s.",
    ],
    model_url: "/models/space/mars-reconnaissance-orbiter-mro-c.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mars Reconnaissance Orbiter",
    },
  },
  {
    slug: "mercury-spacesuit",
    name: "Mercury spacesuit",
    subtitle: "Catalogue entry",
    description:
      "The Mercury space suit (or Navy Mark IV) was a full-body, high-altitude pressure suit originally developed by the B.F. Goodrich Company and the U.S. Navy for pilots of high-altitude fighter aircraft. It is best known for its role as the spacesuit worn by the astronauts of the Project Mercury spaceflights.",
    facts: [
      "The MK IV Full Pressure Suit ensemble was also used extensively by the US Navy from about 1959 through the early 1970s in aircraft such as the F-4 Phantom, A-3/A-5/RA-5C Vigilante, and F-8 Crusader.",
      "The Mark IV suit was first introduced in the late 1950s.",
      "The Mark IV suit solved the mobility problems with the use of elastic cord which arrested the \"ballooning\" of the suit, and at 22 pounds (10.0 kg), was the lightest pressure suit developed for military use.",
      "The most severe test of the suit occurred during the record-setting balloon flight of Malcolm Ross and Victor Prather in the Strato-Lab V unpressurized gondola to 113,740 feet (34,670 m) on May 4, 1961.",
    ],
    model_url: "/models/space/mercury-spacesuit.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 56,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mercury spacesuit",
    },
  },
  {
    slug: "mir",
    name: "Mir",
    subtitle: "Catalogue entry",
    description:
      "Mir (Russian: Мир, IPA: [ˈmʲir]; lit. The station served as a microgravity research laboratory in which crews conducted experiments in biology, human biology, physics, astronomy, meteorology, and spacecraft systems with a goal of developing technologies required for permanent occupation of space. It holds the record for the longest single human spaceflight, Valeri Polyakov, who spent 437 days on the station from 1994 until 1995. Mir's typical crew size was 3, though larger short-term crews made an appearance, peaking at ten during STS-71.",
    facts: [
      "'peace' or 'world') was a space station operated in low Earth orbit from 1986 to 2001, first by the Soviet Union and later by the Russian Federation.",
      "Mir was the first modular space station and was assembled in orbit from 1986 to 1996.",
      "At the time it was the largest artificial satellite in orbit, only being succeeded by the International Space Station (ISS) after Mir's deorbiting in 2001.",
      "Mir was the first continuously inhabited long-term research station in orbit and previously held the record for the longest continuous human presence in space at 3,644 days, until it was surpassed by the ISS in 2010.",
    ],
    model_url: "/models/space/mir.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mir",
    },
  },
    {
    slug: "near-shoemaker",
    name: "NEAR Shoemaker",
    subtitle: "Catalogue entry",
    description:
      "It was the first spacecraft to orbit an asteroid and land on it successfully. The primary scientific objective of NEAR was to return data on the bulk properties, composition, mineralogy, morphology, internal mass distribution, and magnetic field of Eros. Secondary objectives include studies of regolith properties, interactions with the solar wind, possible current activity as indicated by dust or gas, and the asteroid spin state. This data was used to help understand the characteristics of asteroids in general, their relationship to meteoroids and comets, and the conditions in the early Solar System.",
    facts: [
      "Near Earth Asteroid Rendezvous – Shoemaker (NEAR Shoemaker), renamed after its 1996 launch in honor of planetary scientist Eugene Shoemaker, was a robotic space probe designed by the Johns Hopkins University Applied Physics Laboratory for NASA to study the near-Earth asteroid Eros from close orbit over a period of a year.",
      "In February 2000, the mission closed in on the asteroid and orbited it.",
      "On February 12, 2001, Shoemaker touched down on the asteroid and was terminated just over two weeks later.",
      "The total mass of the instruments was 56 kg (123 lb), requiring 80 watts of power.",
    ],
    model_url: "/models/space/near-shoemaker.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — NEAR Shoemaker",
    },
  },
  {
    slug: "nancy-grace-roman-space-telescope-a",
    name: "Nancy Grace Roman Space Telescope",
    subtitle: "Catalogue entry",
    description:
      "It is named after NASA's first chief of astronomy, Nancy Grace Roman. The Coronagraph Instrument (CGI) is a high-contrast, small-field-of-view camera and spectrometer covering visible and near-infrared wavelengths using novel starlight-suppression technology. Its objectives include a search for exoplanets using gravitational microlensing, along with probing the chronology of the universe and growth of cosmic structure, with the end goal of measuring the effects of dark energy, the consistency of general relativity, and the curvature of spacetime. It was approved for development and launch on 17 February 2016.",
    facts: [
      "The Nancy Grace Roman Space Telescope is a NASA infrared space telescope that was launched on a trajectory toward a Sun–Earth L2 orbit on 30 August 2026.",
      "The telescope is based on an existing 2.4-meter (7.9-foot) primary mirror with a wide field of view that was donated by the National Reconnaissance Office and will carry two scientific instruments.",
      "The Wide-Field Instrument (WFI) is a 300.8-megapixel multi-band visible and near-infrared camera, providing image sharpness comparable to the Hubble Space Telescope over a 0.28-square-degree field of view, 100 times larger than imaging cameras on the Hubble.",
      "Roman was recommended in 2010 by the United States National Research Council Decadal Survey committee as the top priority for the next decade of astronomy.",
    ],
    model_url: "/models/space/nancy-grace-roman-space-telescope-a.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Nancy Grace Roman Space Telescope",
    },
  },
  {
    slug: "nancy-grace-roman-space-telescope-b",
    name: "Nancy Grace Roman Space Telescope",
    subtitle: "Catalogue entry",
    description:
      "It is named after NASA's first chief of astronomy, Nancy Grace Roman. The Coronagraph Instrument (CGI) is a high-contrast, small-field-of-view camera and spectrometer covering visible and near-infrared wavelengths using novel starlight-suppression technology. Its objectives include a search for exoplanets using gravitational microlensing, along with probing the chronology of the universe and growth of cosmic structure, with the end goal of measuring the effects of dark energy, the consistency of general relativity, and the curvature of spacetime. It was approved for development and launch on 17 February 2016.",
    facts: [
      "The Nancy Grace Roman Space Telescope is a NASA infrared space telescope that was launched on a trajectory toward a Sun–Earth L2 orbit on 30 August 2026.",
      "The telescope is based on an existing 2.4-meter (7.9-foot) primary mirror with a wide field of view that was donated by the National Reconnaissance Office and will carry two scientific instruments.",
      "The Wide-Field Instrument (WFI) is a 300.8-megapixel multi-band visible and near-infrared camera, providing image sharpness comparable to the Hubble Space Telescope over a 0.28-square-degree field of view, 100 times larger than imaging cameras on the Hubble.",
      "Roman was recommended in 2010 by the United States National Research Council Decadal Survey committee as the top priority for the next decade of astronomy.",
    ],
    model_url: "/models/space/nancy-grace-roman-space-telescope-b.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Nancy Grace Roman Space Telescope",
    },
  },
  {
    slug: "ocean-surface-topography-mission-ostm-ja",
    name: "OSTM/Jason-2",
    subtitle: "Catalogue entry",
    description:
      "These very accurate observations of variations in sea surface height — also known as ocean topography — provide information about global sea level, the speed and direction of ocean currents, and heat stored in the ocean. Scientists consider the 15-plus-year climate data record that this mission extended to be critical to understanding how ocean circulation is linked to global climate change. OSTM/Jason-2 was launched on 20 June 2008, at 07:46 UTC, from Space Launch Complex 2W at Vandenberg Air Force Base in California, by a Delta II 7320 rocket. The spacecraft separated from the rocket 55 minutes later.",
    facts: [
      "OSTM/Jason-2, or Ocean Surface Topography Mission/Jason-2 satellite, was an international Earth observation satellite altimeter joint mission for sea surface height measurements between NASA and CNES.",
      "It was the third satellite in a series started in 1992 by the NASA/CNES TOPEX/Poseidon mission and continued by the NASA/CNES Jason-1 mission launched in 2001.",
      "== History == Like its two predecessors, OSTM/Jason-2 used high-precision ocean altimetry to measure the distance between the satellite and the ocean surface to within a few centimeters.",
      "Jason-2 was built by Thales Alenia Space using a Proteus platform, under a contract from CNES, as well as the main Jason-2 instrument, the Poseidon-3 altimeter (successor to the Poseidon and Poseidon 2 altimeter on-board TOPEX/Poseidon and Jason-1).",
    ],
    model_url: "/models/space/ocean-surface-topography-mission-ostm-ja.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 62,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — OSTM/Jason-2",
    },
  },
  {
    slug: "parker-solar-probe",
    name: "Parker Solar Probe",
    subtitle: "Catalogue entry",
    description:
      "It is the fastest object ever built on Earth. Johns Hopkins University Applied Physics Laboratory designed and built the spacecraft, which was launched on August 12, 2018. It became the first NASA spacecraft named after a living person, honoring the physicist Eugene Newman Parker, professor emeritus at the University of Chicago. On October 29, 2018, at about 18:04 UTC, the spacecraft became the closest ever artificial object to the Sun.",
    facts: [
      "The Parker Solar Probe (PSP; previously Solar Probe, Solar Probe Plus or Solar Probe+) is a NASA space probe launched in 2018 to make observations of the Sun's outer corona.",
      "It used repeated gravity assists from Venus to develop an eccentric orbit, approaching within 9.86 solar radii (6.9 million km or 4.3 million miles) from the center of the Sun.",
      "At its closest approach in 2024, its speed relative to the Sun was 690,000 km/h (430,000 mph) or 191 km/s (118.7 mi/s), which is 0.064% the speed of light.",
      "The project was announced in the 2009 budget year.",
    ],
    model_url: "/models/space/parker-solar-probe.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Parker Solar Probe",
    },
  },
    {
    slug: "quick-scatterometer-quikscat",
    name: "QuikSCAT",
    subtitle: "Catalogue entry",
    description:
      "The NASA QuikSCAT (Quick Scatterometer) was an Earth observation satellite carrying the SeaWinds scatterometer. Its primary mission was to measure the surface wind speed and direction over the ice-free global oceans via its effect on water waves. Observations from QuikSCAT had a wide array of applications, and contributed to climatological studies, weather forecasting, meteorology, oceanographic research, marine safety, commercial fishing, tracking large icebergs, and studies of land and sea ice, among others. The QuikSCAT geophysical data record spans from 19 July 1999 to 21 November 2009.",
    facts: [
      "This SeaWinds scatterometer is referred to as the QuikSCAT scatterometer to distinguish it from the nearly identical SeaWinds scatterometer flown on the ADEOS-2 satellite.",
      "== Mission description == QuikSCAT was launched on 19 June 1999 with an initial 3-year mission requirement.",
      "QuikSCAT was a \"quick recovery\" mission replacing the NASA Scatterometer (NSCAT), which failed prematurely in June 1997 after just 9.5 months in operation.",
      "QuikSCAT, however, far exceeded these design expectations and continued to operate for over a decade before a bearing failure on its antenna motor ended QuikSCAT's capabilities to determine useful surface wind information on 23 November 2009.",
    ],
    model_url: "/models/space/quick-scatterometer-quikscat.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 65,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — QuikSCAT",
    },
  },
  {
    slug: "radome",
    name: "Radome",
    subtitle: "Catalogue entry",
    description:
      "A radome (a portmanteau of \"radar\" and \"dome\") is a structural, weatherproof enclosure that protects a radar antenna. The radome is constructed of material transparent to radio waves. Radomes protect the antenna from weather and conceal antenna electronic equipment from view. They also protect nearby personnel from being accidentally struck by quickly rotating antennas.",
    facts: [
      "the American E-3 Sentry), a discus-shaped rotating radome, often called a \"rotodome\", is mounted on the top of the fuselage for 360-degree scanning coverage.",
      "Some newer AEW&C configurations instead use three 120-degree phased array modules inside a stationary radome, examples being the Chinese KJ-2000 and Indian Netra AEW&C.",
      "The use of radomes dates back as far as 1941.",
      "The air supported radome built by Walter Bird in 1948 at the Cornell Aeronautical Laboratory is the first pneumatic construction built in history.",
    ],
    model_url: "/models/space/radome.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 66,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Radome",
    },
  },
  {
    slug: "solar-terrestrial-relations-observatory",
    name: "STEREO",
    subtitle: "Catalogue entry",
    description:
      "STEREO (Solar TErrestrial RElations Observatory) is a solar observation mission. This enabled stereoscopic imaging of the Sun and solar phenomena, such as coronal mass ejections. The apogee reached the Moon's orbit. On December 15, 2006, on the fifth orbit, the pair swung by the Moon for a gravity assist.",
    facts: [
      "Two nearly identical spacecraft (STEREO-A, STEREO-B) were launched in 2006 into orbits around the Sun that cause them to respectively pull farther ahead of and fall gradually behind the Earth.",
      "Contact with STEREO-B was lost in 2014 after it entered an uncontrolled spin preventing its solar panels from generating enough power.",
      "It was briefly resumed in 2016 before being interrupted and eventually declared lost.",
      "== Mission profile == The two STEREO spacecraft were launched at 00:52 UTC on October 26, 2006, from Launch Pad 17B at the Cape Canaveral Air Force Station in Florida on a Delta II 7925-10L launcher into highly elliptical geocentric orbits.",
    ],
    model_url: "/models/space/solar-terrestrial-relations-observatory.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 67,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — STEREO",
    },
  },
      {
    slug: "space-shuttle-c",
    name: "Space Shuttle",
    subtitle: "Catalogue entry",
    description:
      "The Space Shuttle is a retired, partially reusable low Earth orbital spacecraft system that went to the ISS and performed other orbital missions. National Aeronautics and Space Administration (NASA) as part of the Space Shuttle program. vice president Spiro Agnew for a system of reusable spacecraft where it was the only item funded for development. They launched from the Kennedy Space Center (KSC) in Florida.",
    facts: [
      "Operated from 1981 to 2011 by the U.S.",
      "Its official program name was the Space Transportation System (STS), taken from the 1969 plan led by U.S.",
      "The first (STS-1) of four orbital test flights occurred in 1981, leading to operational flights (STS-5) beginning in 1982.",
      "Five complete Space Shuttle orbiter vehicles were built and flown on a total of 135 missions from 1981 to 2011.",
    ],
    model_url: "/models/space/space-shuttle-c.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 70,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Space Shuttle",
    },
  },
  {
    slug: "space-shuttle-d",
    name: "Space Shuttle",
    subtitle: "Catalogue entry",
    description:
      "The Space Shuttle is a retired, partially reusable low Earth orbital spacecraft system that went to the ISS and performed other orbital missions. National Aeronautics and Space Administration (NASA) as part of the Space Shuttle program. vice president Spiro Agnew for a system of reusable spacecraft where it was the only item funded for development. They launched from the Kennedy Space Center (KSC) in Florida.",
    facts: [
      "Operated from 1981 to 2011 by the U.S.",
      "Its official program name was the Space Transportation System (STS), taken from the 1969 plan led by U.S.",
      "The first (STS-1) of four orbital test flights occurred in 1981, leading to operational flights (STS-5) beginning in 1982.",
      "Five complete Space Shuttle orbiter vehicles were built and flown on a total of 135 missions from 1981 to 2011.",
    ],
    model_url: "/models/space/space-shuttle-d.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 71,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Space Shuttle",
    },
  },
    {
    slug: "spitzer-space-telescope",
    name: "Spitzer Space Telescope",
    subtitle: "Catalogue entry",
    description:
      "It was the first spacecraft to use an Earth-trailing orbit, later used by the Kepler planet-finder telescope. This occurred on 15 May 2009. Without liquid helium to cool the telescope to the very low temperatures needed to operate, most of the instruments were no longer usable. During the warm mission, the two short wavelength channels of IRAC operated at 28.7 K and were predicted to experience little to no degradation at this temperature compared to the nominal mission.",
    facts: [
      "The Spitzer Space Telescope, formerly the Space Infrared Telescope Facility (SIRTF), was an infrared space telescope that was active between 2003 and 2020.",
      "Spitzer was the third space telescope dedicated to infrared astronomy, following IRAS (1983) and ISO (1995–1998).",
      "The planned mission period was to be 2.5 years with a pre-launch expectation that the mission could extend to five or slightly more years until the onboard liquid helium supply was exhausted.",
      "However, the two shortest-wavelength modules of the IRAC camera continued to operate with the same sensitivity as before the helium was exhausted, and continued to be used into early 2020 in the Spitzer Warm Mission.",
    ],
    model_url: "/models/space/spitzer-space-telescope.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 73,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Spitzer Space Telescope",
    },
  },
  {
    slug: "total-ozone-mapping-spectrometer-toms",
    name: "Total Ozone Mapping Spectrometer",
    subtitle: "Catalogue entry",
    description:
      "The Total Ozone Mapping Spectrometer (TOMS) was a NASA satellite instrument, specifically a spectrometer, for measuring the ozone layer. Of the five TOMS instruments which were built, four entered successful orbit. Operated until 1 August 1994. Operated until December 1994.",
    facts: [
      "The satellites carrying TOMS instruments were: Nimbus 7; launched October 24, 1978.",
      "Carried TOMS instrument number 1.",
      "Meteor-3-5; launched 15 August 1991.",
      "Carried TOMS instrument number 2.",
    ],
    model_url: "/models/space/total-ozone-mapping-spectrometer-toms.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 74,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Total Ozone Mapping Spectrometer",
    },
  },
  {
    slug: "transiting-exoplanet-survey-satellite-te",
    name: "Transiting Exoplanet Survey Satellite",
    subtitle: "Catalogue entry",
    description:
      "After the end of the primary mission around 4 July 2020, scientists continued to search its data for more planets, while the extended missions acquire additional data. As of 3 May 2026, TESS had identified 7,931 candidate exoplanets, of which 885 had been confirmed. The primary mission objective for TESS was to survey the brightest stars near the Earth for transiting exoplanets over a two-year period. The TESS satellite uses an array of wide-field cameras to perform a survey of 85% of the sky.",
    facts: [
      "The Transiting Exoplanet Survey Satellite (TESS) is a space telescope for NASA's Explorer program, designed to search for exoplanets using the transit method in an area 400 times larger than that covered by the Kepler mission.",
      "It was launched on 18 April 2018, atop a Falcon 9 launch vehicle and was placed into a highly elliptical 13.70-day orbit around the Earth.",
      "The first light image from TESS was taken on 7 August 2018, and released publicly on 17 September 2018.",
      "In the two-year primary mission, TESS was expected to detect about 1,250 transiting exoplanets orbiting the targeted stars, and an additional 13,000 orbiting stars not targeted but observed.",
    ],
    model_url: "/models/space/transiting-exoplanet-survey-satellite-te.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 75,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Transiting Exoplanet Survey Satellite",
    },
  },
  {
    slug: "tropical-rainfall-measuring-mission-trmm",
    name: "Tropical Rainfall Measuring Mission",
    subtitle: "Catalogue entry",
    description:
      "The Tropical Rainfall Measuring Mission (TRMM) was a joint space mission between NASA and JAXA designed to monitor and study tropical rainfall. The term refers to both the mission itself and the satellite that the mission used to collect data. TRMM was part of NASA's Mission to Planet Earth, a long-term, coordinated research effort to study the Earth as a global system. == Background == Tropical precipitation is a difficult parameter to measure, due to large spatial and temporal variations.",
    facts: [
      "The satellite was launched on 27 November 1997 from the Tanegashima Space Center in Tanegashima, Japan.",
      "TRMM operated for 17 years, including several mission extensions, before being decommissioned on 15 April 2015.",
      "TRMM re-entered Earth's atmosphere on 16 June 2015.",
      "Prior to TRMM, the distribution of rainfall worldwide was known to only a 50% of certainty.",
    ],
    model_url: "/models/space/tropical-rainfall-measuring-mission-trmm.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 76,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Tropical Rainfall Measuring Mission",
    },
  },
    {
    slug: "wilkinson-microwave-anisotropy-probe-wma",
    name: "Wilkinson Microwave Anisotropy Probe",
    subtitle: "Catalogue entry",
    description:
      "Headed by Professor Charles L. Bennett of Johns Hopkins University, the mission was developed in a joint partnership between the NASA Goddard Space Flight Center and Princeton University. The WMAP mission succeeded the COBE space mission and was the second medium-class (MIDEX) spacecraft in the NASA Explorers Program. WMAP's measurements played a key role in establishing the current Standard Model of Cosmology: the Lambda-CDM model.",
    facts: [
      "The Wilkinson Microwave Anisotropy Probe (WMAP), originally known as the Microwave Anisotropy Probe (MAP and Explorer 80), was a NASA spacecraft operating from 2001 to 2010 which measured temperature differences across the sky in the cosmic microwave background (CMB) – the radiant heat remaining from the Big Bang.",
      "The WMAP spacecraft was launched on 30 June 2001 from Florida.",
      "In 2003, MAP was renamed WMAP in honor of cosmologist David Todd Wilkinson (1935–2002), who had been a member of the mission's science team.",
      "After nine years of operations, WMAP was switched off in 2010, following the launch of the more advanced Planck spacecraft by the European Space Agency (ESA) in 2009.",
    ],
    model_url: "/models/space/wilkinson-microwave-anisotropy-probe-wma.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 78,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Wilkinson Microwave Anisotropy Probe",
    },
  },
  {
    slug: "wind",
    name: "Wind",
    subtitle: "Catalogue entry",
    description:
      "Wind is the natural movement of air or other gases relative to a planet's surface. Winds occur on a range of scales, from thunderstorm flows lasting tens of minutes, to local breezes generated by heating of land surfaces and lasting a few hours, to global winds resulting from the difference in absorption of solar energy between the climate zones on Earth. The study of wind is known as anemology. The two main causes of large-scale atmospheric circulation are the differential heating between the equator and the poles, and the rotation of the planet, which is called the Coriolis effect.",
    facts: [
      "Sustained wind speeds are reported globally at a 10-meter (33 ft) height and are averaged over a 10‑minute time frame.",
      "The United States reports winds over a 1‑minute average for tropical cyclones, and a 2‑minute average within weather observations.",
      "India typically reports winds over a 3‑minute average.",
      "Knowing the wind sampling average is important, as the value of a one-minute sustained wind is typically 14% greater than a ten-minute sustained wind.",
    ],
    model_url: "/models/space/wind.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 79,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Wind",
    },
  },
  {
    slug: "wrench",
    name: "Wrench",
    subtitle: "Catalogue entry",
    description:
      "A wrench or spanner is a tool used to provide grip and mechanical advantage in applying torque to turn objects—usually rotary fasteners, such as nuts and bolts—or keep them from turning. In the UK, Ireland, Australia, and New Zealand, spanner is the standard term. The most common shapes are called open-ended spanner and ring spanner. The term wrench is generally used for tools that turn non-fastening devices (e.g.",
    facts: [
      "The oldest recorded use dates to 1794.",
      "'Spanner' came into use in the 1630s, referring to the tool for winding the spring of a wheel-lock firearm.",
      "== History == Wrenches and applications using wrenches or devices that needed wrenches, such as pipe clamps and suits of armor, have been noted by historians as far back as the 15th century.",
      "The mid 19th century began to see patented wrenches that used a screw for narrowing and widening the jaws, including patented monkey wrenches.",
    ],
    model_url: "/models/space/wrench.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 80,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Wrench",
    },
  },
  
  /* ------------------------------------------------------------------ harvested entries
     Collected by scripts/harvest-catalogue-entries.mjs from both and Wikipedia, on 2026-10-07. The model_url of each one is written by the model pipeline. */
  {
    slug: "advanced-technology-large-aperture-space",
    name: "Large Ultraviolet Optical Infrared Surveyor",
    subtitle: "Catalogue entry",
    description:
      "The Large Ultraviolet Optical Infrared Surveyor, commonly known as LUVOIR (), is a multi-wavelength space telescope concept being developed by NASA under the leadership of a Science and Technology Definition Team. While LUVOIR is a concept for a general-purpose observatory, it has the key science goal of characterizing a wide range of exoplanets, including those that might be habitable. An additional goal is to enable a broad range of astrophysics, from the reionization epoch, through galaxy formation and evolution, to star and planet formation. Powerful imaging and spectroscopy observations of Solar System bodies would also be possible.",
    facts: [
      "It was one of four large astrophysics space mission concepts studied in preparation for the National Academy of Sciences 2020 Astronomy and Astrophysics Decadal Survey.",
      "LUVOIR would be a Large Strategic Science Mission and was considered for a development start sometime in the 2020s.",
      "The LUVOIR Study Team, under Study Scientist Aki Roberge, has produced designs for two variants of LUVOIR: one with a 15.1 m diameter telescope mirror (LUVOIR-A) and one with an 8 m diameter mirror (LUVOIR-B).",
      "The Final Report on the 5-year LUVOIR mission concept study was publicly released on 26 August 2019.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Large Ultraviolet Optical Infrared Surveyor",
    },
  },
  {
    slug: "apollo-lunar-module",
    name: "Apollo Lunar Module",
    subtitle: "Catalogue entry",
    description:
      "The Apollo Lunar Module (LM ), originally designated the Lunar Excursion Module (LEM), was the lunar lander spacecraft that was flown between lunar orbit and the Moon's surface during the United States' Apollo program. It was the first crewed spacecraft to operate exclusively in space, and remains the only crewed vehicle to land anywhere beyond Earth. Structurally and aerodynamically incapable of flight through Earth's atmosphere, the two-stage Lunar Module was ferried to lunar orbit attached to the Apollo command and service module (CSM), about twice its mass. Its crew of two flew the Lunar Module from lunar orbit to the Moon's surface.",
    facts: [
      "The total cost of the LM for development and the units produced was $21.65 billion in 2016 dollars, adjusting from a nominal total of $2.29 billion using the NASA New Start Inflation Indices.",
      "Of these, six were landed by humans on the Moon from 1969 to 1972.",
      "The first two flown were tests in low Earth orbit: Apollo 5, without a crew; and Apollo 9 with a crew.",
      "A third test flight in low lunar orbit was Apollo 10, a dress rehearsal for the first landing, conducted on Apollo 11.",
    ],
    model_url: "/models/space/apollo-lunar-module.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 51,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Apollo Lunar Module",
    },
  },
  {
    slug: "deep-space-1",
    name: "Deep Space 1",
    subtitle: "Catalogue entry",
    description:
      "It was part of the New Millennium Program, dedicated to testing advanced technologies. Problems during its initial stages and with its star tracker led to repeated changes in mission configuration. While the flyby of the asteroid was only a partial success, the encounter with the comet retrieved valuable information. Deep Space 1 was the first NASA spacecraft to use ion propulsion rather than the traditional chemical-powered rockets.",
    facts: [
      "Deep Space 1 (DS1) was a NASA technology demonstration spacecraft which flew by an asteroid and a comet.",
      "Launched on 24 October 1998, the Deep Space 1 spacecraft carried out a flyby of asteroid 9969 Braille, which was its primary science target.",
      "The mission was extended twice to include an encounter with comet 19P/Borrelly and further engineering testing.",
      "The Deep Space series was continued by the Deep Space 2 probes, which were launched in January 1999 piggybacked on the Mars Polar Lander and were intended to strike the surface of Mars (though contact was lost and the mission failed).",
    ],
    model_url: "/models/space/deep-space-1.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Deep Space 1",
    },
  },
  {
    slug: "deep-space-climate-observatory-dscovr-tr",
    name: "Deep Space Climate Observatory",
    subtitle: "Catalogue entry",
    description:
      "Deep Space Climate Observatory (DSCOVR; formerly known as Triana and unofficially as GoreSat) is a United States National Oceanic and Atmospheric Administration (NOAA) space weather, space climate, and Earth observation satellite. This is NOAA's first operational deep space satellite and became its primary system of warning Earth in the event of solar magnetic storms. It launched aboard a SpaceX Falcon 9 launch vehicle on 11 February 2015, and reached L1 on 8 June 2015, joining the list of objects orbiting at Lagrange points. NOAA operates DSCOVR from its Satellite and Product Operations Facility in Suitland, Maryland.",
    facts: [
      "It was launched by SpaceX on a Falcon 9 v1.1 launch vehicle on 11 February 2015, from Cape Canaveral, Florida.",
      "DSCOVR was originally proposed as an Earth observation spacecraft positioned at the Sun-Earth L1 Lagrange point, providing live video of the sunlit side of the planet through the Internet as well as scientific instruments to study climate change.",
      "Political changes in the United States resulted in the mission's cancellation, and in 2001 the spacecraft was placed into storage.",
      "Proponents of the mission continued to push for its reinstatement, and a change in presidential administration in 2009 resulted in DSCOVR being taken out of storage and refurbished, and its mission was refocused to solar observation and early warning of coronal mass ejections while still providing Earth observation and climate monitoring.",
    ],
    model_url: "/models/space/deep-space-climate-observatory-dscovr-tr.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Deep Space Climate Observatory",
    },
  },
  {
    slug: "gravity-recovery-and-climate-experiment",
    name: "GRACE and GRACE-FO",
    subtitle: "Catalogue entry",
    description:
      "The Gravity Recovery and Climate Experiment (GRACE) was a joint mission of NASA and the German Aerospace Center (DLR). The two satellites were sometimes called Tom and Jerry, a nod to the famous cartoon. By measuring gravity anomalies, GRACE showed how mass is distributed around the planet and how it varies over time. Data from the GRACE satellites is an important tool for studying Earth's ocean, geology, and climate.",
    facts: [
      "Twin satellites took detailed measurements of Earth's gravity field anomalies from its launch in March 2002 to the end of its science mission in October 2017.",
      "The GRACE Follow-On (GRACE-FO) is a continuation of the mission on near-identical hardware, launched in May 2018.",
      "On March 19, 2024, NASA announced that the successor to GRACE-FO would be GRACE-Continuity (GRACE-C), to be launched in December 2028.",
      "The two GRACE satellites, GRACE-1 and GRACE-2, were launched from Plesetsk Cosmodrome, Russia, on a Rockot (SS-19 + Briz upper stage) launch vehicle on 17 March 2002.",
    ],
    model_url: null,
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — GRACE and GRACE-FO",
    },
  },
  {
    slug: "high-energy-transient-explorer",
    name: "HETE 2",
    subtitle: "Catalogue entry",
    description:
      "Participating institutions with HETE-2 team members include the following: MIT, Center for Space Research (MIT/CSR) in Cambridge, Massachusetts — main investigator for HETE-2; George Ricker. MIT built and tested the spacecraft bus, the satellite control software, the primary ground station at Kwajalein Atoll, and the burst alert stations in the Galápagos, Ascension, Gabon, Kwajalein Atoll, and Kiribati. MIT/CSR designed and built the optical camera and soft X-ray camera systems for the HETE-2 project; these instruments used MIT Lincoln Lab CCD sensors. Los Alamos National Laboratory (LANL), Los Alamos, New Mexico – designed and built the WXM coded aperture and WXM flight and ground support software.",
    facts: [
      "High Energy Transient Explorer 2 (HETE-2; also known as Explorer 79) was a NASA astronomical satellite with international participation (mainly Japan and France).",
      "The satellite bus for the first HETE-1 was designed and built by AeroAstro, Inc.",
      "of Herndon, Virginia and was lost during launch on 4 November 1996; the replacement satellite, HETE-2 was built by Massachusetts Institute of Technology (MIT) based on the original HETE design.",
      "== International participation == The PI Institution at MIT is the headquarters for the HETE-2 Team; however, team members in science, instrument, and engineering are global.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — HETE 2",
    },
  },
  {
    slug: "international-space-station-iss-a",
    name: "International Space Station",
    subtitle: "Catalogue entry",
    description:
      "The International Space Station (ISS) is a space station in low Earth orbit (LEO). It is the product of the International Space Station program and is operated by five partner space agencies: NASA (United States), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada). It is the first space station built, maintained and crewed through international cooperation and the largest human spacecraft ever constructed. It is an orbital research station, where scientific experiments in microgravity are conducted and the space environment is studied.",
    facts: [
      "Since 2 November 2000, it has hosted the longest continuous human presence in space.",
      "The station orbits between 51.64° north and south, at about 400 kilometres (250 miles) above Earth, below the Van Allen radiation belts and most space debris.",
      "Its orbit takes it at 7.67 km/s (27,600 km/h; 17,200 mph) roughly every 93 minutes around Earth, 15.5 times a day.",
      "Measuring 109 m (358 ft) (with solar arrays) by 73 m (239 ft), it is as large as a full-sized football or soccer field, and has a pressurised internal volume of 1,005 m3 (35,491 ft3), comparable to a Boeing 747 airliner.",
    ],
    model_url: "/models/space/international-space-station-iss-a.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 56,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — International Space Station",
    },
  },
  {
    slug: "international-space-station-iss-b",
    name: "International Space Station",
    subtitle: "Catalogue entry",
    description:
      "The International Space Station (ISS) is a space station in low Earth orbit (LEO). It is the product of the International Space Station program and is operated by five partner space agencies: NASA (United States), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada). It is the first space station built, maintained and crewed through international cooperation and the largest human spacecraft ever constructed. It is an orbital research station, where scientific experiments in microgravity are conducted and the space environment is studied.",
    facts: [
      "Since 2 November 2000, it has hosted the longest continuous human presence in space.",
      "The station orbits between 51.64° north and south, at about 400 kilometres (250 miles) above Earth, below the Van Allen radiation belts and most space debris.",
      "Its orbit takes it at 7.67 km/s (27,600 km/h; 17,200 mph) roughly every 93 minutes around Earth, 15.5 times a day.",
      "Measuring 109 m (358 ft) (with solar arrays) by 73 m (239 ft), it is as large as a full-sized football or soccer field, and has a pressurised internal volume of 1,005 m3 (35,491 ft3), comparable to a Boeing 747 airliner.",
    ],
    model_url: "/models/space/international-space-station-iss-b.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — International Space Station",
    },
  },
  {
    slug: "international-space-station-iss-c-high-r",
    name: "International Space Station",
    subtitle: "Catalogue entry",
    description:
      "The International Space Station (ISS) is a space station in low Earth orbit (LEO). It is the product of the International Space Station program and is operated by five partner space agencies: NASA (United States), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada). It is the first space station built, maintained and crewed through international cooperation and the largest human spacecraft ever constructed. It is an orbital research station, where scientific experiments in microgravity are conducted and the space environment is studied.",
    facts: [
      "Since 2 November 2000, it has hosted the longest continuous human presence in space.",
      "The station orbits between 51.64° north and south, at about 400 kilometres (250 miles) above Earth, below the Van Allen radiation belts and most space debris.",
      "Its orbit takes it at 7.67 km/s (27,600 km/h; 17,200 mph) roughly every 93 minutes around Earth, 15.5 times a day.",
      "Measuring 109 m (358 ft) (with solar arrays) by 73 m (239 ft), it is as large as a full-sized football or soccer field, and has a pressurised internal volume of 1,005 m3 (35,491 ft3), comparable to a Boeing 747 airliner.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 58,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — International Space Station",
    },
  },
  {
    slug: "kepler-b",
    name: "Johannes Kepler",
    subtitle: "Catalogue entry",
    description:
      "The variety and impact of his work made Kepler one of the founders and fathers of modern astronomy, the scientific method, natural science, and modern science. He has been described as the \"father of science fiction\" for his novel Somnium. Kepler was a mathematics teacher at a seminary school in Graz, where he became an associate of Prince Hans Ulrich von Eggenberg. Later he became an assistant to the astronomer Tycho Brahe in Prague, and eventually the imperial mathematician to Emperor Rudolf II and his two successors Matthias and Ferdinand II.",
    facts: [
      "Johannes Kepler (27 December 1571 – 15 November 1630) was a German polymath who was an astronomer, mathematician, astrologer, natural philosopher and music theorist.",
      "He is a key figure in the 17th-century Scientific Revolution, best known for his laws of planetary motion, and his books Astronomia nova, Harmonice Mundi, and Epitome Astronomiae Copernicanae.",
      "== Early life == === Childhood (1571–1590) === Kepler was born on 27 December 1571, in the Free Imperial City of Weil der Stadt (now part of the Stuttgart Region in the German state of Baden-Württemberg).",
      "At age six, he observed the Great Comet of 1577, writing that he \"was taken by [his] mother to a high place to look at it.\" In 1580, at age nine, he observed another astronomical event, a lunar eclipse, recording that he remembered being \"called outdoors\" to see it and that the Moon \"appeared quite red\".",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Johannes Kepler",
    },
  },
  {
    slug: "mars-global-surveyor",
    name: "Mars Global Surveyor",
    subtitle: "Catalogue entry",
    description:
      "Mars Global Surveyor (MGS) was an American robotic space probe developed by NASA's Jet Propulsion Laboratory. MGS was a global mapping mission that examined the entire planet, from the ionosphere down through the atmosphere to the surface. As part of the larger Mars Exploration Program, Mars Global Surveyor performed atmospheric monitoring for sister orbiters during aerobraking, and helped Mars rovers and lander missions by identifying potential landing sites and relaying surface telemetry. A faint signal was detected three days later which indicated that it had gone into safe mode.",
    facts: [
      "It was launched on November 7, 1996, and collected data in orbit around Mars from 1997 to 2006.",
      "The spacecraft completed its primary mission in January 2001 and was in its third extended mission phase when, on 2 November 2006, it failed to respond to messages and commands.",
      "Attempts to recontact the spacecraft and resolve the problem failed, and NASA officially ended the mission in January 2007.",
      "MGS remains in a stable near-polar circular orbit at about 450 km altitude and as of 1996, was expected to crash onto the surface of the planet in 2050.",
    ],
    model_url: "/models/space/mars-global-surveyor.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mars Global Surveyor",
    },
  },
  {
    slug: "mars-odyssey",
    name: "2001 Mars Odyssey",
    subtitle: "Catalogue entry",
    description:
      "Its mission is to use spectrometers and a thermal imager to detect evidence of past or present water and ice, as well as study the planet's geology and radiation environment. The data Odyssey obtains is intended to help answer the question of whether life once existed on Mars and create a risk-assessment of the radiation that future astronauts on Mars might experience. It also acts as a relay for communications between the Curiosity rover, and previously the Mars Exploration Rovers and Phoenix lander, to Earth. The mission was named as a tribute to Arthur C.",
    facts: [
      "2001 Mars Odyssey is a robotic spacecraft orbiting the planet Mars.",
      "The project was developed by NASA, and contracted out to Lockheed Martin, with an expected cost for the entire mission of US$297 million.",
      "Clarke, evoking the name of his and Stanley Kubrick's 1968 film 2001: A Space Odyssey.",
      "Odyssey was launched April 7, 2001, on a Delta II rocket from Cape Canaveral Air Force Station, and reached Mars orbit on October 24, 2001, at 02:30 UTC (October 23, 19:30 PDT, 22:30 EDT).",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — 2001 Mars Odyssey",
    },
  },
  {
    slug: "mars-reconnaissance-orbiter-mro-a",
    name: "Mars Reconnaissance Orbiter",
    subtitle: "Catalogue entry",
    description:
      "The Mars Reconnaissance Orbiter (MRO) is a spacecraft designed to search for the existence of water on Mars and provide support for missions to Mars, as part of NASA's Mars Exploration Program. Mission objectives include observing the climate of Mars, investigating geologic forces, providing reconnaissance of future landing sites, and relaying data from surface missions back to Earth. To support these objectives, the MRO carries different scientific instruments, including three cameras, two spectrometers and a subsurface radar. The spacecraft continues to operate at Mars, far beyond its intended design life.",
    facts: [
      "It was launched from Cape Canaveral on August 12, 2005, at 11:43 UTC and reached Mars on March 10, 2006, at 21:24 UTC.",
      "In November 2006, after six months of aerobraking, it entered its final science orbit and began its primary science phase.",
      "As of July 29, 2023, the MRO has returned over 450 terabits of data, helped choose safe landing sites for NASA's Mars landers, and discovered pure water ice in new craters and further evidence that water once flowed on the surface on Mars.",
      "Due to its critical role as a high-speed data-relay for ground missions, NASA intends to continue the mission as long as possible, at least through the late 2020s.",
    ],
    model_url: "/models/space/mars-reconnaissance-orbiter-mro-a.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 62,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mars Reconnaissance Orbiter",
    },
  },
  {
    slug: "mars-reconnaissance-orbiter-mro-b",
    name: "Mars Reconnaissance Orbiter",
    subtitle: "Catalogue entry",
    description:
      "The Mars Reconnaissance Orbiter (MRO) is a spacecraft designed to search for the existence of water on Mars and provide support for missions to Mars, as part of NASA's Mars Exploration Program. Mission objectives include observing the climate of Mars, investigating geologic forces, providing reconnaissance of future landing sites, and relaying data from surface missions back to Earth. To support these objectives, the MRO carries different scientific instruments, including three cameras, two spectrometers and a subsurface radar. The spacecraft continues to operate at Mars, far beyond its intended design life.",
    facts: [
      "It was launched from Cape Canaveral on August 12, 2005, at 11:43 UTC and reached Mars on March 10, 2006, at 21:24 UTC.",
      "In November 2006, after six months of aerobraking, it entered its final science orbit and began its primary science phase.",
      "As of July 29, 2023, the MRO has returned over 450 terabits of data, helped choose safe landing sites for NASA's Mars landers, and discovered pure water ice in new craters and further evidence that water once flowed on the surface on Mars.",
      "Due to its critical role as a high-speed data-relay for ground missions, NASA intends to continue the mission as long as possible, at least through the late 2020s.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mars Reconnaissance Orbiter",
    },
  },
  {
    slug: "submillimeter-wave-astronomy-satellite-s",
    name: "Submillimeter Wave Astronomy Satellite",
    subtitle: "Catalogue entry",
    description:
      "The telescope was designed by the Smithsonian Astrophysical Observatory (SAO) and integrated by Ball Aerospace, while the spacecraft was built by NASA's Goddard Space Flight Center (GSFC). The mission's principal investigator is Gary J. Melnick. During this time, the mission underwent a conceptual design review on 8 June 1990, and a demonstration of the Schottky receivers and acousto-optical spectrometer concept was performed on 8 November 1991.",
    facts: [
      "Submillimeter Wave Astronomy Satellite (SWAS, also Explorer 74 and SMEX-3) is a NASA submillimetre astronomy satellite, and is the fourth spacecraft in the Small Explorer program (SMEX).",
      "It was launched on 6 December 1998, at 00:57:54 UTC, from Vandenberg Air Force Base aboard a Pegasus XL launch vehicle.",
      "== History == The Submillimeter Wave Astronomy Satellite mission was approved on 1 April 1989.",
      "The project began with the Mission Definition Phase, officially starting on 29 September 1989, and running through 31 January 1992.",
    ],
    model_url: "/models/space/submillimeter-wave-astronomy-satellite-s.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 64,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Submillimeter Wave Astronomy Satellite",
    },
  },
  {
    slug: "tselina-2",
    name: "Tselina (satellite)",
    subtitle: "Catalogue entry",
    description:
      "Tselina (Russian: Целина) were a series of military SIGINT satellites originally developed in the former Soviet Union and used in the past Russian military. These satellites could pinpoint the exact location of objects emitting radio signals. They could even identify the type of emitter, its operational modes, and its activity level. This function proved valuable for detecting potential military operations by monitoring increased radio communication activity.",
    facts: [
      "== Variants == Initially divided into \"Overview\" (Tselina-O) and \"Detailed\" (Tselina-D), since about 1980 the system has been integrated into a single satellite, Tselina-P, which is also known as Tselina-2.",
      "In total 130 Tselina satellites were launched.",
      "Tselina-O satellites were launched using Kosmos-3M rockets between 1967 and 1982.",
      "Tselina-D used the Vostok-2M and later the Tsyklon-3.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 65,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Tselina (satellite)",
    },
  },
  {
    slug: "van-allen-probes",
    name: "Van Allen Probes",
    subtitle: "Catalogue entry",
    description:
      "The Van Allen Probes, formerly known as the Radiation Belt Storm Probes (RBSP), are two robotic spacecraft that were used to study the Van Allen radiation belts that surround Earth. NASA conducted the Van Allen Probes mission as part of the Living With a Star program. Understanding the radiation belt environment and its variability has practical applications in the areas of spacecraft operations, spacecraft system design, mission planning and astronaut safety. == Overview == NASA's Goddard Space Flight Center manages the overall Living With a Star program of which RBSP is a project, along with Solar Dynamics Observatory (SDO).",
    facts: [
      "The probes were launched on 30 August 2012 and operated for seven years.",
      "Both spacecraft were deactivated in 2019 when they ran out of fuel.",
      "Probe A deorbited on 11 March 2026, while Probe B will not deorbit until the early 2030s.",
      "The primary mission was scheduled to last 2 years, with expendables expected to last for 4 years.",
    ],
    model_url: "/models/space/van-allen-probes.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 66,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Van Allen Probes",
    },
  },
  {
    slug: "vehicle-assembly-building-vab",
    name: "Vehicle Assembly Building",
    subtitle: "Catalogue entry",
    description:
      "The Vehicle Assembly Building (originally the Vertical Assembly Building), or VAB, is a large building at NASA's Kennedy Space Center (KSC) in Florida, designed to assemble large pre-manufactured space vehicle components, such as the massive Saturn V, the Space Shuttle and the Space Launch System, and stack them vertically onto one of three mobile launcher platforms used by NASA. == History == The VAB, completed in 1966, was originally built for the vertical assembly of the Apollo–Saturn V space vehicle and was originally referred to as the Vertical Assembly Building. In anticipation of post-Apollo projects such as the Space Shuttle program, it was renamed the Vehicle Assembly Building on February 3, 1965. It was subsequently used to mate the Space Shuttle orbiters to their external fuel tanks and solid rocket boosters.",
    facts: [
      "As of March 2022, the first Space Launch System (SLS) rocket was assembled inside in preparation for the Artemis I mission, launched on November 16, 2022.",
      "At 129,428,000 ft3 (3,665,000 m3), it is the eighth-largest building in the world by volume as of 2022.",
      "The building is at Launch Complex 39 at KSC, 149 miles (240 km) south of Jacksonville, 219 miles (352 km) north of Miami, and 50 miles (80 km) due east of Orlando, on Merritt Island on the Atlantic coast of Florida.",
      "The VAB is the largest single-story building in the world, was the tallest building (526 ft or 160 m) in Florida until 1974, and is the tallest building in the United States outside an urban area.",
    ],
    model_url: "/models/space/vehicle-assembly-building-vab.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 67,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Vehicle Assembly Building",
    },
  },
  {
    slug: "mercury-planet",
    name: "Mercury (planet)",
    subtitle: "Catalogue entry",
    description:
      "Mercury is the first planet from the Sun and the smallest in the Solar System. It is a rocky planet with a trace atmosphere and a surface gravity slightly lower than that of Mars. The surface of Mercury is similar to Earth's Moon, being cratered, with an expansive rupes system generated from thrust faults, and bright ray systems, formed by ejecta. Being the most inferior orbiting planet, it always appears close to the Sun in Earth's sky, as either a \"morning star\" or an \"evening star\".",
    facts: [
      "Its largest crater, Caloris Planitia, has a diameter of 1,550 km (960 mi), which is about one-third the diameter of the planet (4,880 km or 3,030 mi).",
      "Mercury's sidereal year (88.0 Earth days) and sidereal day (58.65 Earth days) are in a 3:2 ratio, in a spin–orbit resonance.",
      "Consequently, one solar day (sunrise to sunrise) on Mercury lasts for around 176 Earth days, or twice Mercury's sidereal year.",
      "This means that one side of Mercury will remain in sunlight for one Mercurian year of 88 Earth days; while during the next orbit, that side will be in darkness all the time until the next sunrise after another 88 Earth days.",
    ],
    model_url: "/models/space/mercury-planet.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 68,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mercury (planet)",
    },
  },
  {
    slug: "ganymede-moon",
    name: "Ganymede (moon)",
    subtitle: "Catalogue entry",
    description:
      "Ganymede is a natural satellite of Jupiter and is the largest and most massive moon in the Solar System. Like Saturn's largest moon, Titan, it is larger than the planet Mercury, but has somewhat less surface gravity than Mercury, Io, or Earth's Moon due to its lower density compared to the three. Ganymede is composed of silicate rock and water in approximately equal proportions. It is a fully differentiated body with an iron-rich, liquid metallic core, giving it the lowest moment of inertia factor of any solid body in the Solar System.",
    facts: [
      "Ganymede orbits Jupiter in roughly seven days and is in a 1:2:4 orbital resonance with the moons Europa and Io, respectively.",
      "Ganymede has a thin oxygen atmosphere that includes O, O2, and possibly O3.",
      "Ganymede's surface is composed of two main types of terrain, the first of which are lighter regions, generally crosscut by extensive grooves and ridges, dating from slightly less than 4 billion years ago, covering two-thirds of Ganymede.",
      "Ganymede's discovery is credited to Simon Marius and Galileo Galilei, who both observed it in 1610, as the third of the Galilean moons, the first group of objects discovered orbiting another planet.",
    ],
    model_url: "/models/space/ganymede-moon.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 69,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Ganymede (moon)",
    },
  },
  {
    slug: "callisto-moon",
    name: "Callisto (moon)",
    subtitle: "Catalogue entry",
    description:
      "Callisto ( kə-LIST-oh) is the second-largest moon of Jupiter, after Ganymede. It is also the third-largest moon in the Solar System, following Ganymede and Saturn's moon Titan, and nearly as large as the planet Mercury, but only about a third of that planet's mass. The surface of Callisto is the oldest and most heavily cratered in the Solar System, with the surface almost completely covered with impact craters. It does not show any signatures of subsurface processes such as plate tectonics or volcanism, and is thought to have evolved predominantly under the influence of impacts.",
    facts: [
      "With a diameter of 4,821 km, Callisto is roughly a third larger than Earth's Moon and orbits Jupiter on average at a distance of 1.883 million km, which is about five times further out than the Moon orbiting Earth.",
      "It is the outermost of the four large Galilean moons of Jupiter, which were discovered in 1610 with one of the first telescopes, and is today visible from Earth with common binoculars.",
      "Callisto is composed of approximately equal amounts of rock and ice, with a density of about 1.83 g/cm3, the lowest density and surface gravity of Jupiter's major moons.",
      "Investigation by the Galileo spacecraft revealed that Callisto may have a small silicate core and possibly a subsurface ocean of liquid water at depths greater than 100 km.",
    ],
    model_url: "/models/space/callisto-moon.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 70,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Callisto (moon)",
    },
  },
  {
    slug: "mercury-planet-brass-stylised",
    name: "Mercury (planet)",
    subtitle: "Catalogue entry",
    description:
      "Mercury is the first planet from the Sun and the smallest in the Solar System. It is a rocky planet with a trace atmosphere and a surface gravity slightly lower than that of Mars. The surface of Mercury is similar to Earth's Moon, being cratered, with an expansive rupes system generated from thrust faults, and bright ray systems, formed by ejecta. Being the most inferior orbiting planet, it always appears close to the Sun in Earth's sky, as either a \"morning star\" or an \"evening star\".",
    facts: [
      "Its largest crater, Caloris Planitia, has a diameter of 1,550 km (960 mi), which is about one-third the diameter of the planet (4,880 km or 3,030 mi).",
      "Mercury's sidereal year (88.0 Earth days) and sidereal day (58.65 Earth days) are in a 3:2 ratio, in a spin–orbit resonance.",
      "Consequently, one solar day (sunrise to sunrise) on Mercury lasts for around 176 Earth days, or twice Mercury's sidereal year.",
      "This means that one side of Mercury will remain in sunlight for one Mercurian year of 88 Earth days; while during the next orbit, that side will be in darkness all the time until the next sunrise after another 88 Earth days.",
    ],
    model_url: "/models/space/mercury-planet-brass-stylised.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 71,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mercury (planet)",
    },
  },
  {
    slug: "planet-earth",
    name: "Earth",
    subtitle: "Catalogue entry",
    description:
      "Earth is the third planet from the Sun and the only astronomical object known to harbor life. This is made possible by Earth being an ocean world, the only one in the Solar System sustaining liquid surface water. Most of Earth's land is at least somewhat humid and covered by vegetation, while large ice sheets at Earth's polar deserts retain more water than Earth's groundwater, lakes, rivers, and atmospheric water combined. Earth's crust consists of slowly moving tectonic plates, which interact to produce mountain ranges, volcanoes, and earthquakes.",
    facts: [
      "Almost all of Earth's water is contained in its ocean, which covers 70.8% of Earth's crust.",
      "The remaining 29.2% of Earth's crust is land, which is predominantly located within Earth's land hemisphere in the form of continental landmasses.",
      "The water vapor acts as a greenhouse gas and, together with other greenhouse gases in the atmosphere, particularly carbon dioxide (CO2), creates the conditions for both liquid surface water and water vapor to persist via the capturing of energy from the Sun's light.",
      "This process maintains the current average surface temperature of 14.76 °C (58.57 °F), at which water is liquid under normal atmospheric pressure.",
    ],
    model_url: "/models/space/planet-earth.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 72,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Earth",
    },
  },
  {
    slug: "planet-earth-alt-drag-to-change-lighting",
    name: "Earth",
    subtitle: "Catalogue entry",
    description:
      "Earth is the third planet from the Sun and the only astronomical object known to harbor life. This is made possible by Earth being an ocean world, the only one in the Solar System sustaining liquid surface water. Most of Earth's land is at least somewhat humid and covered by vegetation, while large ice sheets at Earth's polar deserts retain more water than Earth's groundwater, lakes, rivers, and atmospheric water combined. Earth's crust consists of slowly moving tectonic plates, which interact to produce mountain ranges, volcanoes, and earthquakes.",
    facts: [
      "Almost all of Earth's water is contained in its ocean, which covers 70.8% of Earth's crust.",
      "The remaining 29.2% of Earth's crust is land, which is predominantly located within Earth's land hemisphere in the form of continental landmasses.",
      "The water vapor acts as a greenhouse gas and, together with other greenhouse gases in the atmosphere, particularly carbon dioxide (CO2), creates the conditions for both liquid surface water and water vapor to persist via the capturing of energy from the Sun's light.",
      "This process maintains the current average surface temperature of 14.76 °C (58.57 °F), at which water is liquid under normal atmospheric pressure.",
    ],
    model_url: "/models/space/planet-earth-alt-drag-to-change-lighting.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 73,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Earth",
    },
  },
  {
    slug: "planet-saturn",
    name: "Saturn",
    subtitle: "Catalogue entry",
    description:
      "Saturn is the sixth planet from the Sun, and is the second largest planet in the Solar System, after Jupiter. Even though Saturn is almost as big as Jupiter, it has less than a third of its mass. Saturn's interior is thought to be composed of a rocky core, surrounded by a deep layer of metallic hydrogen, an intermediate layer of liquid hydrogen and liquid helium, and an outer layer of gas. Saturn has a pale yellow hue, due to ammonia crystals in its upper atmosphere.",
    facts: [
      "It is a gas giant, with an average radius of about 9 times that of Earth.",
      "It has an eighth of the average density of Earth, but is over 95 times more massive.",
      "Saturn orbits the Sun at a distance of 9.59 AU (1,434 million km), with an orbital period of 29.45 years.",
      "An electrical current in the metallic hydrogen layer is thought to give rise to Saturn's planetary magnetic field, which is weaker than Earth's, but has a magnetic moment 580 times that of Earth because of Saturn's greater size.",
    ],
    model_url: "/models/space/planet-saturn.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 74,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Saturn",
    },
  },
  {
    slug: "solar-system",
    name: "Solar System",
    subtitle: "Catalogue entry",
    description:
      "The Solar System is the gravitationally bound system of the Sun and the masses that orbit it, most prominently its eight planets, of which Earth is one. The Solar System is an isolated single-star planetary system (not part of a larger star system) within the Milky Way Galaxy. Inside the Sun's core, hydrogen is fused into helium, releasing energy that is emitted through the Sun's photosphere. This creates the heliosphere and a decreasing temperature gradient across the Solar System.",
    facts: [
      "The system formed about 4.6 billion years ago when a dense region of a molecular cloud collapsed, creating the Sun and a protoplanetary disc from which the orbiting bodies assembled.",
      "The Sun accounts for 99.86% of the Solar System's total mass.",
      "Jupiter and Saturn possess nearly 90% of the non-stellar mass of the Solar System.",
      "At around 70–90 AU from the Sun, the solar wind is halted by the interstellar medium, resulting in the heliopause and the border of the interplanetary medium to interstellar space.",
    ],
    model_url: "/models/space/solar-system.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 75,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Solar System",
    },
  },
  {
    slug: "umbriel",
    name: "Umbriel",
    subtitle: "Catalogue entry",
    description:
      "Umbriel () is the third-largest moon of Uranus. Umbriel consists mainly of ice with a substantial fraction of rock, and may be differentiated into a rocky core and an icy mantle. The surface is the darkest among Uranian moons and appears to have been shaped primarily by impacts, however, the presence of canyons suggests early internal processes. The moon may have undergone an early endogenically driven resurfacing event that obliterated its older surface.",
    facts: [
      "It was discovered on October 24, 1851, by William Lassell at the same time as neighboring moon Ariel.",
      "It was named after a character in Alexander Pope's 1712 poem The Rape of the Lock.",
      "Covered by numerous impact craters reaching 210 km (130 mi) in diameter, Umbriel is the second-most heavily cratered satellite of Uranus after Oberon.",
      "Umbriel has been studied up close only once, by the spacecraft Voyager 2 in January 1986.",
    ],
    model_url: "/models/space/umbriel.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 76,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Umbriel",
    },
  },
  {
    slug: "black-hole",
    name: "Black hole",
    subtitle: "Catalogue entry",
    description:
      "A black hole is an astronomical body so compact that its gravity prevents anything, including light, from escaping. Albert Einstein's theory of general relativity, which describes gravitation as the curvature of spacetime, predicts that any sufficiently compact mass will form a black hole. The boundary of no escape is called the event horizon. In general relativity, crossing a black hole's event horizon traps an object inside but produces no locally detectable change.",
    facts: [
      "Objects whose gravitational fields are too strong for light to escape were first considered in the 18th century.",
      "In 1916, the first solution of general relativity that would characterise a black hole was found.",
      "By the late 1950s, this solution began to be interpreted physically as a region of space from which nothing can escape.",
      "Black holes were long considered a mathematical curiosity; it was not until the 1960s that theoretical work showed they were a generic prediction of general relativity.",
    ],
    model_url: "/models/space/black-hole.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 77,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Black hole",
    },
  },
  {
    slug: "planet-neptune",
    name: "Neptune",
    subtitle: "Catalogue entry",
    description:
      "Neptune is the eighth and farthest known planet orbiting the Sun. It is the fourth-largest planet in the Solar System by diameter, the third-most-massive planet, and the densest giant planet. Compared to Uranus, its neighbouring ice giant, Neptune is slightly smaller, but more massive and dense. Being composed primarily of gases and liquids, it has no well-defined solid surface.",
    facts: [
      "It is 17 times the mass of Earth.",
      "Neptune orbits the Sun once every 164.8 years at an orbital distance of 30.1 astronomical units (4.5 billion kilometres; 2.8 billion miles).",
      "Neptune was subsequently directly observed with a telescope on 23 September 1846 by Johann Gottfried Galle within a degree of the position predicted by Le Verrier.",
      "Its largest moon, Triton, was discovered shortly thereafter, though none of the planet's remaining moons were located telescopically until the 20th century.",
    ],
    model_url: "/models/space/planet-neptune.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 78,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Neptune",
    },
  },
  {
    slug: "neptune-v2",
    name: "Neptune",
    subtitle: "Catalogue entry",
    description:
      "Neptune is the eighth and farthest known planet orbiting the Sun. It is the fourth-largest planet in the Solar System by diameter, the third-most-massive planet, and the densest giant planet. Compared to Uranus, its neighbouring ice giant, Neptune is slightly smaller, but more massive and dense. Being composed primarily of gases and liquids, it has no well-defined solid surface.",
    facts: [
      "It is 17 times the mass of Earth.",
      "Neptune orbits the Sun once every 164.8 years at an orbital distance of 30.1 astronomical units (4.5 billion kilometres; 2.8 billion miles).",
      "Neptune was subsequently directly observed with a telescope on 23 September 1846 by Johann Gottfried Galle within a degree of the position predicted by Le Verrier.",
      "Its largest moon, Triton, was discovered shortly thereafter, though none of the planet's remaining moons were located telescopically until the 20th century.",
    ],
    model_url: "/models/space/neptune-v2.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 79,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Neptune",
    },
  },
  {
    slug: "planet-nine",
    name: "Planet Nine",
    subtitle: "Catalogue entry",
    description:
      "Planet Nine is a hypothetical ninth planet in the outer region of the Solar System. These ETNOs tend to make their closest approaches to the Sun in one sector, and their orbits are similarly tilted. These alignments suggest that an undiscovered planet may be shepherding the orbits of the most distant known Solar System objects. Nonetheless, some astronomers question this conclusion and instead assert that the clustering of the ETNOs' orbits is due to observational biases stemming from the difficulty of discovering and tracking these objects during much of the year.",
    facts: [
      "Its gravitational effects could explain the peculiar clustering of orbits for a group of extreme trans-Neptunian objects (ETNOs)—bodies beyond Neptune that orbit the Sun at distances averaging more than 250 times that of the Earth, over 250 astronomical units (AU).",
      "Based on earlier considerations, this hypothetical super-Earth-to-mini-Neptune sized planet would have had a predicted mass of five to ten times that of the Earth, and an elongated orbit 400–800 AU.",
      "The orbit estimation was refined in 2021, resulting in a somewhat smaller semimajor axis of 380+140−80 AU.",
      "This was shortly thereafter updated to 460 +160−100 AU, and to 290±30 AU in 2025.",
    ],
    model_url: "/models/space/planet-nine.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 80,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Planet Nine",
    },
  },
  {
    slug: "titan",
    name: "Titan",
    subtitle: "Catalogue entry",
    description:
      "Titan most often refers to: Titan (moon), the largest moon of Saturn Titans, a generation of deities in Greek mythology Titan or Titans may also refer to: == Arts and entertainment == === Fictional entities === ==== Fictional locations ==== Titan in fiction, fictionalized depictions of the moon of Saturn Titan (Marvel Comics location), a moon Titan (Marvel Cinematic Universe), its Marvel Cinematic Universe counterpart Titan, a moon in the list of locations of the DC Universe Titan, a Fighting Fantasy gamebooks world ==== Fictional characters ==== Titan (Dark Horse Comics), a superhero Titan (Imperial Guard), a Marvel Comics superhero Titan (New Gods), from DC Comics' Darkseid's Elite Titan, in the Infershia Pantheon Titan, in Megamind Titan, in Sym-Bionic Titan King Titan, on Stingray (1964 TV series) Titan, in Invincible (comics) ==== Fictional species and groups ==== Titan (Dune) Titan (Dungeons & Dragons) Titans (Attack on Titan) Teen Titans, a DC superhero team Titan Legions, units in the tabletop game Epic Titans, in All Tomorrows Titans, in Brütal Legend Titans, in Deltarune Titans, in Destiny (video game) Titans, in the MonsterVerse franchise, introduced in Godzilla: King of the Monsters Titans, in the Marvel Universe, the fictional race of supervillain Thanos Titans, in Mobile Suit Zeta Gundam Titans, in Skibidi Toilet Titans, in The Owl House Titans, in Titanfall ==== Other fictional entities ==== Titan, a chemical in Batman: Arkham Asylum Titan, a class of ship in Eve Online Titan (Battlefield 2142), a type of ship in Battlefield 2142 and a game mode based on them Titan, a ship in the 1898 novel The Wreck of the Titan: Or, Futility noted for similarities to the Titanic Titan Off-Planet Construction, in the video games DOOM (2016) and DOOM Eternal === Film and television === The Titan (film), a 2018 science fiction film directed by Lennart Ruff The Titan: Story of Michelangelo, a 1950 German documentary film Titan A.E., a 2000 animated film Titans (film), a Malayalam-language film Titans (2000 TV series), a 2000 American soap opera Titans (2018 TV series), a 2018 live-action superhero series Titans (Canadian TV series), a 1981–1982 docudrama series === Games === Titan (1988 video game), a puzzle game by Titus Titan (cancelled video game), a cancelled massively multiplayer game planned by Blizzard Entertainment Titan, the original name of a cancelled massively multiplayer game based on Halo; see Unreleased Halo games § Halo MMO Titan (board game) Titan (eSports), an electronic sports team Age of Mythology: The Titans, an expansion pack for the Age of Mythology computer game Planetary Annihilation: Titans, an expansion pack RTS for Planetary Annihilation === Literature === Titan (Baxter novel), a 1997 science fiction novel by Stephen Baxter Titan (Bova novel), by Ben Bova in the Grand Tour series Titan (Jean Paul novel), a novel by the German writer Jean Paul Titan (John Varley novel), a 1979 novel in the Gaea Trilogy Titan (Fighting Fantasy book), a 1986 fantasy encyclopedia edited by Marc Gascoigne Titan: The Life of John D. The Titan (collection), a collection of short stories by P. Schuyler Miller The Titan (novel), 1914, by Theodore Dreiser The Titans (comic book) (1999–2003), published by DC Comics, featuring the Teen Titans superhero team The Titans (novel), in the Kent Family Chronicles series by John Jakes Titan (novel), a 2026 novel by Rob Grant and Andrew Marshall === Music === Titán (band), a Mexican band Tytan (band), a British rock band Titan (album), 2014, by Septicflesh Symphony No. 1 (Mahler), given the working title Titan \"Titan\" (song), 2023, by Besa Kokëdhima \"Titan\", by Bright from the album The Albatross Guest House \"Titan\", by HammerFall from the album Threshold The Titan (EP), by Oh, Sleeper \"The Titan\", by In Vain from the album The Latter Rain \"The Titan\", by Iron Savior from the album Firestar \"Titans\", by Major Lazer featuring Sia and Labyrinth from the album Music Is the Weapon (Reloaded) \"Titans\", a 2015 song by Aero Chord and Razihel === Roller coasters === Titan (Six Flags Over Texas), a steel hyper coaster at Six Flags Over Texas, Arlington, Texas, US Titan (Space World), a steel roller coaster at Space World, Kitakyushu, Japan == Brands and enterprises == === Entertainment and media companies === Titan (transit advertising company), an American advertising company Titan Corporation, a US–based information technology company Titan Entertainment Group, a British media company that includes Titan Books and Titan Comics Titan Media, a pornographic film company Titan Studios, a video game company Titan Productions, defunct film dubbing studio originally known as Titra Studios Titan Content === Manufacturers === Titan Aircraft, an aircraft kit manufacturer Titan Cement, a Greek building materials company Titan Chemical Corp, a Malaysian chemical company Titan Company, an Indian watchmaking and luxury goods company Titan Formula Cars, a race car manufacturer from 1967 to 1976 Titan Tire Corporation === Other brands and enterprises === Titan (ice hockey), a hockey equipment brand by The Hockey Company Titan, a line of locks by Kwikset Titan Airways, an airline Titan Advisors, an American asset management firm TITAN Salvage, a marine salvage and wreck removal company == People == Titán (wrestler) (born 1990), Mexican masked wrestler Paula Titan (born 1990), Brazilian politician Oliver Kahn (born 1969), German footballer known as Der Titan Titan Leeds (1699–1738), American almanac publisher == Places == Titan (cave), Derbyshire, England Titan, Saghar District, Afghanistan Titan, Bucharest, a neighborhood of Bucharest, Romania Titan metro station Titan, Russia, a rural locality in Murmansk Oblast, Russia Titan Tower (Fisher Towers), a natural tower in Utah, US Titan Stadium (disambiguation), name of a number of stadiums == Science and technology == === Computing === ==== Smartphones ==== HTC Titan (Windows Mobile phone), running the Windows Mobile operating system HTC Titan, running the Windows Phone operating system HTC TyTN Moto G (2nd generation), a Motorola smartphone with the codename Titan running the Android operating system ==== Other uses in computing ==== Titan (1963 computer), a 1960s British computer Titan (email), an email service Titan (microprocessor), a scrapped family of 32-bit PowerPC–based microprocessor cores Titan (supercomputer), an American supercomputer Titan, a Facebook messaging platform GTX Titan, a GPU by NVIDIA TITAN2D, a geoflow simulation software application Titan (security token), a security chip and key from Google === Cranes === Herman the German (crane vessel), former nickname for the floating crane Titan in the Panama Canal Zone Titan (crane), an Australian floating crane Titan crane, a type of block setting crane Titan Clydebank, a cantilever crane in Scotland === Natural sciences === Titan (moon), the largest moon of Saturn \"-titan\", a commonly used taxonomic suffix to describe large animals Titan beetle Titan test, an intelligence test === Other technologies === Tactical Intelligence Targeting Access Node (TITAN), a US Army program == Sports == === Sports teams === ==== American football ==== Tennessee Titans Titans of New York ==== Basketball ==== Dresden Titans, Germany Titanes de Barranquilla, Colombia Victoria Titans, Australia ==== Rugby ==== Gold Coast Titans, an Australian rugby league team Taunton Titans, first XV team of Taunton Rugby Football Club Titans RLFC, a Welsh rugby league team Ulster Titans, a Northern Irish rugby team ==== Other sports ==== Acadie–Bathurst Titan, a 1998–2025 Canadian ice hockey team Kotka Titans, a Finnish ice hockey team New York Titans (lacrosse), a 2006–2009 American lacrosse team Orlando Titans, a 2010 American lacrosse team Titanes F.C., a Venezuelan football team Titans (cricket team), a South African cricket team === Championships === Titan Cup, a triangular cricket series between India, South Africa and Australia in 1996 == Vehicles == === Air- and spacecraft === Titan (rocket family) Titan I Titan II Airfer Titan, a Spanish paramotor design Cessna 404 Titan, a light aircraft Ellipse Titan, a hang glider Titan Tornado, a family of cantilever high-wing, pusher configuration, tricycle gear-equipped kit aircraft manufactured by Titan Aircraft === Land vehicles === Titan Armoured Vehicle Launching Bridge, an Armoured Bridge Launcher used by the British Army Apple electric car project, codenamed Titan Chevrolet Titan, a cabover truck made 1968–1988 Leyland Titan (B15), a bus made 1977–1984 Leyland Titan (front-engined double-decker), a bus chassis made 1927–1969 Mazda Titan, a cabover truck sold in Japan Nissan Titan, a pickup truck sold 2004–2024 Terex 33-19 \"Titan\", a haul truck Volkswagen Titan, a truck in the Volkswagen Constellation line sold in Brazil === Maritime vessels === Titan (steam tug 1894), a Dutch steam tug Titan (submersible), imploded during a descent to observe the wreck of RMS Titanic in 2023 Titan submersible implosion Titan (yacht), a 2010 Abeking & Rasmussen built yacht Titan (crane), an Australian floating crane Empire Titan, a tugboat USNS Titan (T-AGOS-15), a 1988 U.S.",
    facts: [
      "Rockefeller, Sr., a 1998 non-fiction book by Ron Chernow Star Trek: Titan, a novel series The Game-Players of Titan, a 1963 science fiction novel by Philip K.",
      "Dick The Sirens of Titan, a 1959 science fiction novel by Kurt Vonnegut Jr.",
    ],
    // Wired by hand: the pipeline downloaded and credited this model but could not find the entry's
    // line to write, and said so ("could not find the model_url that belongs to titan") rather than
    // failing quietly. The credit and the file were both already in place.
    model_url: "/models/space/titan.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 81,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Titan",
    },
  },
  {
    slug: "phobos-grunt",
    name: "Fobos-Grunt",
    subtitle: "Catalogue entry",
    description:
      "Fobos-Grunt or Phobos-Grunt (Russian: Фобос-Грунт, lit. 'Phobos-soil') was an attempted Russian sample return mission to Phobos, one of the moons of Mars. Funded by the Russian Federal Space Agency and developed by Lavochkin and the Russian Space Research Institute, Fobos-Grunt was the first Russian-led interplanetary mission since the failed Mars 96. The last successful interplanetary missions were the Soviet Vega 2 in 1985–1986, and the partially successful Phobos 2 in 1988–1989.",
    facts: [
      "Fobos-Grunt also carried the Chinese Mars orbiter Yinghuo-1 and the tiny Living Interplanetary Flight Experiment funded by the Planetary Society.",
      "It was launched on 8 November 2011, at 20:16 UTC, from the Baikonur Cosmodrome, but subsequent rocket burns intended to set the craft on a course for Mars failed, leaving it stranded in low Earth orbit.",
      "Efforts to reactivate the craft were unsuccessful, and it fell back to Earth in an uncontrolled re-entry on 15 January 2012, over the Pacific Ocean, west of Chile.",
      "The return vehicle was to have returned to Earth in August 2014, carrying up to 200 g (7.1 oz) of soil from Phobos.",
    ],
    model_url: null,
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 82,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Fobos-Grunt",
    },
  },
  {
    slug: "meteorite",
    name: "Meteorite",
    subtitle: "Catalogue entry",
    description:
      "A meteorite is a rock that originated in outer space and has fallen to the surface of a planet or moon. When the original object enters the atmosphere, various factors such as friction, pressure, and chemical interactions with the atmospheric gases cause it to heat up and radiate energy. It then becomes a meteor and forms a fireball, also known as a shooting star; astronomers call the brightest examples \"bolides\". Once it settles on the larger body's surface, the meteor becomes a meteorite.",
    facts: [
      "\"Meteorites\" less than ~1 mm (3⁄64 inch) in diameter are classified as micrometeorites, however micrometeorites differ from meteorites in that they typically melt completely in the atmosphere and fall to Earth as quenched droplets.",
      "(The first example of a stony meteorite found in association with a large impact crater, the Morokweng impact structure in South Africa, was reported in May 2006.) Several phenomena are well documented during witnessed meteorite falls too small to produce hypervelocity craters.",
      "On stony meteorites, the heat-affected zone is at most a few mm deep; in iron meteorites, which are more thermally conductive, the structure of the metal may be affected by heat up to 1 cm (3⁄8 inch) below the surface.",
      "Only about 6% of meteorites are iron meteorites or a blend of rock and metal, the stony-iron meteorites.",
    ],
    model_url: "/models/space/meteorite.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 83,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Meteorite",
    },
  },
  {
    slug: "barringer-meteorite-crater",
    name: "Meteor Crater",
    subtitle: "Catalogue entry",
    description:
      "The site had several earlier names, and fragments of the meteorite are officially called the Canyon Diablo Meteorite, after the adjacent Canyon Diablo. One of the features of the crater is its squared-off outline, believed to be caused by existing regional jointing (cracks) in the strata at the impact site. Despite an attempt to make the crater a public landmark, the crater remains privately owned by the Barringer family to the present day through their Barringer Crater Company. The Lunar and Planetary Institute, the American Museum of Natural History, and other science institutes proclaim it to be the \"best-preserved meteorite crater on Earth\".",
    facts: [
      "Meteor Crater, or Barringer Crater, is an impact crater about 37 mi (60 km) east of Flagstaff and 18 mi (29 km) west of Winslow in the desert of northern Arizona, United States.",
      "Meteor Crater lies at an elevation of 5,640 ft (1,719 m) above sea level.",
      "It is about 3,900 ft (1,200 m) in diameter, some 560 ft (170 m) deep, and is surrounded by a rim that rises 148 ft (45 m) above the surrounding plains.",
      "The center of the crater is filled with 690–790 ft (210–240 m) of rubble lying above crater bedrock.",
    ],
    model_url: null,
    accent: ["#ffb457", "#301a05"],
    popularity: 84,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Meteor Crater",
    },
  },
  {
    slug: "meteorites",
    name: "Meteorite",
    subtitle: "Catalogue entry",
    description:
      "A meteorite is a rock that originated in outer space and has fallen to the surface of a planet or moon. When the original object enters the atmosphere, various factors such as friction, pressure, and chemical interactions with the atmospheric gases cause it to heat up and radiate energy. It then becomes a meteor and forms a fireball, also known as a shooting star; astronomers call the brightest examples \"bolides\". Once it settles on the larger body's surface, the meteor becomes a meteorite.",
    facts: [
      "\"Meteorites\" less than ~1 mm (3⁄64 inch) in diameter are classified as micrometeorites, however micrometeorites differ from meteorites in that they typically melt completely in the atmosphere and fall to Earth as quenched droplets.",
      "(The first example of a stony meteorite found in association with a large impact crater, the Morokweng impact structure in South Africa, was reported in May 2006.) Several phenomena are well documented during witnessed meteorite falls too small to produce hypervelocity craters.",
      "On stony meteorites, the heat-affected zone is at most a few mm deep; in iron meteorites, which are more thermally conductive, the structure of the metal may be affected by heat up to 1 cm (3⁄8 inch) below the surface.",
      "Only about 6% of meteorites are iron meteorites or a blend of rock and metal, the stony-iron meteorites.",
    ],
    model_url: "/models/space/meteorites.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 85,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Meteorite",
    },
  },
  {
    slug: "planetary-nebula",
    name: "Planetary nebula",
    subtitle: "Catalogue entry",
    description:
      "A planetary nebula is a type of emission nebula consisting of an expanding, glowing shell of ionized gas ejected from red giant stars late in their lives. The term \"planetary nebula\" is a misnomer because they are unrelated to planets. The term originates from the planet-like round shape of these nebulae observed by astronomers through early telescopes. The first usage may have occurred during the 1780s with the English astronomer William Herschel who described these nebulae as resembling planets; however, as early as January 1779, the French astronomer Antoine Darquier de Pellepoix described in his observations of the Ring Nebula, \"very dim but perfectly outlined; it is as large as Jupiter and resembles a fading planet\".",
    facts: [
      "All planetary nebulae form at the end of the life of a star of intermediate mass, about 1-8 solar masses.",
      "Starting in the 1990s, Hubble Space Telescope images revealed that many planetary nebulae have extremely complex and varied morphologies.",
      "It was observed by Charles Messier on July 12, 1764, and listed as M27 in his catalogue of nebulous objects.",
      "To early observers with low-resolution telescopes, M27 and subsequently discovered planetary nebulae resembled the giant planets like Uranus.",
    ],
    model_url: "/models/space/planetary-nebula.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 86,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Planetary nebula",
    },
  },
  {
    slug: "galaxy",
    name: "Galaxy",
    subtitle: "Catalogue entry",
    description:
      "A galaxy is a physical system of stars, planetary systems, stellar remnants, substellar objects, interstellar gas, dust, and dark matter bound together by gravity. The word is derived from the Greek galaxias (γαλαξίας), meaning 'milky', a reference to the Milky Way galaxy that contains the Solar System. Most of the mass in a typical galaxy is in the form of dark matter, with only a few percent of that mass visible in the form of stars and nebulae. Supermassive black holes are a common feature at the centers of galaxies.",
    facts: [
      "Galaxies, averaging an estimated 100 million stars, range in size from dwarfs with less than a thousand stars to the largest galaxies known—supergiants with one hundred trillion stars, each orbiting its galaxy's center of mass.",
      "It is estimated that there are between 200 billion (2×1011) and 2 trillion galaxies in the observable universe.",
      "Most galaxies are 1,000 to 100,000 parsecs in diameter (approximately 3,000 to 300,000 light years) and are separated by distances in the order of millions of parsecs (or megaparsecs).",
      "For comparison, the Milky Way has a diameter of at least 26,800 parsecs (87,400 ly).",
    ],
    model_url: "/models/space/galaxy.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 87,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Galaxy",
    },
  },
  {
    slug: "gingerbread-man",
    name: "Gingerbread man",
    subtitle: "Catalogue entry",
    description:
      "A gingerbread man is a biscuit or cookie made from gingerbread, usually in the shape of a stylized human being. However, other shapes, especially seasonal themes (Christmas, Halloween, Easter, etc.), and characters are also common. The first documented instance of figure-shaped gingerbread biscuits was at the court of Elizabeth I of England. She had the gingerbread figures made and presented in the likeness of some of her important guests, who brought the human shape of the gingerbread cookies.",
    facts: [
      "== History == Gingerbread dates from the 15th century and figurative biscuit-making was practised in the 16th century.",
      "Gingerbread was long associated with fairs and festivals, and by the 19th century was connected to Christmas.",
      "== In world records == According to the Guinness Book of Records, the world's largest gingerbread man was made by the staff of the IKEA Furuset store in Oslo, Norway, on 9 November 2009.",
      "The gingerbread man weighed 1435.2 pounds (651 kg).",
    ],
    model_url: "/models/space/gingerbread-man.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 88,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Gingerbread man",
    },
  },
  {
    slug: "black-hole-astroriah",
    name: "Black hole",
    subtitle: "Catalogue entry",
    description:
      "A black hole is an astronomical body so compact that its gravity prevents anything, including light, from escaping. Albert Einstein's theory of general relativity, which describes gravitation as the curvature of spacetime, predicts that any sufficiently compact mass will form a black hole. The boundary of no escape is called the event horizon. In general relativity, crossing a black hole's event horizon traps an object inside but produces no locally detectable change.",
    facts: [
      "Objects whose gravitational fields are too strong for light to escape were first considered in the 18th century.",
      "In 1916, the first solution of general relativity that would characterise a black hole was found.",
      "By the late 1950s, this solution began to be interpreted physically as a region of space from which nothing can escape.",
      "Black holes were long considered a mathematical curiosity; it was not until the 1960s that theoretical work showed they were a generic prediction of general relativity.",
    ],
    model_url: "/models/space/black-hole-astroriah.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 89,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Black hole",
    },
  },
  {
    slug: "space-station",
    name: "Space station",
    subtitle: "Catalogue entry",
    description:
      "A space station (or orbital station) is a spacecraft which remains in orbit and hosts humans for extended periods of time. It is therefore an artificial satellite featuring habitation facilities. The purpose of maintaining a space station varies depending on the program. Most often space stations have been research stations, but they have also served military or commercial uses, such as hosting space tourists.",
    facts: [
      "The first space station was Salyut 1 (1971), which hosted the first crew of the ill-fated Soyuz 11.",
      "Consecutively space stations have been operated since Skylab (1973) and occupied since 1987 with the Salyut successor Mir.",
      "Uninterrupted human presence in orbital space through space stations has been sustained since the operational transition from the Mir to the International Space Station (ISS), with the latter's first occupation in 2000.",
      "There are currently two fully operational space stations – the ISS, occupied since Expedition 1 in October 2000, and China's Tiangong Space Station (TSS), occupied since the Shenzhou 14 mission in June 2022.",
    ],
    model_url: "/models/space/space-station.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 50,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Space station",
    },
  },
  {
    slug: "telescope",
    name: "Telescope",
    subtitle: "Catalogue entry",
    description:
      "A telescope is a device used to observe distant objects by their emission, absorption, or reflection of electromagnetic radiation. Originally, it was an optical instrument using lenses, curved mirrors, or a combination of both to observe distant objects – an optical telescope. Nowadays, the word \"telescope\" is defined as a wide range of instruments capable of detecting different regions of the electromagnetic spectrum, and in some cases other types of detectors. They were used for both terrestrial applications and astronomy.",
    facts: [
      "The first known practical telescopes were refracting telescopes with glass lenses and were invented in the Netherlands at the beginning of the 17th century.",
      "In the 20th century, many new types of telescopes were invented, including radio telescopes in the 1930s and infrared telescopes in the 1960s.",
      "== Etymology == The word telescope was coined in 1611 by the Greek mathematician Giovanni Demisiani for one of Galileo Galilei's instruments presented at a banquet at the Accademia dei Lincei.",
      "== History == The earliest existing record of a telescope was a 1608 patent submitted to the government in the Netherlands by Middelburg spectacle maker Hans Lipperhey for a refracting telescope.",
    ],
    model_url: "/models/space/telescope.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 51,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Telescope",
    },
  },
  {
    slug: "hubble",
    name: "Hubble Space Telescope",
    subtitle: "Catalogue entry",
    description:
      "It was not the first space telescope, but it is one of the largest and most versatile, renowned as a vital research tool and as a public relations boon for astronomy. The Hubble Space Telescope is named after astronomer Edwin Hubble and is one of NASA's Great Observatories. The Space Telescope Science Institute (STScI) selects Hubble's targets and processes the resulting data, while the Goddard Space Flight Center (GSFC) controls the spacecraft. Hubble's orbit outside the distortion of Earth's atmosphere allows it to capture extremely high-resolution images with substantially lower background light than ground-based telescopes.",
    facts: [
      "The Hubble Space Telescope (HST or Hubble) is a space telescope that was launched into low Earth orbit in 1990 and remains in operation.",
      "Hubble features a 2.4 m (7 ft 10 in) mirror, and its five main instruments observe in the ultraviolet, visible, and near-infrared regions of the electromagnetic spectrum.",
      "The Hubble Space Telescope was funded and built in the 1970s by NASA with contributions from the European Space Agency.",
      "Its intended launch was in 1983, but the project was beset by technical delays, budget problems, and the 1986 Challenger disaster.",
    ],
    model_url: "/models/space/hubble.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hubble Space Telescope",
    },
  },
  {
    slug: "rs-2200",
    name: "RS-2200",
    subtitle: "Catalogue entry",
    // The harvester took this entry's prose from the article's "== References ==" section and left the
    // section headings inside its facts. Repaired here from the facts it did get right — the sentences
    // below are the article's own, not a summary of a summary, and the headings are gone.
    description:
      "The Rocketdyne RS-2200 was a linear aerospike rocket engine designed for Lockheed Martin's VentureStar, a single-stage-to-orbit spaceplane meant to fly the way the Space Shuttle could not: to orbit and back in one piece. An aerospike nozzle holds its efficiency from the ground to vacuum instead of being tuned for one of them, which is why the design was chosen. The programme was cancelled in 2001 before a single full-scale RS-2200 was assembled.",
    facts: [
      "The RS-2200 was an experimental linear aerospike engine developed by Rocketdyne for Lockheed Martin's VentureStar programme.",
      "The programme was cancelled in 2001 before any full-scale RS-2200 engines were assembled.",
      "Its subscale testbed, the XRS-2200, was the one that reached a test stand, accumulating roughly 1,600 seconds of hot-fire testing.",
      "An aerospike nozzle adjusts to falling atmospheric pressure as the vehicle climbs, which a bell nozzle cannot do.",
    ],
    model_url: "/models/space/rs-2200.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 53,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — RS-2200",
    },
  },
  {
    slug: "rocket-engine",
    name: "Rocket engine",
    subtitle: "Catalogue entry",
    description:
      "A rocket engine is a reaction engine, producing thrust in accordance with Newton's third law by ejecting reaction mass rearward, usually a high-speed jet of high-temperature gas produced by the combustion of rocket propellant stored inside the rocket. Space vehicles carry their own oxidizer, unlike most combustion engines such as pulse engines or jet engines, so they can be used in a vacuum. Vehicles commonly propelled by rocket engines include missiles, artillery shells, ballistic missiles, and space vehicles. Compared to other types of jet engines, rocket engines typically have the highest thrust, but are the least propellant-efficient (they have the lowest specific impulse) but measures can be taken to increase the rockets efficiency and certain types of rocket engines can be extremely efficient (ex.",
    facts: [
      "400 BC, when a Greek Pythagorean named Archytas propelled a wooden bird along wires using steam.",
      "It is stated that \"the reactive forces of incendiaries were probably not applied to the propulsion of projectiles prior to the 13th century\".",
      "In the sixteenth century, German military engineer Conrad Haas (1509–1576) wrote a manuscript which introduced the construction of multi-staged rockets.",
      "These usually consisted of a tube of soft hammered iron about 8 in (20 cm) long and 1+1⁄2–3 in (3.8–7.6 cm) diameter, closed at one end, packed with black powder propellant and strapped to a shaft of bamboo about 4 ft (120 cm) long.",
    ],
    model_url: "/models/space/rocket-engine.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 54,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Rocket engine",
    },
  },
  {
    slug: "le-9",
    name: "LE-9",
    subtitle: "Catalogue entry",
    description:
      "However, it is physically difficult for an expander bleed cycle engine to generate large thrust, so the development of the LE-9 engine with a thrust of 1,471 kN (331,000 lbf) is the most challenging and important development element. Firing tests of the LE-9 first-stage engine began in April 2017. On 21 January 2022, the launch of the first H3 was rescheduled to FY 2022 or later, citing technical problems regarding the first stage LE-9 engine. The LE-9 was operated successfully for the first time, on March 7, 2023.",
    facts: [
      "The LE-9 is a liquid cryogenic rocket engine burning liquid hydrogen and liquid oxygen in an expander bleed cycle.",
      "Two or three will be used to power the core stage of the H3 launch vehicle.",
      "The newly developed LE-9 engine is the most important factor in achieving cost reduction, improved safety and increased thrust.",
      "The expander bleed cycle used in the LE-9 engine is a highly reliable combustion method that Japan has put into practical use for the LE-5 upper stage engine.",
    ],
    model_url: null,
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — LE-9",
    },
  },
  {
    slug: "merlin-1d",
    name: "SpaceX Merlin",
    subtitle: "Catalogue entry",
    description:
      "Merlin is a family of rocket engines developed by SpaceX. The injector at the heart of Merlin is of the pintle type that was first used in the Apollo Lunar Module landing engine (LMDE). Propellants are fed by a single-shaft, dual-impeller turbopump. The turbopump also provides high-pressure fluid for the hydraulic actuators, which then recycles into the low-pressure inlet.",
    facts: [
      "They are currently a part of the Falcon 9 and Falcon Heavy launch vehicles, and were formerly used on the Falcon 1.",
      "Merlin engines use RP-1 and liquid oxygen as rocket propellants in a gas-generator power cycle.",
      "The Merlin engine was originally designed for sea recovery and reuse, but since 2016 the entire Falcon 9 booster is recovered for reuse by landing vertically on a landing pad using one of its nine Merlin engines.",
      "== Revisions == === Merlin 1A === The initial version, the Merlin 1A, used an inexpensive, expendable, ablatively cooled carbon-fiber-reinforced polymer composite nozzle and produced 340 kN (76,000 lbf) of thrust.",
    ],
    model_url: null,
    accent: ["#fcd34d", "#332405"],
    popularity: 56,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — SpaceX Merlin",
    },
  },
  {
    slug: "apollo-lunar-excursion-module",
    name: "Apollo Lunar Module",
    subtitle: "Catalogue entry",
    description:
      "The Apollo Lunar Module (LM ), originally designated the Lunar Excursion Module (LEM), was the lunar lander spacecraft that was flown between lunar orbit and the Moon's surface during the United States' Apollo program. It was the first crewed spacecraft to operate exclusively in space, and remains the only crewed vehicle to land anywhere beyond Earth. Structurally and aerodynamically incapable of flight through Earth's atmosphere, the two-stage Lunar Module was ferried to lunar orbit attached to the Apollo command and service module (CSM), about twice its mass. Its crew of two flew the Lunar Module from lunar orbit to the Moon's surface.",
    facts: [
      "The total cost of the LM for development and the units produced was $21.65 billion in 2016 dollars, adjusting from a nominal total of $2.29 billion using the NASA New Start Inflation Indices.",
      "Of these, six were landed by humans on the Moon from 1969 to 1972.",
      "The first two flown were tests in low Earth orbit: Apollo 5, without a crew; and Apollo 9 with a crew.",
      "A third test flight in low lunar orbit was Apollo 10, a dress rehearsal for the first landing, conducted on Apollo 11.",
    ],
    model_url: "/models/space/apollo-lunar-excursion-module.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Apollo Lunar Module",
    },
  },
  {
    slug: "mars-rover",
    name: "Mars rover",
    subtitle: "Catalogue entry",
    description:
      "A Mars rover is a remote-controlled motor vehicle designed to travel on the surface of Mars. Rovers have several advantages over stationary landers: they examine more territory, they can be directed to interesting features, they can place themselves in sunny positions to weather winter months, and they can advance the knowledge of how to perform very remote robotic vehicle control. They serve a different purpose than orbital spacecraft like Mars Reconnaissance Orbiter. A more recent development is the Mars helicopter.",
    facts: [
      "As of May 2021, there have been six successful robotically operated Mars rovers; the first five, managed by the American NASA Jet Propulsion Laboratory, were (by date of Mars landing): Sojourner (1997), Spirit (2004–2010), Opportunity (2004–2018), Curiosity (2012–present), and Perseverance (2021–present).",
      "The sixth, managed by the China National Space Administration, is Zhurong (2021–2022).",
      "The Soviet probes, Mars 2 and Mars 3, were physically tethered probes; Sojourner was dependent on the Mars Pathfinder base station for communication with Earth; Opportunity, Spirit and Curiosity were on their own.",
      "As of August 11, 2026, Curiosity is still active, while Spirit, Opportunity, and Sojourner completed their missions before losing contact.",
    ],
    model_url: "/models/space/mars-rover.glb",
    accent: ["#8ab4ff", "#131a3a"],
    popularity: 58,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Mars rover",
    },
  },
  {
    slug: "parker-solar-probe-suns-kisser",
    name: "Parker Solar Probe",
    subtitle: "Catalogue entry",
    description:
      "It is the fastest object ever built on Earth. Johns Hopkins University Applied Physics Laboratory designed and built the spacecraft, which was launched on August 12, 2018. It became the first NASA spacecraft named after a living person, honoring the physicist Eugene Newman Parker, professor emeritus at the University of Chicago. On October 29, 2018, at about 18:04 UTC, the spacecraft became the closest ever artificial object to the Sun.",
    facts: [
      "The Parker Solar Probe (PSP; previously Solar Probe, Solar Probe Plus or Solar Probe+) is a NASA space probe launched in 2018 to make observations of the Sun's outer corona.",
      "It used repeated gravity assists from Venus to develop an eccentric orbit, approaching within 9.86 solar radii (6.9 million km or 4.3 million miles) from the center of the Sun.",
      "At its closest approach in 2024, its speed relative to the Sun was 690,000 km/h (430,000 mph) or 191 km/s (118.7 mi/s), which is 0.064% the speed of light.",
      "The project was announced in the 2009 budget year.",
    ],
    model_url: "/models/space/parker-solar-probe-suns-kisser.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Parker Solar Probe",
    },
  },
  {
    slug: "space-suit",
    name: "Space suit",
    subtitle: "Catalogue entry",
    description:
      "A space suit (or spacesuit) is an environmental suit used for protection from the harsh environment of outer space. It mainly protects from outer space’s vacuum, as space suits are a highly specialized pressure suit, but it also protects against temperature extremes, as well as radiation and micrometeoroids. Basic space suits are worn as a safety precaution inside spacecrafts in case of loss of cabin pressure. For extravehicular activity (EVA), more complex space suits are worn, featuring a portable life support system.",
    facts: [
      "Pressure suits are, in general, needed at low pressure environments above the Armstrong limit, at around 19,000 m (62,000 ft) above Earth.",
      "IEVA suits are meant for use inside and outside the spacecraft, such as the Gemini G4C suit.",
      "The first full-pressure suits for use at extreme altitudes were designed by individual inventors as early as the 1930s.",
      "The first space suit worn by a human in space was the Soviet SK-1 suit worn by Yuri Gagarin in 1961.",
    ],
    model_url: "/models/space/space-suit.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Space suit",
    },
  },
  {
    slug: "pirate-ship",
    name: "Piracy",
    subtitle: "Catalogue entry",
    description:
      "Piracy is an act of robbery or criminal violence by ship or boat-borne attackers upon another ship or a coastal area, typically intending to steal cargo and valuable goods, or take hostages. Those who conduct acts of piracy are called pirates, and vessels used for piracy are called pirate ships. Narrow channels which funnel shipping into predictable routes have long created opportunities for piracy, as well as for privateering and commerce raiding. Historic examples of such areas include the waters of Gibraltar, the Strait of Malacca, Madagascar, the Gulf of Aden, and the English Channel, whose geographic structures facilitated pirate attacks.",
    facts: [
      "The earliest documented instances of piracy date to the 14th century BC, when the Sea Peoples, a group of ocean raiders, attacked the ships of the Aegean and Mediterranean civilizations.",
      "In the 21st century, seaborne piracy against transport vessels remains a significant issue, with estimated worldwide losses of US$25 billion in 2023, increased from US$16 billion in 2004.",
      "The two-volume A General History of the Pyrates, published in London in 1724, is generally credited with bringing key piratical figures and a semi-accurate description of their milieu in the \"Golden Age of Piracy\" to the public's imagination.",
      "A General History inspired and informed many later fictional depictions of piracy, most notably the novels Treasure Island (1883) and Peter Pan (1911), both of which have been adapted and readapted for stage, film, television, and other media across over a century.",
    ],
    model_url: null,
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Piracy",
    },
  },
  {
    slug: "space-shuttle-discovery",
    name: "Space Shuttle Discovery",
    subtitle: "Catalogue entry",
    description:
      "The spaceplane was one of the orbiters from NASA's Space Shuttle program and the third of five fully operational orbiters to be built. The Space Shuttle launch vehicle had three main components: the Space Shuttle orbiter, a single-use central fuel tank, and two reusable solid rocket boosters. Discovery became the third operational orbiter to enter service, preceded by Columbia and Challenger. After the Challenger and Columbia accidents, Discovery became the oldest surviving orbiter.",
    facts: [
      "Space Shuttle Discovery (Orbiter Vehicle Designation: OV-103) is a retired American Space Shuttle orbiter.",
      "Its first mission, STS-41-D, flew from August 30 to September 5, 1984.",
      "Over 27 years of service it launched and landed 39 times, aggregating more spaceflights than any other spacecraft as of December 2024.",
      "Nearly 25,000 heat-resistant tiles cover the orbiter to protect it from high temperatures on re-entry.",
    ],
    model_url: "/models/space/space-shuttle-discovery.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 62,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Space Shuttle Discovery",
    },
  },
  {
    slug: "space-shuttle-challenger",
    name: "Space Shuttle Challenger",
    subtitle: "Catalogue entry",
    description:
      "Initially manufactured as a test article not intended for spaceflight, it was used for ground testing of the Space Shuttle orbiter's structural design. However, after NASA found that their original plan to upgrade Enterprise for spaceflight would be more expensive than upgrading Challenger, the orbiter was pressed into operational service in the Space Shuttle program. Lessons learned from the first orbital flights of Columbia led to Challenger's design possessing fewer thermal protection system tiles and a lighter fuselage and wings. During its three years of operation, Challenger was flown on ten missions in the Space Shuttle program, spending over 62 days in space and completing almost 1,000 orbits around Earth.",
    facts: [
      "Space Shuttle Challenger (OV-099) was a Space Shuttle orbiter manufactured by Rockwell International and operated by NASA.",
      "Named after the commanding ship of a nineteenth-century scientific expedition that traveled the world, Challenger was the second Space Shuttle orbiter to fly into space after Columbia, and launched on its maiden flight in April 1983.",
      "It was destroyed in January 1986 soon after launch in a disaster that killed all seven crew members aboard.",
      "This led to it being 2,200 pounds (1,000 kilograms) lighter than Columbia, though still 5,700 pounds (2,600 kilograms) heavier than Discovery.",
    ],
    model_url: "/models/space/space-shuttle-challenger.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Space Shuttle Challenger",
    },
  },
];
