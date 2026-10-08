// Relative with the extension, like every other `lib` module that a check suite imports directly:
// `scripts/check-coming-soon.mjs` runs the path matchers under plain Node, and `@/` means nothing there.
import { data2mapIsPublic, isData2MapPath } from "./data2map-access.ts";

/**
 * The modules that are built but **not launched yet**.
 *
 * Each one is drawn in the navbar for everybody, greyed out and labelled "Coming soon", and only the
 * people working on it can open it. That is a deliberate change from how Data2Map was hidden before:
 * a link that vanishes teaches a visitor nothing, while a link that says "not yet" answers the
 * question they were about to ask. It also means the answer is the same in the navbar and in the
 * middleware, because both read this list.
 *
 * The list is not a security boundary by itself - a greyed-out link is a courtesy, not a lock - which
 * is why every module here is also gated in `middleware.ts`, on every request, including its API.
 * A disabled button and an unreachable route are two different jobs.
 *
 * Opening one is a one-line change:
 *
 *   NEXT_PUBLIC_DATA2MAP_PUBLIC=1     Data2Map, for everybody
 *   NEXT_PUBLIC_MANGA_PUBLIC=1        Manga Studio, for everybody
 *
 * and `npm run dev` opens both, because a module is written in development and hiding it there only
 * teaches people to work around the gate.
 */

export const DATA2MAP_PREFIX = "/data2map";
export const MANGA_PREFIX = "/manga-studio";
export const MANGA_API_PREFIX = "/api/manga";

/** True when Manga Studio is open to everybody: the launch switch, or a development build. */
export function mangaStudioIsPublic(): boolean {
  if ((process.env.NEXT_PUBLIC_MANGA_PUBLIC ?? "").trim() === "1") return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Is this request inside Manga Studio?
 *
 * Matched on path segments rather than a prefix, so `/manga-studiox` is somebody else's route and
 * `/manga-studio.json` is not smuggled past the gate by a string comparison - the same rule
 * `isData2MapPath` follows, and for the same reason.
 */
export function isMangaStudioPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "");
  return (
    path === MANGA_PREFIX ||
    path.startsWith(MANGA_PREFIX + "/") ||
    path === MANGA_API_PREFIX ||
    path.startsWith(MANGA_API_PREFIX + "/")
  );
}

export interface ComingSoonModule {
  id: string;
  /** Where the navbar points, and what it looks up in the access answer. */
  href: string;
  label: string;
  /** The environment variable that opens it to everyone, printed in the logs and the docs. */
  launchSwitch: string;
  /** True when the module is open to everybody. */
  isOpen: () => boolean;
  /** True when the path belongs to the module. */
  owns: (pathname: string) => boolean;
}

export const COMING_SOON_MODULES: readonly ComingSoonModule[] = [
  {
    id: "data2map",
    href: DATA2MAP_PREFIX,
    label: "Data2Map",
    launchSwitch: "NEXT_PUBLIC_DATA2MAP_PUBLIC",
    isOpen: data2mapIsPublic,
    owns: isData2MapPath,
  },
  {
    id: "manga-studio",
    href: MANGA_PREFIX,
    label: "Manga Studio",
    launchSwitch: "NEXT_PUBLIC_MANGA_PUBLIC",
    isOpen: mangaStudioIsPublic,
    owns: isMangaStudioPath,
  },
];

/** The module a path belongs to, or null for every other route on the site. */
export function comingSoonFor(pathname: string): ComingSoonModule | null {
  return COMING_SOON_MODULES.find((module) => module.owns(pathname)) ?? null;
}

/** True for any path this gate covers - the middleware's one question. */
export function isComingSoonPath(pathname: string): boolean {
  return comingSoonFor(pathname) !== null;
}

/** The module with this id, for the access probe and the navbar. */
export function comingSoonById(id: string): ComingSoonModule | null {
  return COMING_SOON_MODULES.find((module) => module.id === id) ?? null;
}
