import type { Landmark } from "../landmarks.ts";

/**
 * Historic architecture, batch world-1 — sixteen more monuments, written to be merged into
 * `data/landmarks.ts` beside the first fifteen.
 *
 * It held seventeen until the Forbidden City was **removed**: the only licence-clean candidate that
 * names it is a 10,388-triangle, single-texture massing model of a 72-hectare complex of 980 buildings -
 * about eleven triangles each, with the roofs painted on a slab 8.4 times wider than it is tall. It
 * rendered as a picture of a palace rather than a model of one, which is the one thing this catalogue
 * does not ship. Its data is in git; the entry went, the way Neuschwanstein's did.
 *
 * Where the numbers come from. Every date, height, name and figure below was checked on
 * 2026-10-05 against the English Wikipedia article text and infobox — the same source the first
 * fifteen were written from — and cross-checked against the same subject in the language of the
 * country wherever that article carries something the English one rounds or leaves out: French
 * Wikipedia for Mont-Saint-Michel (the 1446-1523 choir, the abbey floor at 78.60 m, the 32 m spire
 * and the 157.10 m that the English article replaces with an unsourced 170 m), Indonesian for
 * Borobudur (35 m to the summit, about 42 m with the lost chhatra), and nippon.com for the height of
 * Himeji's keep, which gives the timber measurement the city gives. Where a figure could not be
 * checked it is null, not a guess. This is the project's oldest rule: không bịa số liệu.
 *
 * The contested figures, and what was written instead:
 *
 *   - Arc de Triomphe, 49.54 m. The measured height. References that say 50 m are rounding it.
 *   - Milan Cathedral, 108.5 m. That is the Madonnina's spire as the article's own text gives it;
 *     the same article's infobox rounds it to 108 m.
 *   - Cologne Cathedral, 157.38 m. The exact figure, which the same article elsewhere rounds to
 *     157 m. It was the tallest building in the world for four years.
 *   - Hagia Sophia, 55 m. The infobox figure; the body gives 55.6 m at the dome's maximum, because
 *     repairs have left the dome slightly elliptical. Both are stated.
 *   - Tower Bridge, 65 m. The engineers' figure is 213 ft, which is 64.92 m; 65 m is that rounded,
 *     and is what the bridge's own published material gives.
 *   - Mont-Saint-Michel, 1523. The abbey church's Flamboyant-Gothic choir was completed that year.
 *     The spire that now tops it is far later — added in 1896, its archangel finished in 1898 — so
 *     both dates are given. The abbey floor is 78.60 m above the sea; French measurements put the
 *     tip of the archangel's sword at 157.10 m, and the unsourced 170 m sometimes quoted for the
 *     same point is higher than that.
 *   - Borobudur, 825. The year one scholar gives for its completion under King Samaratungga. Other
 *     work dates the building from about 780 to about 830, and nothing written at the time records
 *     a completion. 825 is a published figure, not a document.
 *   - The Alhambra, 1391. The year Muhammad V died, after which comparatively little major building
 *     was done; nothing recorded a completion date for a palace added to across three centuries.
 *   - Edinburgh Castle, 1588. The year the Half Moon Battery was finished. Almost nothing standing
 *     pre-dates the Lang Siege of 1573, so this is the date of the castle's present front, not of
 *     the whole site.
 *   - Prague Castle, 1929. The year St Vitus Cathedral was at last finished, after 600 years. The
 *     castle itself began in 870 and has been rebuilt ever since.
 *   - `height_m` is null for the seven sites that are not one structure, rather than a number true
 *     of one keep, one tower or one hall and false of the rest: the abbey on its rock, the two
 *     castles, the Alhambra, the Forbidden City, the Temple of Heaven, and the Prambanan and Himeji
 *     compounds. The measurements that do exist — Himeji's keep at 31.5 m on its base and 46.4 m
 *     from the foot of the stone wall, Prambanan's Shiva temple at 47 m, the Hall of Prayer at
 *     38 m — are in the prose instead, where they can be attributed to the part they describe.
 *   - `architect` is null for the Alhambra, Edinburgh Castle, the Temple of Heaven, Prambanan and
 *     Himeji, where nobody is credited. The men named at Himeji — Akamatsu Norimura, Toyotomi
 *     Hideyoshi, Ikeda Terumasa, Honda Tadamasa — commissioned and ruled, they did not design, and
 *     the first catalogue does not record a king who paid for a temple as its architect either.
 *   - Borobudur's architect is the traditional attribution to Gunadharma, which is a Javanese
 *     tradition rather than a document, and is written as such.
 *   - The slug is the model file name, so every slug here is the kebab-case of the name it carries.
 *     That is why the Milan entry is filed as "Milan Cathedral" and not "Duomo di Milano": the
 *     pipeline only accepts a model whose own title names the landmark, and every candidate worth
 *     having for it is titled "Milan Cathedral", so the entry carries the English name and the
 *     Italian one sits in the description, where it costs nothing.
 *     Saint Basil's and St Peter's keep their apostrophes and full stops; the check file drops that
 *     punctuation before it compares, so both still reduce to their slugs.
 */
export const BATCH: Landmark[] = [
  {
    slug: "mont-saint-michel",
    name: "Mont Saint-Michel",
    city: "Normandy",
    country: "France",
    completed: 1523,
    height_m: null,
    style: "Romanesque and Flamboyant Gothic",
    architect: null,
    purpose: "A Benedictine abbey on a tidal island, built as a pilgrimage church to the archangel Michael.",
    description:
      "Mont Saint-Michel is a Benedictine abbey on a granite tidal island in the Couesnon estuary, cut off from the Normandy coast at high tide. The Romanesque choir of the abbey church collapsed in 1421 and was rebuilt in Flamboyant Gothic between 1446 and 1523, the year recorded here. The neo-Gothic spire over the crossing is far later: it was added in 1896, and the gilded copper archangel by Emmanuel Frémiet that crowns it was finished in 1898. The monument is an abbey, a village and a rock rather than one structure, so this entry carries no height.",
    fun_facts: [
      "The Romanesque choir collapsed in 1421 and was rebuilt between 1446 and 1523, with the work suspended from 1450 to 1499.",
      "The spire added in 1896 carries a gilded copper archangel by Emmanuel Frémiet: 3.5 m tall, 800 kg, finished in 1898.",
      "The abbey church floor stands 78.60 m above sea level, and French measurements put the tip of the archangel's sword at 157.10 m.",
      "The abbey was turned into a prison in the French Revolution and remained one until 1863.",
    ],
    model_url: "/models/landmarks/mont-saint-michel.glb",
    accent: ["#dfe7ee", "#3c4a5a"],
    popularity: 92,
    kind: "monument",
  },
  {
    slug: "arc-de-triomphe",
    name: "Arc de Triomphe",
    city: "Paris",
    country: "France",
    completed: 1836,
    height_m: 49.54,
    style: "Neoclassical",
    architect: "Jean-François Chalgrin, then Louis-Robert Goust, Jean-Nicolas Huyot and Guillaume-Abel Blouet",
    purpose: "A triumphal arch for the armies of the French Revolution and the Napoleonic Wars.",
    description:
      "The Arc de Triomphe stands at the centre of the Place Charles de Gaulle, where twelve avenues meet at the western end of the Champs-Élysées. Napoleon ordered it in 1806 and it was inaugurated on 28 July 1836, fifteen years after his death, under Louis-Philippe. It measures 49.54 m high, 44.82 m wide and 22.21 m deep, and references that give 50 m are rounding that measurement. Jean-François Chalgrin designed it and three other architects carried the work on after him, and the Tomb of the Unknown Soldier was placed under the vault in 1921.",
    fun_facts: [
      "It is 49.54 m high, 44.82 m wide and 22.21 m deep; references that say 50 m are rounding the height.",
      "The inside walls carry the names of 660 officers, 558 of them generals of the First French Empire.",
      "The Unknown Soldier was placed in his final resting place under the vault on 28 January 1921.",
      "The climb to the rooftop terrace is 284 steps, beginning with a 240-step spiral staircase.",
    ],
    model_url: "/models/landmarks/arc-de-triomphe.glb",
    accent: ["#eae2d4", "#4a4640"],
    popularity: 91,
    kind: "monument",
  },
  {
    slug: "milan-cathedral",
    name: "Milan Cathedral",
    city: "Milan",
    country: "Italy",
    completed: 1965,
    height_m: 108.5,
    style: "Italian Gothic",
    architect: "Simone da Orsenigo and a succession of masters; the Madonnina's spire is by Carlo Pellicani",
    purpose: "The cathedral church of Milan and the seat of the Archbishop of Milan.",
    description:
      "Milan Cathedral, the Duomo di Milano, was begun in 1386 and finished in 1965, when the last of its detail was closed out, nearly six centuries later. The Madonnina's spire above the crossing, designed by Carlo Pellicani, was raised in 1762 and reaches 108.5 m, so references that say 108 m are rounding it. It is topped by the gilded statue of the Virgin designed by Giuseppe Perego, and it is the largest church in Italy, since St Peter's, the larger one, stands in the Vatican, a separate state. The fabric is brick faced with pink Candoglia marble.",
    fun_facts: [
      "The Madonnina's spire was erected in 1762 at a height of 108.5 m; references that say 108 m are rounding it.",
      "Construction ran from 1386 to 1965, nearly six centuries, in Candoglia marble over brick.",
      "The gilded Madonnina on the tallest spire was designed by the sculptor Giuseppe Perego.",
      "Its listed capacity is 40,000 people, and management offers its 135 spires for adoption at 100,000 euros each to pay for maintenance.",
    ],
    model_url: "/models/landmarks/milan-cathedral.glb",
    accent: ["#f2e9e4", "#4a3f42"],
    popularity: 87,
    kind: "temple",
  },
  {
    slug: "trevi-fountain",
    name: "Trevi Fountain",
    city: "Rome",
    country: "Italy",
    completed: 1762,
    height_m: 26.3,
    style: "Baroque",
    architect: "Nicola Salvi, completed by Giuseppe Pannini",
    purpose: "The showpiece terminus of the Acqua Vergine, the aqueduct that still feeds this corner of Rome.",
    description:
      "The Trevi Fountain stands at the end of the Acqua Vergine, the revived Roman Aqua Virgo that has carried water to this part of Rome since the first century BC. Pope Clement XII ran a competition in 1730 that Nicola Salvi lost and was then awarded anyway, after an outcry at a Florentine winning; Salvi began the fountain in 1732 and died in 1751 with it half finished, and Giuseppe Pannini completed it in 1762. It is 26.3 m high and 49.15 m wide, cut from travertine against the back of a palazzo. Coins are thrown into it over the left shoulder with the right hand, and the money goes to charity.",
    fun_facts: [
      "Nicola Salvi died in 1751 with the fountain half finished, and Giuseppe Pannini completed it in 1762.",
      "About 3,000 euros are thrown into the fountain each day; Caritas received 1.4 million euros from it in 2016.",
      "Salvi hid a barber's sign that spoiled the ensemble behind a sculpted vase.",
      "The 2013 restoration, the most thorough in its history, was paid for by Fendi and took 20 months at a cost of 2.2 million euros.",
    ],
    model_url: "/models/landmarks/trevi-fountain.glb",
    accent: ["#efe8d8", "#2f4f52"],
    popularity: 89,
    kind: "monument",
  },
  {
    slug: "tower-bridge",
    name: "Tower Bridge",
    city: "London",
    country: "United Kingdom",
    completed: 1894,
    height_m: 65,
    style: "Victorian Gothic Revival",
    architect: "Horace Jones, engineered by John Wolfe Barry",
    purpose: "A road bridge downstream of London Bridge, able to open so that ships could still reach the Pool of London.",
    description:
      "Tower Bridge is a combined bascule and suspension bridge over the Thames, built between 1886 and 1894 to connect the south bank to the City without closing the river to shipping. Its two towers rise 65 m, which is 213 ft in the measurements the engineers used, and the bridge is 287 m long including the abutments. Horace Jones designed it and John Wolfe Barry engineered it, and the bascules were driven by hydraulic accumulators until the system was converted to electro-hydraulic power in 1972. It was opened by the Prince and Princess of Wales on 30 June 1894.",
    fun_facts: [
      "Its two towers are 65 m high, which is the engineers' 213 ft rounded to the nearest metre.",
      "The hydraulic accumulators that drove the bascules were replaced by an electro-hydraulic system in 1972.",
      "About 40,000 vehicles and pedestrians cross the bridge every day.",
      "Glass floors were fitted into the two high-level walkways in 2014.",
    ],
    model_url: "/models/landmarks/tower-bridge.glb",
    accent: ["#dfe6ee", "#2f4257"],
    popularity: 90,
    kind: "bridge",
  },
  {
    slug: "edinburgh-castle",
    name: "Edinburgh Castle",
    city: "Edinburgh",
    country: "United Kingdom",
    completed: 1588,
    height_m: null,
    style: "Medieval fortress with 16th-century artillery defences",
    architect: null,
    purpose: "A royal castle and army garrison on Castle Rock.",
    description:
      "Edinburgh Castle stands on Castle Rock, a volcanic plug occupied since at least the Iron Age, at the top of the Royal Mile. There has been a royal castle on the rock since the reign of Malcolm III in the 11th century, and it has been besieged so often that it is described as one of the most attacked places in Britain. Almost nothing standing pre-dates the Lang Siege of 1573, when the medieval defences were wrecked by artillery; the Half Moon Battery that fronts the castle was raised between 1573 and 1588, the year recorded here. It is a complex of buildings on a rock rather than one structure, so this entry carries no height.",
    fun_facts: [
      "St Margaret's Chapel, from the early 12th century, is the oldest building in Edinburgh.",
      "Few buildings pre-date 1573; the Half Moon Battery that fronts the castle was built between 1573 and 1588.",
      "The great bombard Mons Meg was delivered to the castle in 1457 and brought back from the Tower of London in 1829.",
      "The One O'Clock Gun has fired a time signal at 1 p.m. since 1861, except on Sundays, Good Friday and Christmas Day.",
    ],
    model_url: "/models/landmarks/edinburgh-castle.glb",
    accent: ["#e2e0dc", "#3b3a36"],
    popularity: 83,
    kind: "castle",
  },
  {
    slug: "alhambra",
    name: "Alhambra",
    city: "Granada",
    country: "Spain",
    completed: 1391,
    height_m: null,
    style: "Nasrid Islamic, with later Spanish Renaissance additions",
    architect: null,
    purpose: "The palace and fortress of the Nasrid emirs of Granada.",
    description:
      "The Alhambra is a palace and fortress complex on the Sabika hill above Granada, begun in 1238 by Muhammad I Ibn al-Ahmar, the first Nasrid emir and the founder of the last Muslim state of al-Andalus. Its palaces took the form they still have under Yusuf I, who reigned from 1333 to 1354, and Muhammad V, who reigned from 1354 until his death in 1391, the year recorded here; after him comparatively little major building was done. Charles V added a Renaissance palace inside the walls from 1527, which was abandoned unfinished in 1637 and left without a roof until 1967. It is a complex of palaces, courtyards and fortifications rather than one structure, so this entry carries no height.",
    fun_facts: [
      "It was begun in 1238 by Muhammad I Ibn al-Ahmar, the first Nasrid emir and founder of the Emirate of Granada.",
      "Muhammad V reigned from 1354 until his death in 1391, and after that relatively little major building was done.",
      "The Renaissance palace Charles V put inside the walls was begun in 1527, abandoned in 1637 and stood roofless until 1967.",
      "UNESCO listed the Alhambra, the Generalife and the Albayzín together in 1984.",
    ],
    model_url: "/models/landmarks/alhambra.glb",
    accent: ["#f0d9c0", "#6a2f24"],
    popularity: 90,
    kind: "castle",
  },
  {
    slug: "cologne-cathedral",
    name: "Cologne Cathedral",
    city: "Cologne",
    country: "Germany",
    completed: 1880,
    height_m: 157.38,
    style: "High Gothic and Gothic Revival",
    architect: "Master Gerhard, and Ernst Friedrich Zwirner, who led the 19th-century completion",
    purpose: "The cathedral of the Archdiocese of Cologne, built to hold the shrine of the Three Kings.",
    description:
      "Cologne Cathedral was begun in 1248, halted in the 1560s with the south tower no more than a stump under a medieval crane, and finished only in the 19th century, when the original drawings were rediscovered and a civic association and the Prussian state paid for the work. It is 157.38 m to the tip of the south tower, and references that round it to 157 m are rounding that figure. It was consecrated on 15 October 1880 and was the tallest building in the world for four years, until the Washington Monument passed it. The 19th-century campaign was led by Ernst Friedrich Zwirner, who died in 1861, and it followed the medieval plan.",
    fun_facts: [
      "It measures 157.38 m to the top of the south tower; references that say 157 m are rounding that figure.",
      "The south tower was left unfinished with a medieval crane on top, and building did not properly resume until 1842, nearly three centuries later.",
      "It was the tallest building in the world for four years, until the Washington Monument overtook it.",
      "It is the tallest twin-spired church in the world and the third tallest church in Europe.",
    ],
    model_url: "/models/landmarks/cologne-cathedral.glb",
    accent: ["#dfe1e4", "#33383d"],
    popularity: 86,
    kind: "temple",
  },
  {
    slug: "prague-castle",
    name: "Prague Castle",
    city: "Prague",
    country: "Czechia",
    completed: 1929,
    height_m: null,
    style: "Romanesque, Gothic, Renaissance and Baroque",
    architect: "Matthias of Arras and Peter Parler, who built St Vitus Cathedral",
    purpose: "The seat of the kings of Bohemia, the Holy Roman emperors and now the president of the Czech Republic.",
    description:
      "Prague Castle is a walled complex on a ridge above the Vltava, founded in 870 with the Church of the Virgin Mary, the first building put up inside its walls. It has been the seat of power in Bohemia ever since, for kings, for Holy Roman emperors and now for the president of the Czech Republic, whose office is in the New Royal Palace. St Vitus Cathedral, begun by Matthias of Arras and carried on by Peter Parler, was not finished until 28 September 1929, the date recorded here. The complex covers almost 70,000 m² and runs about 570 m long and an average of about 130 m wide, which Guinness records as the largest ancient castle in the world.",
    fun_facts: [
      "The castle began in 870, when the Church of the Virgin Mary was built as its first walled building.",
      "St Vitus Cathedral, begun by Matthias of Arras and continued by Peter Parler, was finished on 28 September 1929.",
      "Guinness records it as the largest ancient castle in the world: almost 70,000 m², about 570 m long and about 130 m wide on average.",
      "It is the most visited attraction in Czechia, with 2.59 million visitors in 2024.",
    ],
    model_url: "/models/landmarks/prague-castle.glb",
    accent: ["#eee0c4", "#4a3b2c"],
    popularity: 85,
    kind: "castle",
  },
  {
    slug: "saint-basils-cathedral",
    name: "Saint Basil's Cathedral",
    city: "Moscow",
    country: "Russia",
    completed: 1561,
    height_m: 47.5,
    style: "Russian Orthodox, tented and onion-domed",
    architect: "Ivan Barma and Postnik Yakovlev, though researchers have argued the two names are one man",
    purpose: "A votive church for Ivan the Terrible's capture of Kazan and Astrakhan.",
    description:
      "Saint Basil's Cathedral stands at the southern end of Red Square, built from 1555 to 1561 on the orders of Ivan the Terrible to mark the capture of Kazan and Astrakhan. Its official name is the Cathedral of the Intercession of the Most Holy Theotokos on the Moat, and it is a cluster of nine chapels around a central one rather than a single nave; the highest point is 47.5 m. The colouring it is known for came later, and in 1683 the church was adorned with a tiled cornice carrying a written history of the building. It is now a branch of the State Historical Museum, with church services restored in 1991.",
    fun_facts: [
      "It was consecrated on 12 July 1561, six years after work began in 1555.",
      "Its highest point is 47.5 m, over a cluster of nine chapels arranged around a central one.",
      "The church received its tiled cornice and the colour scheme it is known for in 1683.",
      "The story that Ivan the Terrible blinded its architects traces to Jerome Horsey's account of Ivan III blinding the architect of the Ivangorod fortress instead.",
    ],
    model_url: "/models/landmarks/saint-basils-cathedral.glb",
    accent: ["#f5e3d0", "#2e3f6b"],
    popularity: 88,
    kind: "temple",
  },
  {
    slug: "hagia-sophia",
    name: "Hagia Sophia",
    city: "Istanbul",
    country: "Turkey",
    completed: 537,
    height_m: 55,
    style: "Byzantine, with Ottoman additions",
    architect: "Isidore of Miletus and Anthemius of Tralles",
    purpose: "The cathedral of Constantinople, built by Justinian I and since 1453 a mosque.",
    description:
      "Hagia Sophia was built in five years, from 532 to 537, for the emperor Justinian I, and was consecrated on 27 December 537. Its dome rests on four pendentives and rises 55 m from the floor, or 55.6 m at its maximum; repairs have left it slightly oval, measuring between 31.24 m and 30.86 m across depending on which way it is taken. It was the cathedral of Constantinople until the city fell in 1453, when minarets were added and it became a mosque; it was a museum from 1935 until 2020, and has been a mosque again since. The architects were two geometers, Isidore of Miletus and Anthemius of Tralles.",
    fun_facts: [
      "It was completed in 537, five years after construction began, and consecrated on 27 December that year.",
      "The dome stands 55 m above the floor at its lowest measurement and 55.6 m at its maximum, because repairs left it slightly elliptical.",
      "The dome spans between 31.24 m and 30.86 m depending on where it is measured.",
      "It was a museum from 1935 to 2020, when a Council of State decision returned it to use as a mosque.",
    ],
    model_url: "/models/landmarks/hagia-sophia.glb",
    accent: ["#efe0d8", "#4b3a33"],
    popularity: 91,
    kind: "temple",
  },
  {
    slug: "st-peters-basilica",
    name: "St. Peter's Basilica",
    city: "Vatican City",
    country: "Vatican City",
    completed: 1626,
    height_m: 136.6,
    style: "Renaissance and Baroque",
    architect: "A succession including Donato Bramante, Raphael, Michelangelo, Carlo Maderno and Gian Lorenzo Bernini",
    purpose: "The papal basilica built over the tomb of Saint Peter.",
    description:
      "St Peter's Basilica was begun on 18 April 1506 under Julius II, over the Constantinian church that had stood on the site, and took 120 years and most of the great architects of the Renaissance to finish. Michelangelo designed the dome, Carlo Maderno lengthened the plan into a Latin cross and built the façade, and Bernini added the baldachin over the altar and the colonnade outside. Urban VIII consecrated the finished church on 18 November 1626. It is 136.6 m to the top of the cross, 220 m long and 150 m wide, and it holds 60,000 people standing.",
    fun_facts: [
      "It was begun on 18 April 1506 and consecrated on 18 November 1626, 120 years later.",
      "It is 136.6 m to the top of the cross, and its capacity is given as 60,000 standing and 20,000 seated.",
      "Michelangelo designed the dome, Carlo Maderno the extended nave and façade, and Bernini the baldachin and the colonnade.",
      "Vatican City, of which it is part, was inscribed as a UNESCO World Heritage Site in 1984.",
    ],
    model_url: "/models/landmarks/st-peters-basilica.glb",
    accent: ["#f4efe4", "#4a4436"],
    popularity: 92,
    kind: "temple",
  },
  {
    slug: "temple-of-heaven",
    name: "Temple of Heaven",
    city: "Beijing",
    country: "China",
    completed: 1420,
    height_m: null,
    style: "Chinese imperial, Ming and Qing",
    architect: null,
    purpose: "The altar complex where the emperors of the Ming and Qing prayed to Heaven for good harvests.",
    description:
      "The Temple of Heaven is a 273-hectare walled park in the south-east of Beijing, first laid out in 1420 under the Yongle Emperor, who was building the Forbidden City at the same time. Its buildings are arranged so that a round Heaven stands on a square Earth: the Hall of Prayer for Good Harvests, the Imperial Vault of Heaven and the Circular Mound Altar, the last built by the Jiajing Emperor in 1530 and rebuilt in 1740. The Hall of Prayer is a circular building 38 m tall and 36 m across, entirely of wood and put together without nails, and the one standing today is a rebuild, because the original burned after a lightning strike in 1889. It is a complex of halls and altars rather than one structure, so this entry carries no height.",
    fun_facts: [
      "The complex was first built in 1420, during the reign of the Yongle Emperor.",
      "The Hall of Prayer for Good Harvests is 38 m tall and 36 m across, entirely of wood and built without nails.",
      "The hall standing today is a replacement: the original was destroyed by fire after a lightning strike in 1889.",
      "The Circular Mound Altar was built by the Jiajing Emperor in 1530 and rebuilt in 1740; UNESCO listed the Temple of Heaven in 1998.",
    ],
    model_url: "/models/landmarks/temple-of-heaven.glb",
    accent: ["#dfeaf5", "#1f3a63"],
    popularity: 84,
    kind: "temple",
  },
  {
    slug: "himeji-castle",
    name: "Himeji Castle",
    city: "Himeji",
    country: "Japan",
    completed: 1618,
    height_m: null,
    style: "Azuchi-Momoyama Japanese castle",
    architect: null,
    purpose: "A feudal castle whose keep was a storehouse in peacetime and a fortified tower in war.",
    description:
      "Himeji Castle is a hilltop castle of 83 surviving structures above the city of Himeji, begun as a fort in 1333 and rebuilt in its present form by Ikeda Terumasa between 1601 and 1609, with further buildings added by Honda Tadamasa in 1617 and 1618, the year recorded here. It is called the White Egret Castle for its white plaster walls, and the main keep stands 31.5 m of timber on its stone base, or 46.4 m measured from the foot of that wall. It survived the American bombing of 1945, when a firebomb hit the keep and failed to explode, and the Great Hanshin earthquake of 1995, and was restored between 2009 and 2015. It is a castle complex rather than one structure, so this entry carries no height.",
    fun_facts: [
      "The main keep is 31.5 m of timber above its stone base, and 46.4 m measured from the foot of the stone wall.",
      "Ikeda Terumasa rebuilt the castle between 1601 and 1609; the labour is estimated at 2.5 million man-days.",
      "It is a network of 83 structures that has stood intact for almost 700 years.",
      "A firebomb hit the keep's top floor in 1945 and failed to explode; the castle was again undamaged in the Great Hanshin earthquake of 1995.",
    ],
    model_url: "/models/landmarks/himeji-castle.glb",
    accent: ["#f2f4f5", "#4c5a60"],
    popularity: 82,
    kind: "castle",
  },
  {
    slug: "borobudur",
    name: "Borobudur",
    city: "Magelang",
    country: "Indonesia",
    completed: 825,
    height_m: 35,
    style: "Javanese Buddhist, Sailendra period",
    architect: "Gunadharma, a Javanese tradition rather than a documented architect",
    purpose: "A Mahayana Buddhist shrine and a place of pilgrimage.",
    description:
      "Borobudur is a stepped stone monument in Central Java, built during the Sailendra dynasty and taking the form, seen from above, of a giant mandala: nine stacked platforms, six square and three circular, topped by a central dome. The date recorded here, 825, is the year one scholar gives for its completion under King Samaratungga; other work dates the building from about 780 to about 830, and nothing written at the time records a completion date. Its summit reaches 35 m from the ground, and with the three-tiered chhatra pinnacle that has since been removed it stood about 42 m. The stone carries 2,672 relief panels, 1,460 of them narrative, and originally 504 Buddha statues.",
    fun_facts: [
      "Its summit stands 35 m above the ground; with the chhatra pinnacle that has been removed it reached about 42 m.",
      "It carries 2,672 relief panels, 1,460 of them narrative, and originally held 504 Buddha statues.",
      "The central dome is ringed by 72 Buddha statues, each seated inside a perforated stupa.",
      "Knowledge of it reached the outside world in 1814 through Thomas Stamford Raffles; the largest restoration was completed in 1983 and UNESCO listed it in 1991.",
    ],
    model_url: "/models/landmarks/borobudur.glb",
    accent: ["#e4e6e0", "#3f4a3a"],
    popularity: 86,
    kind: "temple",
  },
  {
    slug: "prambanan",
    name: "Prambanan",
    city: "Yogyakarta",
    country: "Indonesia",
    completed: 850,
    height_m: null,
    style: "Javanese Hindu, Sanjaya period",
    architect: null,
    purpose: "A Hindu temple compound dedicated to the Trimurti, Brahma, Vishnu and Shiva.",
    description:
      "Prambanan is a Hindu temple compound on the boundary between Central Java and Yogyakarta, built around 850 during the Sanjaya dynasty and dedicated to the Trimurti. Its central Shiva temple is 47 m high and 34 m wide, the tallest of the 240 structures the compound originally held, with the Vishnu and Brahma temples beside it at 33 m each. The court moved to East Java in the 930s and the temples were abandoned, then collapsed in a major earthquake in the 16th century; Colin Mackenzie, a surveyor in the service of Stamford Raffles, came upon them in 1811 and the Dutch colonial government began reconstruction in 1918. The name covers a compound of 240 temples rather than one structure, so this entry carries no height.",
    fun_facts: [
      "The Shiva temple at the centre is 47 m high and 34 m wide, and the Brahma and Vishnu temples are 33 m each.",
      "The compound originally held 240 structures, and is the largest Hindu temple site in Indonesia.",
      "Colin Mackenzie came upon the ruins in 1811 and the Dutch colonial government began reconstruction in 1918.",
      "The temples were damaged again in the 2006 Yogyakarta earthquake, and UNESCO listed the Prambanan Temple Compounds in 1991.",
    ],
    model_url: "/models/landmarks/prambanan.glb",
    accent: ["#e9e4d6", "#4a4034"],
    popularity: 76,
    kind: "temple",
  },
];
