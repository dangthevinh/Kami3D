/**
 * Story entries, as the timeline and the panel need them.
 *
 * D5 does not build a second timeline: `lib/timeline.ts` and `components/map/TimelinePanel.tsx`
 * already handle years, annotations and autoplay, and the phase brief is explicit that a story map
 * only changes the *source* of the entries. So this module turns a story into the shape the
 * timeline already understands, and adds the one thing a story has that a range event does not: an
 * image with its credit.
 *
 * Every image came from Wikimedia Commons through `scripts/fetch-stories.mjs`, which records the
 * file page, the author and the exact licence and refuses anything non-commercial or
 * no-derivatives. Share-alike is a condition of use, which is why the credit line is built here
 * rather than left to whoever renders the panel.
 *
 * Dependency-free, so `scripts/check-stories.mjs` can import it in plain Node.
 */

export interface StoryImage {
  url: string;
  pageUrl: string;
  width: number | null;
  /** `CC0`, `CC-BY`, `CC-BY-SA` - the values the parser accepts. */
  license: string;
  /** The label Commons gave it, kept verbatim so a credit quotes the real terms. */
  licenseLabel: string;
  author: string;
}

export interface Story {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  year: number;
  kind: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  searchTerm?: string;
  /**
   * A 3D model for the site, when one exists.
   *
   * Null for every entry today: this project has models of animals and none of heritage sites, and
   * putting a lion in a temple would be worse than an empty slot. The panel says so rather than
   * showing a button that does nothing.
   */
  modelUrl?: string | null;
}

export interface StoryFile {
  stories: Story[];
  images: Record<string, StoryImage>;
  attribution: string;
  license: string;
}

/** The licences an image may carry here, and the reason the list stops where it does. */
export const IMAGE_LICENSES = ["CC0", "CC-BY", "CC-BY-SA"] as const;

/** Years with a story, ascending and unique - the timeline's scale. */
export function storyYears(stories: readonly Story[]): number[] {
  return [...new Set(stories.map((story) => story.year))].sort((a, b) => a - b);
}

export function storyForYear(stories: readonly Story[], year: number): Story | null {
  return stories.find((story) => story.year === year) ?? null;
}

/** The nearest stories to a year, closest first, breaking ties by year. */
export function nearestStories(stories: readonly Story[], year: number, count = 2): Story[] {
  return [...stories]
    .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year) || a.year - b.year)
    .slice(0, count);
}

/**
 * The sentence to show for a year with no story.
 *
 * Same rule as the animal timeline: never an empty string, and never an implication that there is
 * something to see. The nearest stories are named so the visitor has somewhere to go.
 */
export function storyGapMessage(stories: readonly Story[], year: number): string {
  if (storyForYear(stories, year)) return "";

  const nearest = nearestStories(stories, year);
  if (nearest.length === 0) return "No story is recorded for this year.";

  return `No story for ${year} — the nearest are ${nearest.map((story) => story.year).join(" and ")}.`;
}

/**
 * A story, in the shape `TimelineEvent` already has.
 *
 * Structural on purpose: the timeline takes this interface, not this module, so a story map can
 * reuse the panel without either importing the other.
 */
export interface StoryTimelineEvent {
  id: string;
  year: number;
  title: string;
  summary: string;
  kind: string;
  slug: string;
  source: string;
  sourceUrl: string;
  attribution: string;
}

export function storyToTimelineEvent(story: Story, attribution: string): StoryTimelineEvent {
  return {
    id: story.slug,
    year: story.year,
    title: story.title,
    summary: story.summary,
    kind: story.kind,
    slug: story.slug,
    source: story.source,
    sourceUrl: story.sourceUrl,
    attribution,
  };
}

/** The credit line an image has to carry: author, licence, and where it came from. */
export function imageCredit(image: StoryImage): string {
  return `${image.author} · ${image.licenseLabel} · Wikimedia Commons`;
}

/** Whether a story has a 3D model to open, which decides if the button exists at all. */
export function hasModel(story: Story): boolean {
  return typeof story.modelUrl === "string" && story.modelUrl.length > 0;
}

/**
 * What is wrong with a story file, if anything.
 *
 * Run by the seeder and by `scripts/check-stories.mjs`: an entry with no source, an image under a
 * licence this site may not use, or coordinates outside the world are all refusals rather than
 * warnings, because a story map is a publication.
 */
export function validateStories(file: StoryFile): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();

  for (const story of file.stories ?? []) {
    if (slugs.has(story.slug)) problems.push(`duplicate slug ${story.slug}`);
    slugs.add(story.slug);

    if (!/^[a-z0-9-]{3,64}$/.test(story.slug)) problems.push(`${story.slug}: slug must be lower case with dashes`);
    if (!Number.isFinite(story.lat) || Math.abs(story.lat) > 90) problems.push(`${story.slug}: latitude out of range`);
    if (!Number.isFinite(story.lng) || Math.abs(story.lng) > 180) problems.push(`${story.slug}: longitude out of range`);
    if (!Number.isInteger(story.year)) problems.push(`${story.slug}: year must be an integer`);
    if (!story.summary || story.summary.length < 60) problems.push(`${story.slug}: the summary is too short to be a story`);
    if (!story.sourceUrl?.startsWith("http")) problems.push(`${story.slug}: no source URL`);

    const image = file.images?.[story.slug];
    if (!image) continue;
    if (!image.url.startsWith("http")) problems.push(`${story.slug}: the image URL is not a URL`);
    if (!(IMAGE_LICENSES as readonly string[]).includes(image.license)) {
      problems.push(`${story.slug}: image licence ${image.license} is not one this site may use`);
    }
    if (!image.author || image.author.length < 2) problems.push(`${story.slug}: the image has no author to credit`);
    if (!image.pageUrl?.includes("commons.wikimedia.org")) problems.push(`${story.slug}: the image has no Commons page`);
  }

  return problems;
}
