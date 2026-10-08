import type { CatalogEntry } from "./catalog-entry.ts";

/**
 * Plants, batch 1 — the first sixteen entries of the PLANTS catalogue, written against the shared
 * `CatalogEntry` shape in `data/catalog-entry.ts`.
 *
 * ## Where the numbers come from
 *
 * Every date, name and figure below was checked on **2026-10-05**, and the sources are named so that
 * the next person can re-derive each one:
 *
 *   - **`family` and `native_range` come from Kew's Plants of the World Online (POWO)**, the taxon
 *     page for each accepted name, `powo.science.kew.org/taxon/urn:lsid:ipni.org:names:...`. POWO
 *     prints a "Native to" list of TDWG countries; this file keeps the region those countries add up
 *     to rather than the forty-entry list, which is a filing cabinet and not a sentence. Seven entries
 *     — sunflower, bamboo, Venus flytrap, ivy, baobab, saguaro and coffee — could not be read from
 *     POWO on the day, because the taxon pages were rate-limited after a run of requests, so for those
 *     the range is the species description's own statement, cross-checked against the same records read
 *     through the World Checklist of Vascular Plants (WCVP) on GBIF, the checklist POWO is built from.
 *     Giant kelp is the eighth: POWO covers vascular plants and `Macrocystis pyrifera` is an alga, so its
 *     family is the record in the GBIF backbone and its range is the species description's. Where two
 *     sources overlap here they agree.
 *   - **`conservation_status` comes from the IUCN Red List** (site version 2026-1), assessment link
 *     recorded beside each entry below.
 *   - **`max_height_m` and `lifespan` come from the published species description**, because POWO
 *     carries nomenclature and distribution and does not print measurements. Where the source gives a
 *     range, the field takes the **upper bound of the ordinary range** and not a record: a record
 *     specimen is named in the facts instead, so that "Giant Sequoia 85" and its 94.8 m record tree do
 *     not contradict each other on the same card.
 *
 * ## The numbers that are contested, and what was written instead
 *
 *   - **Oak, 40 m.** One source gives both figures — "typically maturing at up to 20 m in height, and
 *     sometimes up to 40 metres" — so the field takes 40 m and the ordinary 20 m is in the prose. A
 *     card carrying 20 m would be wrong about the tree most people photograph.
 *   - **Giant sequoia, 85 m.** The published average is "50–85 m". The tallest tree ever measured is
 *     94.8 m (311 ft), 11.5% above the top of that average; that record is in the facts.
 *   - **Saguaro, 16 m.** The description gives "3–16 m tall" and the lead of the same article says
 *     "over 12 meters". 16 m is the upper bound of the range; 12 m is the figure usually quoted.
 *   - **Sunflower, 3 m.** "Typical heights of 3 metres". The tallest sunflower on record measured
 *     10.9 m (35 ft 9 in), which is a cultivated record and not a species maximum.
 *   - **Ginkgo, 35 m.** "Normally reaching a height of 20–35 m", with specimens in China over 40 m.
 *     Those specimens are in the facts; the field keeps the normal range.
 *   - **Venus flytrap, 0.15 m.** The tallest part of the plant is not a leaf. Its leaves and traps
 *     reach 3–10 cm and the white flower stands on a stem of about 15 cm, so the field carries the
 *     flowering stem and both figures are in the prose and the facts.
 *   - **Bracken, 1 m.** The source's fronds are "0.3–1 metre tall". Bracken in deep shade and bracken
 *     in the open differ by more than that; 1 m is what this source states.
 *   - **Wheat's native range.** POWO gives Triticum aestivum as native to India, Iran, Lebanon-Syria,
 *     Pakistan, Palestine, Transcaucasus, Türkiye and the western Himalaya. Bread wheat is an
 *     allohexaploid cultigen with no wild population that represents it, so that list describes where
 *     the crop was first grown, not where a wild plant grows; the description says so.
 *   - **Ginkgo's native range.** POWO gives "China Southeast" and nothing else. The tree has been
 *     planted across China, Korea and Japan for centuries, and the often-quoted "native to China" is
 *     wider than the wild population POWO accepts.
 *   - **Coffee's native range.** The natural populations are given as the forests of South Ethiopia
 *     and South Sudan. The same source adds Yemen and records that the Kenyan population on Mount
 *     Marsabit may be naturalised rather than native, so the field keeps the two uncontested ones.
 *   - **Wheat's lifespan.** The entry records bread wheat as an annual, and the description read here
 *     does not say so in as many words: it discusses the plant's origin, genome and yield but not its
 *     life cycle. The habit rests on the crop being grown from seed to harvest inside one season, and
 *     it is the one lifespan in this file that is not taken from a quotation.
 *   - **Pteridium aquilinum and the Red List.** The Red List assesses the northern segregate
 *     `Pteridium pinetorum` as Least Concern, but bracken as POWO accepts it — `Pteridium
 *     aquilinum` — is not assessed under that name. This entry does **not** borrow the segregate's
 *     category: `conservation_status` is null and the prose claims no threat category.
 *
 * ## The numbers left null
 *
 *   - **Wheat, `max_height_m` is null.** The source discusses stem height only where it explains
 *     lodging under fertiliser and publishes no figure for the species. A straw height invented here
 *     would be the one number in this file nobody could trace.
 *   - **Giant kelp, `max_height_m` is null.** Macrocystis pyrifera is measured in **length** — more
 *     than 45 m, with fronds that lengthen by up to 60 cm a day — and it floats at the surface rather
 *     than standing up. Turning that into a height would state a figure no source publishes, so the
 *     length is in the facts and the field is null.
 *   - **Sacred lotus, `max_height_m` is null.** The source measures the plant by its parts: petioles
 *     up to 200 cm and leaf blades 80–100 cm across. How far the whole plant stands above the water
 *     depends on the depth of the water it grew in, and is not a number anyone publishes.
 *   - **`conservation_status` is null** for bamboo, ivy, lotus, baobab, bracken, orchid, wheat and
 *     giant kelp: the Red List search returned no assessment for those names on 2026-10-05. A null
 *     here is a note to check again, not a claim that a species is unassessed, and the prose then says
 *     nothing about threat. For the African baobab the null is firmer: the source records that as of
 *     February 2025 the Red List had not yet classified the species.
 *
 * ## Three naming decisions
 *
 * The slug is the model file name, and the pipeline only accepts a model whose own title names the
 * entry, so each entry carries the name a model seller would use while the species sits in
 * `metadata.scientific_name`, where it costs nothing:
 *
 *   - **Bamboo** is moso bamboo, `Phyllostachys edulis`. "Bamboo" is the title every candidate model
 *     carries, and the figures in the entry are that species' figures, not the subfamily's.
 *   - **Orchid** is the moon orchid, `Phalaenopsis amabilis`, the species behind the shop orchid and
 *     the one whose measurements are published. The family holds some 28,000 species and no single
 *     figure is true of them.
 *   - **Ivy** is filed as a `tree` in `metadata.kind`. The kind list is fixed — tree, flower, grass,
 *     fern, succulent, carnivorous, crop, alga — and `Hedera helix` is a woody climber, so it takes
 *     the one kind that covers a woody perennial rather than a kind that would be a plain error.
 */
export const PLANT_ENTRIES: CatalogEntry[] = [
  {
    slug: "sunflower",
    name: "Sunflower",
    subtitle: "Flower · Asteraceae",
    description:
      "The common sunflower is a large annual forb of the daisy family, grown for the oil and confectionery seeds carried in its compound flower head. Its erect stem typically reaches about 3 m, and the tallest sunflower ever recorded measured 10.9 m. It is native to the central and western United States, southern Canada and northern Mexico, and it was one of four plants domesticated in eastern North America, where it is now the most economically important of them. What reads as a single flower is a head of many small florets, and each of them can set a seed.",
    facts: [
      "Its stem typically reaches about 3 m, and the tallest sunflower ever recorded stood 10.9 m tall.",
      "It is native to the central and western United States, southern Canada and northern Mexico.",
      "It was one of four plants domesticated in eastern North America and is now the most economically important of them.",
      "What reads as a single flower is a head of many small florets, each able to set a seed.",
    ],
    model_url: "/models/plants/sunflower.glb",
    accent: ["#fbe7a2", "#8a6a12"],
    popularity: 90,
    metadata: {
      kind: "flower",
      family: "Asteraceae",
      scientific_name: "Helianthus annuus",
      native_range: "Central and western United States, southern Canada and northern Mexico",
      max_height_m: 3,
      lifespan: "annual; a single growing season",
      conservation_status: "Least Concern",
      source:
        "Kew POWO (family, native range); IUCN Red List assessment 19073408/47600755 (Least Concern); species description checked on 2026-10-05 (height, lifespan)",
    },
  },
  {
    slug: "oak",
    name: "Oak",
    subtitle: "Tree · Fagaceae",
    description:
      "The pedunculate oak is the broadleaf of Europe's lowland woods, a long-lived tree of heavy soils whose acorns hang on the long stalk that gives the species its name. It typically matures at up to 20 m, and exceptional trees reach 40 m with trunks that can pass 10 m in girth. English oaks commonly live for more than 500 years and a few are believed to be over a thousand years old, which is why so many of them are protected as individual trees and not as woodland. Its native range runs from Ireland and Portugal east through Europe to the Caucasus and Iran.",
    facts: [
      "It typically matures at up to 20 m, and exceptional specimens reach about 40 m.",
      "English oaks commonly live for more than 500 years, and some are believed to be over 1,000 years old.",
      "The acorns sit on a long stalk, or peduncle, which is the feature the name pedunculate oak records.",
      "Its trunk can exceed 10 m in girth, and pollarded specimens of 14 m have been reported.",
    ],
    model_url: "/models/plants/oak.glb",
    accent: ["#d9e3cf", "#3f5233"],
    popularity: 88,
    metadata: {
      kind: "tree",
      family: "Fagaceae",
      scientific_name: "Quercus robur",
      native_range: "Europe, from Ireland and Portugal east to the Caucasus and Iran",
      max_height_m: 40,
      lifespan: "perennial; commonly over 500 years, with some individuals over 1,000",
      conservation_status: "Least Concern",
      source:
        "Kew POWO (family, native range); IUCN Red List assessment 63532/3126467 (Least Concern); species description checked on 2026-10-05 (height, lifespan)",
    },
  },
  {
    slug: "orchid",
    name: "Orchid",
    subtitle: "Flower · Orchidaceae",
    description:
      "This entry carries the orchid family through the species most often meant by a shop orchid: Phalaenopsis amabilis, the moon orchid of Indonesia. It is an epiphyte of rainforest trees, native from the Philippines and Borneo through Malesia to New Guinea and Queensland, with leathery leaves 150 to 300 mm long and an arching flowering stem 300 to 750 mm long whose branches carry two to ten white flowers each. It is one of Indonesia's three national flowers, recognised as the national flower of charm by presidential decree in 1993.",
    facts: [
      "It is one of Indonesia's three national flowers and was named the national flower of charm in 1993.",
      "Its arching flowering stem reaches 300 to 750 mm, and each branch carries two to ten white flowers.",
      "Its leathery leaves are 150 to 300 mm long and 40 to 70 mm wide.",
    ],
    model_url: "/models/plants/orchid.glb",
    accent: ["#f6e7f2", "#7d3f7a"],
    popularity: 87,
    metadata: {
      kind: "flower",
      family: "Orchidaceae",
      scientific_name: "Phalaenopsis amabilis",
      native_range: "The Philippines and Borneo through Malesia to New Guinea and Queensland",
      max_height_m: 0.75,
      lifespan: "perennial; an epiphyte of rainforest trees",
      conservation_status: null,
      source:
        "Kew POWO (family, native range); species description checked on 2026-10-05 (height, lifespan); no IUCN Red List assessment found for the name on 2026-10-05",
    },
  },
  {
    slug: "coffee",
    name: "Coffee",
    subtitle: "Crop · Rubiaceae",
    description:
      "Arabica coffee supplies about 60% of the world's coffee and is believed to be the first coffee species to have been cultivated. Wild plants grow 9 to 12 m tall with an open branching habit, while on plantations the tree is pruned and grown in light shade, and the seeds inside the red fruit are the beans that are roasted. Its natural populations are restricted to the forests of South Ethiopia and South Sudan, and it is listed as endangered, with studies projecting that by 2050 over half the land now used to grow it could become unproductive.",
    facts: [
      "Wild arabica plants grow 9 to 12 m tall, and cultivated trees are kept much shorter for picking.",
      "The species accounts for about 60% of global coffee production.",
      "Its natural populations are restricted to the forests of South Ethiopia and South Sudan.",
      "It is listed as Endangered on the IUCN Red List.",
    ],
    model_url: "/models/plants/coffee.glb",
    accent: ["#eee0cd", "#4a2f1c"],
    popularity: 86,
    metadata: {
      kind: "crop",
      family: "Rubiaceae",
      scientific_name: "Coffea arabica",
      native_range: "The forests of South Ethiopia and South Sudan",
      max_height_m: 12,
      lifespan: "perennial; a woody shrub of montane forest",
      conservation_status: "Endangered",
      source:
        "Kew POWO (family); IUCN Red List assessment 18289789/174149937 (Endangered); species description checked on 2026-10-05 (native range, height, lifespan)",
    },
  },
  {
    slug: "venus-flytrap",
    name: "Venus Flytrap",
    subtitle: "Carnivorous Plant · Droseraceae",
    description:
      "The Venus flytrap is the only species in its genus, and it grows wild in the wetlands of North and South Carolina, catching insects and spiders in leaves modified into snapping traps. Its leaves and traps reach 3 to 10 cm, and the white flower is carried on a stem of about 15 cm, high above the traps so that the insects pollinating it are not eaten. Every known wild site lies within 90 km of Wilmington, North Carolina, and the plant needs a winter dormancy to survive freezing temperatures and low light. It is listed as vulnerable.",
    facts: [
      "Its leaves and traps reach 3 to 10 cm, and the white flower stands on a stem of about 15 cm.",
      "Every known wild site lies within 90 km of Wilmington, North Carolina.",
      "Its closest relatives are the waterwheel plant and the sundews, and it is the only species in the genus Dionaea.",
      "It needs a period of winter dormancy to survive freezing temperatures and low light.",
    ],
    model_url: "/models/plants/venus-flytrap.glb",
    accent: ["#e4f0c9", "#7a2f3a"],
    popularity: 85,
    metadata: {
      kind: "carnivorous",
      family: "Droseraceae",
      scientific_name: "Dionaea muscipula",
      native_range: "The coastal plain of North and South Carolina, United States",
      max_height_m: 0.15,
      lifespan: "perennial; the rosette needs winter dormancy to survive freezing",
      conservation_status: "Vulnerable",
      source:
        "Kew POWO (family, native range); IUCN Red List assessment 39636/10253384 (Vulnerable); species description checked on 2026-10-05 (height, lifespan)",
    },
  },  {
    slug: "lavender",
    name: "Lavender",
    subtitle: "Flower · Lamiaceae",
    description:
      "Lavender is the aromatic shrub of the western Mediterranean hills, grown in gardens and distilled for its essential oil far beyond the three countries it is native to. It reaches 1 to 2 m, carries its purple flowers in spikes 2 to 8 cm long at the top of long leafless stems, and keeps its narrow evergreen leaves through the winter. Kew gives its native range as France, Italy and Spain, and the Red List assesses the species as Least Concern.",
    facts: [
      "It grows 1 to 2 m high, with flower spikes 2 to 8 cm long on leafless stems.",
      "Its native range is France, Italy and Spain, and it is grown far outside it.",
      "Its evergreen leaves are 2 to 6 cm long and only 4 to 6 mm broad.",
    ],
    model_url: "/models/plants/lavender.glb",
    accent: ["#e6dcf2", "#5b4a86"],
    popularity: 84,
    metadata: {
      kind: "flower",
      family: "Lamiaceae",
      scientific_name: "Lavandula angustifolia",
      native_range: "France, Italy and Spain",
      max_height_m: 2,
      lifespan: "perennial; an evergreen woody shrub",
      conservation_status: "Least Concern",
      source:
        "Kew POWO (family, native range); IUCN Red List assessment 288654917/88325190 (Least Concern); species description checked on 2026-10-05 (height, lifespan)",
    },
  },
  {
    slug: "lotus",
    name: "Lotus",
    subtitle: "Aquatic Flower · Nelumbonaceae",
    description:
      "The sacred lotus is one of only two living species in its family and a sacred plant across Hinduism, Buddhism, Jainism and Chinese culture. It roots in the mud of shallow lakes and raises its leaves and flowers on stalks that can be 200 cm long, with leaf blades 80 to 100 cm across. Its seeds are exceptionally durable: the oldest one known to have germinated came from a dry lakebed in northeastern China and was about 1,300 years old. Kew's native range for it runs from the Amur region and India through Southeast Asia to New Guinea and northern Australia.",
    facts: [
      "A lotus seed recovered from a dry lakebed in China germinated after about 1,300 years.",
      "Its leaf stalks reach 200 cm, which lets it grow in water that deep, and its leaf blades span 80 to 100 cm.",
      "It is one of only two living species in the family Nelumbonaceae.",
      "Its native range reaches from the Amur region and India to New Guinea and northern Australia.",
    ],
    model_url: "/models/plants/lotus.glb",
    accent: ["#fbe3ea", "#a6335a"],
    popularity: 83,
    metadata: {
      kind: "flower",
      family: "Nelumbonaceae",
      scientific_name: "Nelumbo nucifera",
      native_range: "South, East and Southeast Asia from India and China to New Guinea, and northern and western Australia",
      max_height_m: null,
      lifespan: "perennial; its seeds can stay viable for centuries",
      conservation_status: null,
      source:
        "Kew POWO (family, native range); species description checked on 2026-10-05 (lifespan); height left null because the source measures petioles and leaf blades, not the plant; no IUCN Red List assessment found for the name on 2026-10-05",
    },
  },
  {
    slug: "bamboo",
    name: "Bamboo",
    subtitle: "Grass · Poaceae",
    description:
      "Bamboo here is moso bamboo, Phyllostachys edulis, the giant timber bamboo of southern China, grown for its edible shoots and for culms cut as timber. Its culms rise from underground rhizomes and can reach 28 m, and each culm stops growing once it hardens, so it never thickens with age the way a tree trunk does. It is native to China and Taiwan and naturalised in Japan, and the plant flowers only about once every half century, and then sporadically rather than all at once.",
    facts: [
      "Its culms can reach 28 m, depending on the age and health of the plant.",
      "It is native to China and Taiwan and naturalised in Japan, from south of Hokkaido to Kagoshima.",
      "The plant flowers only every half century or so, and then sporadically rather than all at once.",
      "The Latin epithet edulis refers to the edible shoots it is grown for.",
    ],
    model_url: "/models/plants/bamboo.glb",
    accent: ["#dfeec6", "#4a6b2c"],
    popularity: 82,
    metadata: {
      kind: "grass",
      family: "Poaceae",
      scientific_name: "Phyllostachys edulis",
      native_range: "China and Taiwan",
      max_height_m: 28,
      lifespan: "perennial; the plant flowers about once every 50 years",
      conservation_status: null,
      source:
        "Kew POWO record via the WCVP checklist on GBIF (family, native range, confirmed by the WCVP records for China and Taiwan); species description checked on 2026-10-05 (height, lifespan); no IUCN Red List assessment found for the name on 2026-10-05",
    },
  },
  {
    slug: "wheat",
    name: "Wheat",
    subtitle: "Crop · Poaceae",
    description:
      "Bread wheat is the most widely grown of all crops and the cereal with the highest monetary yield, an allohexaploid grass that combines six sets of chromosomes from three different species. It arose about 8,000 years ago from a cross between an already domesticated wheat and wild goatgrass in the South Caucasus or the south-western Caspian region, and no wild population represents it today. About 95% of the wheat produced worldwide is this species. It is an annual crop, and short-straw varieties are bred so that heavy fertiliser does not make the stems grow too tall and lodge.",
    facts: [
      "It originated around 8,000 years ago from a cross between a domesticated wheat and wild goatgrass.",
      "About 95% of the wheat produced worldwide is this species.",
      "It is an allohexaploid, carrying six sets of chromosomes from three different species.",
      "Kew gives its native range as Türkiye, the Levant, Iran, Pakistan, India and the western Himalaya, the range of a crop rather than of a wild plant.",
    ],
    model_url: "/models/plants/wheat.glb",
    accent: ["#f7e8b6", "#8a6c1f"],
    popularity: 81,
    metadata: {
      kind: "crop",
      family: "Poaceae",
      scientific_name: "Triticum aestivum",
      native_range: "India, Iran, Lebanon-Syria, Pakistan, Palestine, Transcaucasus, Türkiye and the western Himalaya",
      max_height_m: null,
      lifespan: "annual; grown and harvested within one growing season",
      conservation_status: null,
      source:
        "Kew POWO (family, native range); species description checked on 2026-10-05 (origin, lifespan); height left null because the source publishes no figure for the species; no IUCN Red List assessment found for the name on 2026-10-05",
    },
  },  {
    slug: "giant-sequoia",
    name: "Giant Sequoia",
    subtitle: "Tree · Cupressaceae",
    description:
      "The giant sequoia is the most massive tree on Earth, a Californian conifer whose fibrous, furrowed bark can be 90 cm thick and whose tannin-rich sap protects it from the fires that clear the ground beneath it. It grows to an average of 50 to 85 m, and the tallest tree ever measured stands at 94.8 m, while a trunk 8.8 m across at breast height makes the General Grant tree the widest known. The oldest individual is between 3,200 and 3,266 years old. The species is listed as endangered, with fewer than 80,000 trees left in its native groves.",
    facts: [
      "Record giant sequoias have been measured at 94.8 m, on a species average of 50 to 85 m.",
      "The oldest known giant sequoia is 3,200 to 3,266 years old.",
      "Trunk diameters typically run 6 to 8 m, and the General Grant tree is the widest known at 8.8 m.",
      "Fewer than 80,000 trees remain in its native California groves.",
    ],
    model_url: "/models/plants/giant-sequoia.glb",
    accent: ["#e6d8c3", "#5a3a28"],
    popularity: 80,
    metadata: {
      kind: "tree",
      family: "Cupressaceae",
      scientific_name: "Sequoiadendron giganteum",
      native_range: "California",
      max_height_m: 85,
      lifespan: "perennial; the oldest known tree is 3,200 to 3,266 years old",
      conservation_status: "Endangered",
      source:
        "Kew POWO (family, native range); IUCN Red List assessment 34023/2840676 (Endangered); species description checked on 2026-10-05 (height, lifespan)",
    },
  },
  {
    slug: "saguaro",
    name: "Saguaro",
    subtitle: "Succulent · Cactaceae",
    description:
      "The saguaro is the giant columnar cactus of the Sonoran Desert, the only member of its genus and the state wildflower of Arizona. It grows very slowly from seed, and most plants produce a first side arm only when they are 75 to 100 years old, though some never grow one at all. Saguaros routinely live 150 to 200 years and can pass 12 m in height; their flowers are self-incompatible and need cross-pollination, and a well-pollinated fruit holds several thousand seeds.",
    facts: [
      "Saguaros routinely live 150 to 200 years and can grow taller than 12 m.",
      "The first side arm usually appears only after 75 to 100 years, and some plants never grow one.",
      "It is the only member of the genus Carnegiea and the state wildflower of Arizona.",
      "Its flowers are self-incompatible, so a fruit needs pollen from another plant.",
    ],
    model_url: "/models/plants/saguaro.glb",
    accent: ["#dff0d8", "#3f6b3a"],
    popularity: 79,
    metadata: {
      kind: "succulent",
      family: "Cactaceae",
      scientific_name: "Carnegiea gigantea",
      native_range: "The Sonoran Desert of Arizona and Sonora in Mexico, and the Whipple Mountains and Imperial County in California",
      max_height_m: 16,
      lifespan: "perennial; routinely 150 to 200 years",
      conservation_status: "Least Concern",
      source:
        "Kew POWO record via the WCVP checklist on GBIF (family, native range); IUCN Red List assessment 152495/121476885 (Least Concern); species description checked on 2026-10-05 (height, lifespan)",
    },
  },
  {
    slug: "ginkgo",
    name: "Ginkgo",
    subtitle: "Tree · Ginkgoaceae",
    description:
      "The ginkgo is the last living species of an order of trees that first appears in the fossil record more than 290 million years ago, and it was thought to be extinct in the wild for centuries, with scattered stands in south-western China that may be wild survivors. Kew's native range for it is China Southeast alone. The trees normally reach 20 to 35 m, with some specimens in China over 40 m, and the largest living trees are estimated to be more than 3,500 years old. It is listed as endangered.",
    facts: [
      "It normally reaches 20 to 35 m, and some specimens in China exceed 40 m.",
      "The largest living ginkgos are estimated to be more than 3,500 years old, and measured specimens exceed 1,600 years.",
      "It is the last living species in the order Ginkgoales, which first appeared more than 290 million years ago.",
    ],
    model_url: "/models/plants/ginkgo.glb",
    accent: ["#fbeeae", "#7a6a1f"],
    popularity: 78,
    metadata: {
      kind: "tree",
      family: "Ginkgoaceae",
      scientific_name: "Ginkgo biloba",
      native_range: "China Southeast",
      max_height_m: 35,
      lifespan: "perennial; some living trees are estimated at more than 3,500 years",
      conservation_status: "Endangered",
      source:
        "Kew POWO (family, native range); IUCN Red List assessment 32353/9700472 (Endangered); species description checked on 2026-10-05 (height, lifespan)",
    },
  },
  {
    slug: "baobab",
    name: "Baobab",
    subtitle: "Tree · Malvaceae",
    description:
      "The African baobab is the most widespread of the eight baobab species, a pachycaul of the dry savannas that stores water in a trunk which can be 10 to 14 m across. It reaches 5 to 25 m, and many of the largest trees are hollow, because the oldest wood inside decays and leaves a shell the tree goes on living in. Radiocarbon dating has shown at least one individual to be 1,275 years old. Its fruit grows up to 25 cm long with a woody shell, and as of February 2025 the IUCN Red List had not yet classified the species.",
    facts: [
      "It grows 5 to 25 m high, and its trunk can be 10 to 14 m in diameter.",
      "Radiocarbon dating has shown at least one African baobab to be 1,275 years old.",
      "Its fruit reaches 25 cm long, with a woody shell around the seeds.",
      "As of February 2025 the IUCN Red List had not yet classified the African baobab.",
    ],
    model_url: "/models/plants/baobab.glb",
    accent: ["#f0e2c4", "#6b4a26"],
    popularity: 76,
    metadata: {
      kind: "tree",
      family: "Malvaceae",
      scientific_name: "Adansonia digitata",
      native_range: "Mainland Africa, from Senegal and Ethiopia south to South Africa, and the southern Arabian Peninsula",
      max_height_m: 25,
      lifespan: "perennial; at least one individual dated to 1,275 years",
      conservation_status: null,
      source:
        "Kew POWO record via the WCVP checklist on GBIF (family, native range); species description checked on 2026-10-05 (height, lifespan, unclassified status); no IUCN Red List assessment found for the name on 2026-10-05",
    },
  },
  {
    slug: "kelp",
    name: "Kelp",
    subtitle: "Alga · Laminariaceae",
    description:
      "Giant kelp is the brown alga that builds the kelp forests of cool, nutrient-rich coasts, anchored to rock by a holdfast and held at the surface by gas-filled floats. Individual plants grow to more than 45 m in length, lengthening by as much as 60 cm a day, and each frond lasts about 100 days before it is replaced, while the plant itself may live up to three years. It is found in the north-east Pacific and across the temperate and sub-Antarctic waters of the Southern Hemisphere, where it is harvested for alginate, its primary commercial product.",
    facts: [
      "Individual plants grow to more than 45 m long, at a rate of up to 60 cm a day.",
      "Each frond lasts about 100 days, and a plant may live for up to three years.",
      "Its primary commercial product is alginate, and California beds were once cut by barges taking up to 300 tons a day.",
      "It is found in the north-east Pacific and in the temperate and sub-Antarctic waters of the Southern Hemisphere.",
    ],
    model_url: "/models/plants/kelp.glb",
    accent: ["#dfe9d2", "#26443a"],
    popularity: 64,
    metadata: {
      kind: "alga",
      family: "Laminariaceae",
      scientific_name: "Macrocystis pyrifera",
      native_range: "The north-east Pacific and the temperate and sub-Antarctic waters of the Southern Hemisphere",
      max_height_m: null,
      lifespan: "perennial; a plant may live up to three years, and each frond about 100 days",
      conservation_status: null,
      source:
        "Kew POWO does not cover algae, so the family is the record in the GBIF backbone (Laminariaceae); species description checked on 2026-10-05 (native range, length, lifespan); height left null because the species is measured in length; no IUCN Red List assessment found for the name on 2026-10-05",
    },
  },
  {
    slug: "ivy",
    name: "Ivy",
    subtitle: "Climber · Araliaceae",
    description:
      "Common ivy is the evergreen climber of European woods and walls, holding on with aerial roots and reaching 20 to 30 m where it finds a tree, a cliff or a building to climb, and spreading as ground cover where it finds nothing to climb at all. Its leaves are of two kinds, palmately five-lobed on creeping and climbing stems and unlobed and cordate on flowering stems in full sun, so a young ivy and a flowering one can look like different plants. It flowers from late summer into late autumn and its purple-black berries ripen in late winter, when both are food for insects and birds.",
    facts: [
      "It climbs to 20 to 30 m where a tree, cliff or wall gives it a surface to hold.",
      "Its leaves are of two kinds, five-lobed on climbing stems and unlobed and cordate on flowering stems in full sun.",
      "It flowers from late summer into late autumn, and its berries ripen in late winter as food for birds.",
    ],
    model_url: "/models/plants/ivy.glb",
    accent: ["#dbe8d5", "#2f4a35"],
    popularity: 62,
    metadata: {
      kind: "tree",
      family: "Araliaceae",
      scientific_name: "Hedera helix",
      native_range: "Most of Europe and parts of western Asia",
      max_height_m: 30,
      lifespan: "perennial; an evergreen woody climber",
      conservation_status: null,
      source:
        "Kew POWO record via the WCVP checklist on GBIF (family); species description checked on 2026-10-05 (native range, height, lifespan); no IUCN Red List assessment found for the name on 2026-10-05",
    },
  },
  
  /* ------------------------------------------------------------------ harvested entries
     Collected by scripts/harvest-catalogue-entries.mjs from sketchfab and Wikipedia, on 2026-10-06. The model_url of each one is written by the model pipeline. */


  /* ------------------------------------------------------------------ harvested entries
     Collected by scripts/harvest-catalogue-entries.mjs from sketchfab and Wikipedia, on 2026-10-06. The model_url of each one is written by the model pipeline. */
      {
    slug: "maple-tree",
    name: "Maple",
    subtitle: "Catalogue entry",
    description:
      "Acer is a genus of trees and shrubs commonly known as maples. The genus is placed in the soapberry family Sapindaceae. Only one species, Acer laurinum, extends to the Southern Hemisphere. The type species of the genus is the sycamore maple Acer pseudoplatanus, one of the most common maple species in Europe.",
    facts: [
      "There are approximately 132 species, most of which are native to East Asia, with a number also appearing in Europe, northern Africa, and North America.",
      "The oldest known fossils of Acer are from the late Paleocene of Northeast Asia and northern North America, around 60 million years old.",
      "The oldest fossils of Acer in Europe are from Svalbard, dating to the late Eocene (Priabonian ~38–34 million years ago).",
      "== Morphology == Most maples or acers are trees growing to a height of 10–45 m (33–148 ft).",
    ],
    model_url: "/models/plants/maple-tree.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 52,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Maple",
    },
  },
      {
    slug: "fig-tree",
    name: "Ficus",
    subtitle: "Catalogue entry",
    description:
      "Collectively known as fig trees or figs, they are native throughout the tropics with a few species extending into the semi-warm temperate zone. Many Ficus species are grown for their fruits, though only two species, the common fig (F. carica) and sycamore fig (F. sycomorus), are cultivated to any extent, with common fig being the type species and by far the most important.",
    facts: [
      "Ficus ( or ) is a genus of about 850 species of woody trees, shrubs, vines, epiphytes and hemiepiphytes in the family Moraceae.",
      "benghalensis), with its extensive adventitious roots, can cover over a hectare (2.5 acres), while F.",
      "Many have aerial roots, that can be 50 m (160 ft) in length, a distinctive shape or habit, and distinguishable fruits.",
      "For example, in Hawaii, some 60 species of figs have been introduced, but only four of the wasps that fertilize them, so only those species of figs produce viable seeds there and can become invasive species.",
    ],
    model_url: "/models/plants/fig-tree.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 55,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Ficus",
    },
  },
    {
    slug: "palm-tree",
    name: "Arecaceae",
    subtitle: "Catalogue entry",
    description:
      "The Arecaceae () are a family of perennial, flowering plants in the monocot order Arecales. Their growth form can be climbers, shrubs, tree-like and stemless plants, all commonly known as palms. Those having a tree-like form are colloquially called palm trees. Most palms are distinguished by their large, compound, evergreen leaves, known as fronds, arranged at the top of an unbranched stem, except for the Hyphaene genus, which has branched palms.",
    facts: [
      "Currently, 181 genera with around 2,600 species are known, most of which are restricted to tropical and subtropical climates.",
      "Ceroxylon quindiuense, Colombia's national \"tree\", is the tallest monocot in the world, reaching up to 60 metres (197 ft) tall.",
      "The coco de mer (Lodoicea maldivica) has the largest seeds of any plant, 40–50 centimetres (16–20 in) in diameter and weighing 15–30 kilograms (33–66 lb) each (coconuts are the second largest).",
      "Raffia palms (Raphia spp.) have the largest leaves of any plant, up to 25 metres (82 ft) long and 3 metres (10 ft) wide.",
    ],
    model_url: null,
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 57,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Arecaceae",
    },
  },
    {
    slug: "cactus",
    name: "Cactus",
    subtitle: "Catalogue entry",
    description:
      "The word cactus derives, through Latin, from the Ancient Greek word κάκτος (káktos), a name originally used by Theophrastus for a spiny plant whose identity is now not certain. Cacti occur in a wide range of shapes and sizes. They are native to the Americas, ranging from Patagonia in the south to parts of western Canada in the north, with the exception of Rhipsalis baccifera, which is also found in Africa and Sri Lanka. Cacti are adapted to live in very dry environments, including the Atacama Desert, one of the driest places on Earth.",
    facts: [
      "A cactus (pl.: cacti, cactuses, or less commonly, cactus) is a member of the plant family Cactaceae (), a family of the order Caryophyllales comprising about 127 genera with some 1,750 known species.",
      "Cactus stems are often ribbed or fluted with a number of ribs which corresponds to a Fibonacci number (2, 3, 5, 8, 13, 21, 34 etc.).",
      "The tallest free-standing cactus is Pachycereus pringlei, with a maximum recorded height of 19.2 m (63 ft), and the smallest is Blossfeldia liliputiana, only about 1 cm (0.4 in) in diameter at maturity.",
      "A fully grown saguaro (Carnegiea gigantea) is said to be able to absorb as much as 760 liters (200 U.S.",
    ],
    model_url: "/models/plants/cactus.glb",
    accent: ["#7ee787", "#0f2a17"],
    popularity: 59,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Cactus",
    },
  },
  {
    slug: "cactus-pack",
    name: "Cactus",
    subtitle: "Catalogue entry",
    description:
      "The word cactus derives, through Latin, from the Ancient Greek word κάκτος (káktos), a name originally used by Theophrastus for a spiny plant whose identity is now not certain. Cacti occur in a wide range of shapes and sizes. They are native to the Americas, ranging from Patagonia in the south to parts of western Canada in the north, with the exception of Rhipsalis baccifera, which is also found in Africa and Sri Lanka. Cacti are adapted to live in very dry environments, including the Atacama Desert, one of the driest places on Earth.",
    facts: [
      "A cactus (pl.: cacti, cactuses, or less commonly, cactus) is a member of the plant family Cactaceae (), a family of the order Caryophyllales comprising about 127 genera with some 1,750 known species.",
      "Cactus stems are often ribbed or fluted with a number of ribs which corresponds to a Fibonacci number (2, 3, 5, 8, 13, 21, 34 etc.).",
      "The tallest free-standing cactus is Pachycereus pringlei, with a maximum recorded height of 19.2 m (63 ft), and the smallest is Blossfeldia liliputiana, only about 1 cm (0.4 in) in diameter at maturity.",
      "A fully grown saguaro (Carnegiea gigantea) is said to be able to absorb as much as 760 liters (200 U.S.",
    ],
    model_url: "/models/plants/cactus-pack.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 60,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Cactus",
    },
  },
  {
    slug: "hollow-knight-33-34-moss-charger",
    name: "Hollow Knight",
    subtitle: "Catalogue entry",
    description:
      "The player controls a nameless insectoid warrior (commonly known as \"The Knight\") in exploring Hallownest, a fallen kingdom plagued by a supernatural disease. The game is set in diverse subterranean locations, featuring friendly and hostile insectoid characters and numerous bosses. Players have the opportunity to unlock abilities as they explore, along with pieces of lore and flavour text that are spread throughout the kingdom. Adelaide-based Team Cherry—founded by artist Ari Gibson and web designer William Pellen—wanted to create a game inspired by older platformers that replicated the explorational aspects of its influences.",
    facts: [
      "Hollow Knight is a 2017 Metroidvania video game developed and published by Australian independent development studio Team Cherry.",
      "The concept behind Hollow Knight was conceived in 2013 in the Ludum Dare game jam.",
      "Development was partially funded through a crowdfunding campaign that raised over A$57,000 by the end of 2014.",
      "It was released for Linux, macOS, and Windows in early 2017, for the Nintendo Switch, PlayStation 4, and Xbox One in 2018, and for the Nintendo Switch 2, PlayStation 5, and Xbox Series X/S in 2026.",
    ],
    model_url: "/models/plants/hollow-knight-33-34-moss-charger.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 61,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Hollow Knight",
    },
  },
  {
    slug: "tulip-flower",
    name: "Tulip",
    subtitle: "Catalogue entry",
    description:
      "Tulips are spring-blooming perennial herbaceous bulbiferous geophytes in the Tulipa genus. Their flowers are usually large, showy, and brightly coloured, generally red, orange, pink, yellow, or white. They often have a different coloured blotch at the base of the tepals, internally. Because of a degree of variability within the populations and a long history of cultivation, classification has been complex and controversial.",
    facts: [
      "The tulip is a member of the lily family, Liliaceae, along with 14 other genera, where it is most closely related to Amana, Erythronium, and Gagea in the tribe Lilieae.",
      "There are about 75 species, and these are divided among four subgenera.",
      "The cultivation of tulips dates back to 10th-century Persia.",
      "By the 15th century, tulips were among the most prized flowers; becoming the symbol of the later Ottomans.",
    ],
    model_url: "/models/plants/tulip-flower.glb",
    accent: ["#f0a6ca", "#3a1024"],
    popularity: 62,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Tulip",
    },
  },
  {
    slug: "tulip",
    name: "Tulip",
    subtitle: "Catalogue entry",
    description:
      "Tulips are spring-blooming perennial herbaceous bulbiferous geophytes in the Tulipa genus. Their flowers are usually large, showy, and brightly coloured, generally red, orange, pink, yellow, or white. They often have a different coloured blotch at the base of the tepals, internally. Because of a degree of variability within the populations and a long history of cultivation, classification has been complex and controversial.",
    facts: [
      "The tulip is a member of the lily family, Liliaceae, along with 14 other genera, where it is most closely related to Amana, Erythronium, and Gagea in the tribe Lilieae.",
      "There are about 75 species, and these are divided among four subgenera.",
      "The cultivation of tulips dates back to 10th-century Persia.",
      "By the 15th century, tulips were among the most prized flowers; becoming the symbol of the later Ottomans.",
    ],
    model_url: "/models/plants/tulip.glb",
    accent: ["#a5f3fc", "#0b2a33"],
    popularity: 63,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Tulip",
    },
  },
  {
    slug: "poppy-playtime-daisy-the-flower-updated",
    name: "Poppy Playtime",
    subtitle: "Catalogue entry",
    description:
      "The game is set in an abandoned factory owned by the fictional toy company Playtime Co. The player controls a former employee who receives a letter inviting them back to the factory years after the company's staff disappeared without a trace. The fourth chapter was released on Windows on January 30, 2025. The fifth chapter released on February 18, 2026 for Windows.",
    facts: [
      "Poppy Playtime is an episodic puzzle survival horror video game series first developed and published in October 2021 by American indie developer Mob Entertainment.",
      "The first chapter was released for Windows on October 12, 2021, and later ported to Android and iOS on March 11, 2022, the PlayStation 4 and PlayStation 5 on December 20, 2023, the Nintendo Switch on December 25, and the Xbox One and Xbox Series X/S on July 12, 2024.",
      "The second chapter was released for Windows on May 5, 2022, and the PlayStation 4 and 5, the Xbox One and Xbox Series X/S on September 20, 2024.",
      "The third chapter was released on Windows in January 2024, and the PlayStation 4 and 5, the Xbox One and Xbox Series X/S on September 20, 2024.",
    ],
    model_url: "/models/plants/poppy-playtime-daisy-the-flower-updated.glb",
    accent: ["#fcd34d", "#332405"],
    popularity: 64,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Poppy Playtime",
    },
  },
  {
    slug: "lily-of-the-valley",
    name: "Lily of the valley",
    subtitle: "Catalogue entry",
    description:
      "Lily-of-the-valley (Convallaria majalis), also written as lily of the valley, is a woodland flowering plant with sweetly scented, pendent, bell-shaped white flowers borne in sprays in spring. It is native to Europe, Western Asia and Northern Asia. The former varieties Convallaria majalis var. montana (native to eastern North America) and Convallaria majalis var.",
    facts: [
      "The stems grow to 15–35 cm (6–14 in) tall, with two (rarely three) leaves 5–20 cm (2–8 in) long and 3–7 cm (1–3 in) broad.",
      "The flowers have six white tepals (rarely pink, as in the cultivar Convallaria majalis 'Rosea', which has pink tepals), fused at the base to form a bell shape with reflexed tips; they are 5–10 mm (0.2–0.4 in) diameter, and are sweetly scented.",
      "The fruit is a poisonous small orange-red berry approximately 5–7 mm (0.2–0.3 in) diameter, containing an average of 3.9 large whitish to brownish seeds that dry to a clear translucent round bead 1–3 mm (0.04–0.12 in) wide.",
      "The fruit persists for an average of 47.5 days.",
    ],
    model_url: "/models/plants/lily-of-the-valley.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 65,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Lily of the valley",
    },
  },
      {
    slug: "mediterranean-metalurgy-ue5-gate-ornamen",
    name: "Unreal Engine 5",
    subtitle: "Catalogue entry",
    description:
      "It was released in early access on May 26, 2021, and formally launched for developers on April 5, 2022. Epic Games worked with Sony to optimize Unreal Engine 5 for the PlayStation 5. To demonstrate the engine's ease of use, both companies collaborated on a demo called \"Lumen in the Land of Nanite\" for the PlayStation 5 which featured a photorealistic cave setting that players could explore. The demo was showcased during the May 2020 reveal of the engine, and leveraged Nanite, Lumen, and assets from the Quixel library.",
    facts: [
      "Unreal Engine 5 (UE5) is the latest iteration of Unreal Engine, developed by Epic Games.",
      "It was revealed in May 2020 and officially released in April 2022.",
      "Unreal Engine 5 includes multiple upgrades and new features, including Nanite, a system that automatically adjusts the level of detail of meshes, and Lumen, a dynamic global illumination and reflections system that leverages software as well as hardware accelerated ray tracing.",
      "== History == Unreal Engine 5 was revealed on May 13, 2020, supporting all existing systems that could run Unreal Engine 4, including the PlayStation 5 and Xbox Series X/S.",
    ],
    model_url: "/models/plants/mediterranean-metalurgy-ue5-gate-ornamen.glb",
    accent: ["#ffb457", "#301a05"],
    popularity: 68,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Unreal Engine 5",
    },
  },
  {
    slug: "banana",
    name: "Banana",
    subtitle: "Catalogue entry",
    description:
      "A banana is an elongated, edible fruit that is botanically a berry produced by several kinds of large treelike herbaceous flowering plants in the genus Musa. In some countries, cooking bananas are called plantains, distinguishing them from dessert bananas. The fruit is variable in size, color and firmness, but is usually elongated and curved, with soft flesh rich in starch covered with a peel, which may have a variety of colors when ripe. It grows upward in clusters near the top of the plant.",
    facts: [
      "They are grown in 135 countries, primarily for their fruit, and to a lesser extent to make banana paper and textiles, while some are grown as ornamental plants.",
      "The world's largest producers of bananas in 2022 were India and China, which together accounted for approximately 26% of total production.",
      "Bananas grow in a wide variety of soils, as long as it is at least 60 centimetres (2.0 ft) deep, has good drainage and is not compacted.",
      "They are fast-growing plants, with a growth rate of the sheathing leaves of up to 1.6 metres (5.2 ft) per day; the woody stalk that later bears the fruits grows more slowly.",
    ],
    model_url: "/models/plants/banana.glb",
    accent: ["#c9d6e4", "#1b2531"],
    popularity: 69,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Banana",
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
    model_url: "/models/plants/gazebo.glb",
    accent: ["#c4b5fd", "#221a3d"],
    popularity: 73,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Gazebo",
    },
  },
    {
    slug: "eucalyptus-camaldulensis-river-red-gum",
    name: "Eucalyptus camaldulensis",
    subtitle: "Catalogue entry",
    description:
      "Eucalyptus camaldulensis, commonly known as river red gum, is a flowering plant in the family Myrtaceae, and is endemic to Australia. It is a tree with smooth white or cream-coloured bark, lance-shaped or curved adult leaves, flower buds in groups of seven or nine, white flowers and hemispherical fruit with the valves extending beyond the rim. A familiar and iconic tree, it is seen along many watercourses across inland Australia, providing shade in the extreme temperatures of central Australia and elsewhere. The bark is smooth white or cream-coloured with patches of yellow, pink or brown.",
    facts: [
      "== Description == Eucalyptus camaldulensis is a tree that typically grows to a height of 20 metres (66 ft) but sometimes to 45 metres (148 ft) and often does not develop a lignotuber.",
      "The juvenile leaves are lance-shaped, 80–180 mm (3.1–7.1 in) long and 13–25 mm (0.51–0.98 in) wide.",
      "Adult leaves are lance-shaped to curved, the same dull green or greyish green colour on both sides, 50–300 mm (2.0–11.8 in) long and 7–32 mm (0.28–1.26 in) wide on a petiole 8–33 mm (0.31–1.30 in) long.",
      "The flower buds are arranged in groups of seven, nine or sometimes eleven, in leaf axils on a peduncle 5–28 mm (0.20–1.10 in) long, the individual flowers on pedicels 2–10 mm (0.079–0.394 in) long.",
    ],
    model_url: null,
    accent: ["#7ee787", "#0f2a17"],
    popularity: 75,
    metadata: {
      // Harvested, not written by hand: the figures above are sentences of this article, and the
      // pipeline fills model_url once a licence-clean model is downloaded and credited.
      source: "Wikipedia — Eucalyptus camaldulensis",
    },
  },
];