/**
 * Where a visitor came from, and which page they are on - as a pure function.
 *
 * This is the whole of the analytics Kami3D keeps, and it was written to be boring on purpose. Two
 * things it deliberately does not do:
 *
 *   1. **it does not identify anybody.** The input is a referrer, a fetch context and a user agent;
 *      the output is one of seven channel labels plus a normalised route. There is no visitor id to
 *      generate, because none is stored;
 *   2. **it does not keep what a person typed.** A search box can hold a name, so the search signal
 *      is "did it match a species" plus the slug it matched - never the term.
 *
 * Bots are their own channel: a crawler is not a reader, and mixing them into a percentage is how a
 * dashboard starts lying. `scripts/check-channel.mjs` pins every branch, including the two headers a
 * visitor can use to say no, DNT and Sec-GPC.
 */

export const CHANNELS = ["direct", "internal", "search", "social", "referral", "campaign", "bot"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Search engines, matched on the host, so a country domain counts too. */
const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "yahoo.", "yandex.", "baidu.", "ecosia.", "brave.", "qwant.", "startpage."];

/** Social networks and chat apps people click through from. */
const SOCIAL_HOSTS = [
  "facebook.", "instagram.", "threads.", "x.com", "twitter.", "t.co", "reddit.", "linkedin.",
  "tiktok.", "pinterest.", "youtube.", "youtu.be", "telegram.", "t.me", "discord.", "mastodon.", "bsky.",
];

/**
 * A user agent that is not a person.
 *
 * Deliberately conservative: a false positive hides a real reader from the numbers, while a false
 * negative only adds noise to the bot row.
 */
const BOT_PATTERN = /bot|crawler|spider|slurp|bingpreview|headless|lighthouse|monitor|preview|python-requests|python-urllib|curl\/|wget\/|axios\/|okhttp|go-http-client|facebookexternalhit|whatsapp|telegram|discordbot|semrush|ahrefs|mj12|dotbot|petalbot/i;

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  return BOT_PATTERN.test(userAgent ?? "");
}

/** The host part of a URL, lowercased, or null when it is not one. */
function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function hostMatches(host: string, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => host === candidate || host.endsWith(candidate) || host.includes(candidate));
}

/**
 * A campaign tag, kept only if it is a plausible slug.
 *
 * `utm_source` and `utm_campaign` are the one part of a query string worth keeping, and even then:
 * lowercased, stripped to `[a-z0-9-_]`, capped at 40 characters. Anything else is dropped rather than
 * stored - a campaign name is not a place to smuggle an email address into a table.
 */
export function campaignSlug(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return cleaned.length === 0 ? null : cleaned.slice(0, 40);
}

export interface ChannelInput {
  referer?: string | null;
  secFetchSite?: string | null;
  userAgent?: string | null;
  /** The host the request arrived on, so an internal referral is recognised as one. */
  host?: string | null;
  /** A `utm_source`/`utm_campaign` value, extracted from the query string by the caller. */
  campaign?: string | null;
}

/**
 * One label for one page view.
 *
 * The order is the point: a bot is a bot whatever it clicked; a campaign tag beats the referrer,
 * because that is what the tag is for; internal navigation is not an acquisition channel; and only
 * then does the referrer decide between search, social and referral. No referrer and no
 * `Sec-Fetch-Site` means direct, which is what a typed URL or a bookmark looks like.
 */
export function classifyChannel(input: ChannelInput): Channel {
  if (isBotUserAgent(input.userAgent)) return "bot";
  if (campaignSlug(input.campaign)) return "campaign";

  const site = (input.secFetchSite ?? "").trim().toLowerCase();
  const refererHost = hostOf(input.referer);
  const ownHost = (input.host ?? "").trim().toLowerCase();

  if (refererHost) {
    if (ownHost && refererHost === ownHost) return "internal";
    if (hostMatches(refererHost, SEARCH_HOSTS)) return "search";
    if (hostMatches(refererHost, SOCIAL_HOSTS)) return "social";
    return "referral";
  }

  // No referrer: same-origin means a client-side navigation, which is internal. Anything else is a
  // typed URL, a bookmark or a privacy-stripped referrer - and those are all honestly "direct".
  if (site === "same-origin" || site === "same-site") return "internal";
  return "direct";
}

/** The pages that get a row of their own; everything else collapses to its first segment. */
const KNOWN_ROUTES = ["explore", "quiz", "leaderboard", "about", "map", "settings", "profile", "sign-in", "sign-up"];

/**
 * A path, normalised to the shape of a page rather than the page itself.
 *
 * `/animal/lion` and `/animal/axolotl` are one row, because otherwise the table is a list of every
 * species with a count of one - and the query string is dropped entirely: it is where people put
 * things that are not mine to keep.
 */
export function routeClass(pathname: string): string {
  const withoutQuery = (pathname.split("?")[0] ?? "").split("#")[0] ?? "";
  const clean = withoutQuery.replace(/\/+$/, "") || "/";

  if (clean === "/") return "/";

  const segments = clean.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const second = segments[1];

  if (first === "animal") return second ? "/animal/[slug]" : "/animal";
  if (first === "data2map") return second ? "/data2map/[product]" : "/data2map";
  if (first === "admin") return second ? "/admin/[page]" : "/admin";
  if (segments.length === 1 && KNOWN_ROUTES.includes(first)) return "/" + first;

  return "/" + first;
}

/** True when the visitor has asked not to be counted, through either signal. */
export function honorsDoNotTrack(headers: { get(name: string): string | null }): boolean {
  return (headers.get("dnt") ?? "").trim() === "1" || (headers.get("sec-gpc") ?? "").trim() === "1";
}

/** Paths that are a page a person reads, rather than an asset or an API call. */
export function isPageRequest(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? "";
  if (path.startsWith("/_next") || path.startsWith("/api") || path.startsWith("/monitoring")) return false;
  return !/\.[a-z0-9]{2,5}$/i.test(path);
}

/** Whether a search found a species, without ever storing what was typed. */
export function searchOutcome(matchedSlug: string | null | undefined): { outcome: "matched" | "no_match"; slug: string } {
  const slug = (matchedSlug ?? "").trim().slice(0, 120);
  return slug.length > 0 ? { outcome: "matched", slug } : { outcome: "no_match", slug: "" };
}
