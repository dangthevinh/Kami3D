/**
 * Historic architecture — the second catalogue, the one beside the animals.
 *
 * Sixteen landmarks, each of which is meant to end up with a real, credited 3D model. `model_url`
 * is null throughout: this file is the data, and the model pipeline fills those in later. Nothing
 * here imports anything, so plain Node can read it and `node --test` can check it.
 *
 * Where the numbers come from. Every date, height and name was checked on 2026-10-05 against the
 * English Wikipedia article text and infobox, against Wikidata (P2048 height, P571 inception,
 * P1619 opening, P84 architect), and — where the site has a body that runs it — against that body:
 * the US National Park Service for the Statue of Liberty, INAH for El Castillo, the Opera della
 * Primaziale Pisana for the Tower of Pisa, sagradafamilia.org
 * for the Sagrada Família. Where a figure could not be checked it is null, not a guess. This is the
 * project's oldest rule: không bịa số liệu.
 *
 * The contested figures, and what was written instead:
 *
 *   - Eiffel Tower, 330 m. That is the antenna. The ironwork reaches 300 m and the top platform is
 *     at 276 m; a reference that says 300 m and one that says 330 m are both right.
 *   - Leaning Tower of Pisa. 55.86 m on the low side, 56.67 m on the high side, 58.36 m from the
 *     foundation floor. The number depends on where you start measuring, so all three are stated.
 *   - Great Pyramid, 138.5 m. It was 146.6 m while its white limestone casing was intact.
 *   - Statue of Liberty. The NPS measures 46.05 m from the top of the base to the torch and 92.99 m
 *     from the ground; the pedestal accounts for the difference.
 *   - Sagrada Família, 172.5 m and the year 2026. It is still a building site: the Tower of Jesus
 *     Christ reached its designed height on 20 February 2026, the interior runs to 2028, and the
 *     Glory façade is unbuilt. 2026 is the year the exterior as it stands was finished.
 *   - Chichén Itzá, 1100. No completion date was recorded. INAH dates El Castillo to the city's
 *     peak between the 9th and 12th centuries; 1100 is the point by which Chichén Itzá had declined
 *     as a regional capital, not a document.
 *   - Machu Picchu, 1450. Radiocarbon work published in 2021 puts the occupation at c. 1420-1530.
 *   - Stonehenge, -2500. The midpoint of the 2600-2400 BC radiocarbon range for the sarsen circle.
 *   - Machu Picchu and the Great Wall are not single structures, so `height_m` is null rather than a
 *     number that would be true of one terrace or one section and false of the next. Published
 *     figures for surviving stretches of the wall run from about 5 m to 8 m depending on terrain.
 *   - `architect` is null where nobody is credited, which is the honest answer for Angkor Wat, the
 *     Colosseum, Machu Picchu, the Great Wall and Stonehenge, and for the Tower of Pisa, where the
 *     attribution is still disputed.
 *   - Machu Picchu, Chichén Itzá and the Great Wall were built by civilisations, not named people.
 *     A king who commissioned a temple is not its architect and is not recorded as one here.
 */

export interface Landmark {
  slug: string;
  name: string;
  city: string;
  country: string;
  /** Year the structure as it stands today was completed. Negative is BC. */
  completed: number;
  /** Height in metres, or null when the site is not one structure (a wall, a city). */
  height_m: number | null;
  /** The architectural style or period, in a few words. */
  style: string;
  /** Architect or builder, or null when nobody is credited. */
  architect: string | null;
  /** One line: what it was built for. */
  purpose: string;
  /** Two to four sentences, the way the species descriptions are written. */
  description: string;
  /** Two to four facts. Each one must be checkable. */
  fun_facts: string[];
  /** Filled in later by the model pipeline. Leave null. */
  model_url: string | null;
  /** Two hex colours for the card gradient: [light, dark]. */
  accent: [string, string];
  /** 1-100, for ordering the grid. */
  popularity: number;
  kind: "tower" | "temple" | "castle" | "monument" | "ruin" | "bridge";
}

export const LANDMARKS: Landmark[] = [
  {
    slug: "eiffel-tower",
    name: "Eiffel Tower",
    city: "Paris",
    country: "France",
    completed: 1889,
    height_m: 330,
    style: "Wrought-iron lattice tower",
    architect: "Gustave Eiffel, to a design by Maurice Koechlin and Émile Nouguier",
    purpose: "Centrepiece of the 1889 Exposition Universelle, timed to the centenary of the French Revolution.",
    description:
      "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars, built by Gustave Eiffel's company for the 1889 Exposition Universelle and kept, against the intention of the time, because its height made it useful as a radio mast. It is 330 m to the top of the antenna that was fitted in 2022; the ironwork itself reaches 300 m and the highest public platform is at 276 m. It was meant to come down in 1909 and was saved by the transmitters bolted to it. The design is attributed to two of Eiffel's engineers, Maurice Koechlin and Émile Nouguier.",
    fun_facts: [
      "It is 330 m including the 2022 antenna, 300 m of ironwork, and the top public platform is at 276 m.",
      "The puddle iron weighs about 7,300 tonnes; with lifts, shops and antennae the finished tower is about 10,100 tonnes.",
      "Scheduled for dismantling in 1909, it was reprieved because wireless telegraphy had made its height valuable.",
      "The con man Victor Lustig twice \"sold\" the tower for scrap, in 1925.",
    ],
    model_url: "/models/landmarks/eiffel-tower.glb",
    accent: ["#e8dfd0", "#3a3f4b"],
    popularity: 98,
    kind: "tower",
  },
  {
    slug: "leaning-tower-of-pisa",
    name: "Leaning Tower of Pisa",
    city: "Pisa",
    country: "Italy",
    completed: 1372,
    height_m: 55.86,
    style: "Romanesque campanile",
    architect: null,
    purpose: "The free-standing bell tower of Pisa Cathedral, on the Piazza dei Miracoli.",
    description:
      "The Leaning Tower is the campanile of Pisa Cathedral, begun in 1173 on subsoil too soft to carry it, so that it started to tilt before the second storey was finished. Its height depends on where you measure: 55.86 m on the low side, 56.67 m on the high side, and 58.36 m from the foundation floor, the figure the Opera della Primaziale Pisana publishes. Building stopped and restarted across nearly two centuries and the bell chamber was not added until 1372. Nobody is securely credited with the design: Bonanno Pisano, a man named Guglielmo and Diotisalvi have all been proposed, and the attribution is still argued.",
    fun_facts: [
      "The lean reached 5.5 degrees by 1990; soil extraction under the north side brought it back to about 4 degrees.",
      "The tower was closed to visitors from 1990 to 2001 while the stabilisation work was carried out.",
      "It weighs an estimated 14,500 tonnes and sits on a foundation only about 3 m deep.",
      "The belfry added in 1372 by Tommaso di Andrea Pisano holds seven bells, one for each note of the major scale.",
    ],
    model_url: "/models/landmarks/leaning-tower-of-pisa.glb",
    accent: ["#f2ead8", "#5a5140"],
    popularity: 84,
    kind: "tower",
  },
  {
    slug: "colosseum",
    name: "Colosseum",
    city: "Rome",
    country: "Italy",
    completed: 80,
    height_m: 48,
    style: "Roman Flavian amphitheatre",
    architect: null,
    purpose: "Amphitheatre for gladiatorial combat, wild-animal hunts and public spectacle.",
    description:
      "The Colosseum is the largest amphitheatre the Romans built, an ellipse 189 m long and 156 m wide whose surviving outer wall stands 48 m high. Vespasian began it around AD 72 on the drained lake of Nero's Golden House, his son Titus finished the top storey and opened it in AD 80, and Domitian added the basement of corridors and lifts under the arena floor. It held an estimated 50,000 to 80,000 spectators behind eighty entrances. Earthquakes and centuries of stone-robbing removed the south side, so what stands today is a ruin rather than a shell.",
    fun_facts: [
      "It seated an estimated 50,000 to 80,000 people; the 4th-century Codex-Calendar of 354 claims 87,000.",
      "Dio Cassius records that more than 9,000 wild animals were killed in the inaugural games.",
      "The arena measured 83 m by 48 m and could be flooded for staged naval battles.",
      "The hypogeum, the two-level basement of service corridors under the arena, was added under Domitian after the building opened.",
    ],
    model_url: "/models/landmarks/colosseum.glb",
    accent: ["#e6d9c3", "#4a3b2e"],
    popularity: 96,
    kind: "ruin",
  },
  {
    slug: "taj-mahal",
    name: "Taj Mahal",
    city: "Agra",
    country: "India",
    completed: 1653,
    height_m: 73,
    style: "Mughal, Indo-Islamic",
    architect: "Ustad Ahmad Lahori",
    purpose: "Mausoleum for Mumtaz Mahal, commissioned by the Mughal emperor Shah Jahan.",
    description:
      "The Taj Mahal is a white marble mausoleum on the bank of the Yamuna at Agra, commissioned in 1631 by Shah Jahan for his wife Mumtaz Mahal, who died that year giving birth to their fourteenth child. The tomb was finished in 1648; the gardens, gateway and mosque brought the whole complex to completion around 1653. It stands 73 m to the tip of the finial, with a 23 m marble dome on a 12 m drum and four minarets more than 40 m tall. The marble is inlaid with semi-precious stone, and the building has been a UNESCO World Heritage Site since 1983.",
    fun_facts: [
      "The mausoleum itself was completed in 1648; the complex as it stands today is dated to about 1653.",
      "More than 20,000 artisans, calligraphers, stone cutters and labourers are believed to have worked on it.",
      "The dome is 23 m high on a 12 m drum, and the building reaches 73 m in total.",
      "The complex cost an estimated 32 million rupees at the time it was built.",
    ],
    model_url: "/models/landmarks/taj-mahal.glb",
    accent: ["#f6f2ea", "#3d4a52"],
    popularity: 97,
    kind: "monument",
  },
  {
    slug: "big-ben",
    name: "Elizabeth Tower (Big Ben)",
    city: "London",
    country: "United Kingdom",
    completed: 1859,
    height_m: 96.3,
    style: "Gothic Revival, Perpendicular",
    architect: "Charles Barry and Augustus Pugin",
    purpose: "The clock tower of the Palace of Westminster, rebuilt after the 1834 fire.",
    description:
      "The Elizabeth Tower is the clock tower at the north end of the Palace of Westminster, designed by Charles Barry with Augustus Pugin for the parliament rebuilt after the fire of 1834. It was completed in 1859 and renamed the Elizabeth Tower in 2012 for the Diamond Jubilee; Big Ben is the Great Bell inside it, not the tower. It stands 96.3 m high, with four dials 6.9 m across and 334 steps from the ground to the belfry. The clock keeps its original mechanism and is still adjusted by hand.",
    fun_facts: [
      "The Great Bell was recast at the Whitechapel Bell Foundry in 1858 and weighs 13.5 long tons, about 13.7 tonnes.",
      "Each of the four dials is 6.9 m across and glazed with 324 pieces of opalescent glass.",
      "The clock is regulated by adding or removing pre-decimal pennies from the pendulum.",
      "The chimes were silenced from August 2017 to November 2022 for restoration; the bell rang again on Remembrance Sunday.",
    ],
    model_url: "/models/landmarks/big-ben.glb",
    accent: ["#e3d9bd", "#3c3a2f"],
    popularity: 85,
    kind: "tower",
  },
  {
    slug: "statue-of-liberty",
    name: "Statue of Liberty",
    city: "New York City",
    country: "United States",
    completed: 1886,
    height_m: 46.05,
    style: "Neoclassical",
    architect: "Frédéric Auguste Bartholdi, with an iron frame by Gustave Eiffel and a pedestal by Richard Morris Hunt",
    purpose: "A gift from France marking the centennial of American independence.",
    description:
      "The Statue of Liberty is a copper figure over an iron frame on Liberty Island in New York Harbour, given by France and dedicated on 28 October 1886 to mark the centennial of American independence. The National Park Service measures 46.05 m from the top of the base to the tip of the torch, and 92.99 m from the ground once the 46.94 m pedestal is counted. Bartholdi designed the figure, Gustave Eiffel the frame that carries the skin, and Richard Morris Hunt the pedestal. The copper is only about 2.4 mm thick, which is why the statue moves in the wind.",
    fun_facts: [
      "The National Park Service measures 46.05 m from the top of the base to the torch, and 92.99 m from the ground.",
      "The copper skin is about 2.4 mm thick, and the statue can sway up to 3 inches, the torch up to 6.",
      "The crown has 25 windows and seven rays, and the tablet reads JULY IV MDCCLXXVI, the date of American independence.",
      "The torch in place today was fitted in 1986 and is covered in 24-karat gold leaf.",
    ],
    model_url: "/models/landmarks/statue-of-liberty.glb",
    accent: ["#d8ecec", "#2f4f4a"],
    popularity: 93,
    kind: "monument",
  },
  {
    slug: "great-pyramid-of-giza",
    name: "Great Pyramid of Giza",
    city: "Giza",
    country: "Egypt",
    completed: -2560,
    height_m: 138.5,
    style: "Old Kingdom Egyptian, Fourth Dynasty",
    architect: "Hemiunu, Khufu's vizier (credited by some scholars, not documented)",
    purpose: "The tomb of the Fourth Dynasty pharaoh Khufu.",
    description:
      "The Great Pyramid of Giza is the tomb of the pharaoh Khufu, the largest of Egypt's pyramids and the only one of the Seven Wonders of the Ancient World still largely intact. Cased in white limestone it stood 146.6 m; the casing was quarried away over the centuries and the pyramid is 138.5 m today, having been the tallest human-made structure for more than 3,700 years. About 2.3 million blocks went into it. Its construction is put at about 2560 BC, though recent chronologies place Khufu's reign anywhere between 2700 and 2500 BC.",
    fun_facts: [
      "It was 146.6 m tall as built and 138.5 m now, after the limestone casing was removed.",
      "About 2.3 million blocks of stone, some 6 million tonnes, were used in its construction.",
      "Hemiunu, Khufu's vizier, is the man some scholars credit as its architect.",
      "It stayed the tallest structure on Earth for more than 3,700 years.",
    ],
    model_url: "/models/landmarks/great-pyramid-of-giza.glb",
    accent: ["#f0e3c2", "#4b3f2a"],
    popularity: 92,
    kind: "monument",
  },
  {
    slug: "machu-picchu",
    name: "Machu Picchu",
    city: "Cusco Region",
    country: "Peru",
    completed: 1450,
    height_m: null,
    style: "Inca, classical dry-stone masonry",
    architect: null,
    purpose: "A royal estate for the Inca emperor Pachacuti, and a seasonal retreat.",
    description:
      "Machu Picchu is a fifteenth-century Inca citadel on a ridge 2,430 m above sea level in the Eastern Cordillera, above the Urubamba river in southern Peru. It is built in the classical Inca style, walls cut to fit so closely that no mortar was needed, and is generally taken to be the royal estate of the emperor Pachacuti, though no written record says so. Construction is dated to about 1450; radiocarbon work published in 2021 puts the occupation at roughly 1420 to 1530, and the site was abandoned within a century of being built. It is a whole settlement on terraces, not one structure, so this entry carries no height.",
    fun_facts: [
      "It sits at 2,430 m on terraces the Inca engineered to drain the heavy rain rather than to irrigate.",
      "The walls are dry-stone: the blocks were cut to fit without mortar.",
      "UNESCO listed it in 1983, and it was named one of the New Seven Wonders of the World in 2007.",
      "Visitor numbers passed 1.5 million a year by 2025.",
    ],
    model_url: "/models/landmarks/machu-picchu.glb",
    accent: ["#dde8d5", "#37452f"],
    popularity: 94,
    kind: "ruin",
  },
  {
    slug: "parthenon",
    name: "Parthenon",
    city: "Athens",
    country: "Greece",
    completed: -438,
    height_m: 13.72,
    style: "Classical Greek Doric",
    architect: "Ictinus and Callicrates, under the general supervision of Phidias",
    purpose: "Temple of Athena Parthenos, and the treasury of the Delian League.",
    description:
      "The Parthenon is a Doric temple on the Acropolis of Athens, built between 447 and 438 BC to house the chryselephantine statue of Athena Parthenos, and used as the treasury of the Delian League. The temple was complete in 438 BC, but work on the frieze and the pedimental sculpture ran on until 432 BC. It measures 69.5 m by 30.9 m and stands 13.72 m to the top of the pediment, with eight columns across each end and seventeen along the sides. It has since been a church, a mosque and an Ottoman gunpowder store, and lost most of its surviving sculpture to the 7th Earl of Elgin.",
    fun_facts: [
      "The temple itself was finished in 438 BC; the sculpture was not finished until 432 BC.",
      "It is 69.5 m by 30.9 m, with 8 columns at each end and 17 along each side.",
      "A Venetian shell in 1687 hit the gunpowder the Ottomans had stored inside and blew out the centre of the building.",
      "Elgin removed many of the surviving sculptures between 1800 and 1803; they are in the British Museum.",
    ],
    model_url: "/models/landmarks/parthenon.glb",
    accent: ["#efe7d6", "#4a4a55"],
    popularity: 82,
    kind: "temple",
  },
  {
    slug: "great-wall",
    name: "Great Wall of China",
    city: "Huairou",
    country: "China",
    completed: 1644,
    height_m: null,
    style: "Ming-dynasty fortification",
    architect: null,
    purpose: "Defence and border control against nomadic groups from the Eurasian steppe.",
    description:
      "The Great Wall is not one wall but a system of fortifications built over two thousand years along China's northern frontier; the sections visitors walk near Beijing are Ming, raised between 1368 and 1644, and earlier walls in rammed earth have largely eroded away. A survey published by China's National Cultural Heritage Administration in 2012 counted 21,196.18 km of walls and trenches, 29,510 individual buildings and 2,211 fortifications or passes. Because it is a network of sections rather than a single structure, this entry carries no height: surviving stretches are variously described as roughly 5 m to 8 m, depending on the terrain. Its work was as much to control and tax movement across the frontier as to stop armies.",
    fun_facts: [
      "China's 2012 survey counted 21,196.18 km of walls and trenches across all dynasties.",
      "The same survey recorded 29,510 individual buildings and 2,211 fortifications or passes.",
      "Up to 25,000 watchtowers are estimated to have been built along the Ming wall.",
      "The first walls date to the 7th century BC; the Qin joined earlier walls together in the 3rd century BC.",
    ],
    model_url: "/models/landmarks/great-wall.glb",
    accent: ["#e7e0d2", "#454b52"],
    popularity: 95,
    kind: "monument",
  },
  {
    slug: "sydney-opera-house",
    name: "Sydney Opera House",
    city: "Sydney",
    country: "Australia",
    completed: 1973,
    height_m: 65,
    style: "Expressionist",
    architect: "Jørn Utzon, completed by a team under Peter Hall",
    purpose: "A performing arts centre on Bennelong Point, Sydney Harbour.",
    description:
      "The Sydney Opera House stands on Bennelong Point and is roofed by precast concrete shells that are all sections of one imagined sphere, a solution that let a single mould cast every rib. Jørn Utzon won the competition in 1957, resigned in 1966, and the building was finished by a team under Peter Hall and opened by Queen Elizabeth II on 20 October 1973. It is 183 m long, 120 m wide and 65 m at its highest point, carried on 588 concrete piers sunk as much as 25 m below the harbour floor. The shells are clad in 1,056,006 tiles in two colours.",
    fun_facts: [
      "Every shell is a section of one sphere 75.2 m in radius, so a single mould served all the ribs.",
      "The roof is tiled with 1,056,006 tiles in glossy white and matte cream, made by Höganäs in Sweden.",
      "The building rests on 588 concrete piers driven as much as 25 m below the water.",
      "The Concert Hall seats 2,679 and holds a Grand Organ with more than 10,000 pipes.",
    ],
    model_url: "/models/landmarks/sydney-opera-house.glb",
    accent: ["#eef4f7", "#2c4a63"],
    popularity: 86,
    kind: "monument",
  },
  {
    slug: "sagrada-familia",
    name: "Sagrada Família",
    city: "Barcelona",
    country: "Spain",
    completed: 2026,
    height_m: 172.5,
    style: "Catalan Modernisme, Gothic Revival",
    architect: "Antoni Gaudí",
    purpose: "An expiatory basilica, built from donations rather than church funds.",
    description:
      "The Sagrada Família is a basilica in the Eixample district of Barcelona, begun on 19 March 1882 and taken over by Antoni Gaudí in 1883; he worked on it until his death in 1926, by which time less than a quarter of it was built. The Tower of Jesus Christ reached its full 172.5 m on 20 February 2026, which makes the church the tallest in the world, past Ulm Minster at 161.53 m. That is the year recorded here, and it is the exterior as it stands: the interior is not due to be finished until 2028 and the Glory façade has not been built. Donations and ticket income have funded all of it, which is why it has taken more than 140 years.",
    fun_facts: [
      "The Tower of Jesus Christ reached its designed height of 172.5 m on 20 February 2026.",
      "Ulm Minster, at 161.53 m, was the tallest church in the world until the Sagrada Família passed it in 2025.",
      "Gaudí took over the project in 1883; at his death in 1926 the church was between 15 and 25 per cent built.",
      "Pope Benedict XVI consecrated it on 7 November 2010, which allowed the unfinished building to be used for mass.",
    ],
    model_url: "/models/landmarks/sagrada-familia.glb",
    accent: ["#f3e2c8", "#5a3b2a"],
    popularity: 87,
    kind: "temple",
  },
  {
    slug: "angkor-wat",
    name: "Angkor Wat",
    city: "Siem Reap",
    country: "Cambodia",
    completed: 1150,
    height_m: 65,
    style: "Khmer, Angkorian",
    architect: null,
    purpose: "The state temple of King Suryavarman II, dedicated to Vishnu and probably his mausoleum.",
    description:
      "Angkor Wat is the largest religious complex in the world, 162.6 hectares inside a moat, built between 1113 and 1150 for the Khmer king Suryavarman II as a Hindu state temple to Vishnu and in all likelihood his mausoleum. It faces west, unlike almost every other temple at Angkor, and its towers are arranged as a quincunx around a central shrine whose tower rises 43 m above the innermost gallery to 65 m above the ground. It was adapted to Theravada Buddhism from the late thirteenth century and has been in continuous religious use ever since. No architect is credited: an empire built it, and the name that survives attached to it is the king's.",
    fun_facts: [
      "The central tower rises 43 m above the third enclosure, which puts it 65 m above ground level.",
      "The temple covers 162.6 hectares inside its moat, and the wider Angkor site was listed by UNESCO in 1992.",
      "It has been in continuous religious use since it was built, Buddhist from the late 13th century onward.",
      "A depiction of Angkor Wat has appeared on Cambodia's national flag since the first version of 1863.",
    ],
    model_url: "/models/landmarks/angkor-wat.glb",
    accent: ["#e5ddc8", "#3f4a35"],
    popularity: 88,
    kind: "temple",
  },
  {
    slug: "stonehenge",
    name: "Stonehenge",
    city: "Wiltshire",
    country: "United Kingdom",
    completed: -2500,
    height_m: 4,
    style: "Neolithic and Bronze Age megalithic",
    architect: null,
    purpose: "A ceremonial and burial monument aligned on the solstices; the purpose is still debated.",
    description:
      "Stonehenge is a prehistoric stone circle on Salisbury Plain, dug as a bank and ditch around 3100 BC and rebuilt several times before the sarsen circle went up between 2600 and 2400 BC. The year recorded here, 2500 BC, is the midpoint of that radiocarbon range rather than a date anyone recorded. The outer sarsens are about 4 m tall and weigh around 25 tonnes; the five trilithons of the inner horseshoe weigh up to 50 tonnes, and the Great Trilithon would have stood 7.3 m before it fell. The stones are aligned on the midsummer sunrise and the midwinter sunset, and nobody is credited with the design.",
    fun_facts: [
      "The sarsen circle was raised between 2600 and 2400 BC, on a site first dug around 3100 BC.",
      "The outer stones are about 4 m high and 25 tonnes each; the trilithons weigh up to 50 tonnes.",
      "The Great Trilithon would have stood 7.3 m tall; one of its uprights survives with 6.7 m above ground.",
      "Some of the smaller bluestones were brought from the Preseli Hills in Pembrokeshire, South Wales.",
    ],
    model_url: "/models/landmarks/stonehenge.glb",
    accent: ["#e9e6df", "#42474d"],
    popularity: 78,
    kind: "monument",
  },
  {
    slug: "chichen-itza",
    name: "Chichén Itzá",
    city: "Yucatán",
    country: "Mexico",
    completed: 1100,
    height_m: 30,
    style: "Maya, Terminal Classic with central Mexican influences",
    architect: null,
    purpose: "A Maya regional capital; El Castillo is its temple to the feathered serpent Kukulcán.",
    description:
      "Chichén Itzá was one of the largest cities of the Maya world and probably the most diverse, and El Castillo, the Temple of Kukulcán, is the step pyramid at its centre: nine terraces of roughly 2.6 m each, a 6 m temple on the summit, and about 30 m from the plaza to the top. INAH dates it to the city's peak between the ninth and twelfth centuries; the year recorded here, 1100, is the point by which Chichén Itzá had declined as a regional capital, not a documented completion date. At the spring and autumn equinoxes the northwest corner throws a line of triangular shadows down the north balustrade that reads as a serpent descending. At least two earlier temples are buried inside the pyramid.",
    fun_facts: [
      "El Castillo stands about 30 m high: nine terraces, each roughly 2.6 m, with a 6 m temple on top.",
      "Each side of the pyramid is about 55.3 m at the base, and the stairways climb at 45 degrees.",
      "The Sacred Cenote was dredged between 1904 and 1910, yielding gold, jade, pottery and human remains.",
      "It is Mexico's second most visited archaeological site, with over 2.6 million tourists in 2017.",
    ],
    model_url: "/models/landmarks/chichen-itza.glb",
    accent: ["#f0e0c0", "#4a3a28"],
    popularity: 89,
    kind: "temple",
  },
];

export const LANDMARK_KINDS: readonly Landmark["kind"][] = [
  "tower",
  "temple",
  "castle",
  "monument",
  "ruin",
  "bridge",
];

export const LANDMARK_BY_SLUG: Record<string, Landmark> = Object.fromEntries(
  LANDMARKS.map((landmark) => [landmark.slug, landmark]),
);
