/**
 * Who may see Data2Map while it is not public, and how the answer is published.
 *
 * Data2Map is finished but not launched: the module is hidden from visitors and reachable by the
 * people building it. That is a **temporary deployment decision**, not a security model, and the
 * shape of this file says so - the gate itself lives in `middleware.ts` and runs on every request,
 * while everything here is either a constant or a pure function the client can also use.
 *
 * Two switches exist, and neither is a claim about the other:
 *
 *   1. **`NEXT_PUBLIC_DATA2MAP_PUBLIC=1`** turns the module public again, for everybody, at build
 *      time. It is the switch to flip on launch day, and the one a preview build uses.
 *   2. **Development builds show it.** `npm run dev` is where the module is written, so hiding it
 *      there would only teach people to work around the gate.
 *
 * Everyone else - a signed-in visitor included - gets a 404 from the middleware. Admins are named in
 * `DATA2MAP_ADMIN_IDS` / `DATA2MAP_ADMIN_EMAILS`, and a row in `public.app_admins` (the table
 * `/admin/geodata` already uses) is checked against the **verified** session id, because under Clerk
 * the database cannot yet see the Clerk identity on its own - that is the P0.1 item in docs/REVIEW.md.
 */

/** The module and its API, which are hidden together: a page nobody can open needs no endpoints. */
export const DATA2MAP_PREFIX = "/data2map";
export const DATA2MAP_API_PREFIX = "/api/data2map";

/** True when the module is public: the launch switch, or a development build. */
export function data2mapIsPublic(): boolean {
  if ((process.env.NEXT_PUBLIC_DATA2MAP_PUBLIC ?? "").trim() === "1") return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Is this request inside the module?
 *
 * Matched on path segments rather than a prefix, so `/data2mapx` is somebody else's route and
 * `/data2map.json` is not smuggled past the gate by a string comparison.
 */
export function isData2MapPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "");
  return (
    path === DATA2MAP_PREFIX ||
    path.startsWith(DATA2MAP_PREFIX + "/") ||
    path === DATA2MAP_API_PREFIX ||
    path.startsWith(DATA2MAP_API_PREFIX + "/")
  );
}

/**
 * The database's opinion on a **verified** session id.
 *
 * `public.app_admins` is the table `/admin/geodata` already gates on, and its own `is_admin()` reads
 * the identity from the JWT - which under Clerk is the service role's, not the visitor's, because
 * Clerk is not yet a Supabase third-party auth provider (P0.1 in docs/REVIEW.md). Asking the table
 * directly with the service role and the id the session middleware already verified is the honest
 * equivalent today, and it switches to `is_admin()` the day P0.1 lands.
 *
 * A database that cannot be reached denies: this gate fails closed.
 */
export async function isDatabaseAdmin(userId: string | null | undefined): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const id = (userId ?? "").trim();
  if (!url || !key || id.length === 0) return false;

  try {
    const response = await fetch(
      url + "/rest/v1/app_admins?select=user_id&user_id=eq." + encodeURIComponent(id) + "&limit=1",
      { headers: { apikey: key, authorization: "Bearer " + key }, cache: "no-store" },
    );
    if (!response.ok) return false;
    const rows = (await response.json()) as unknown;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/** A comma-separated env var into a comparable list. */
export function parseIdentityList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/** True when the session matches either allow-list. Cheap, and checked before the database. */
export function identityListed(identity: { userId?: string | null; email?: string | null }): boolean {
  const ids = parseIdentityList(process.env.DATA2MAP_ADMIN_IDS);
  const emails = parseIdentityList(process.env.DATA2MAP_ADMIN_EMAILS);

  const id = (identity.userId ?? "").trim().toLowerCase();
  const email = (identity.email ?? "").trim().toLowerCase();

  return (id.length > 0 && ids.includes(id)) || (email.length > 0 && emails.includes(email));
}

