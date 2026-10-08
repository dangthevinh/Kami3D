/**
 * The studio's one door to `/api/manga/*`.
 *
 * Every client component in this directory goes through here rather than calling `fetch` directly,
 * for one reason: **a failure has to be a sentence on the screen**. The route half is written by
 * another agent, and it can answer 401 (no session), 404 (a build without the manga routes yet),
 * 429 (the rate limiter) or 503 (the AI provider is not configured, with the reason in the body).
 * Each of those has a different thing to say to a person, and `messageFor` is the only place that
 * decides which sentence it is.
 *
 * Nothing here throws a bare `Error`: the thrown value is always a `MangaRequestError` whose
 * `message` is safe to render verbatim.
 */

export class MangaRequestError extends Error {
  /** The HTTP status, or 0 when the request never reached the server. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MangaRequestError";
    this.status = status;
  }
}

/** The message a person should read, given whatever the API sent back. */
function messageFor(payload: unknown, status: number): string {
  const body = payload as { error?: unknown } | null;
  const fromServer = body && typeof body.error === "string" && body.error.trim().length > 0 ? body.error.trim() : null;

  // The server's own words come first: for the AI route that is the sentence explaining *which*
  // environment variable is missing, and replacing it with a generic string would hide the point.
  if (fromServer) return fromServer;

  if (status === 401) return "Sign in to do that: the studio keeps every project tied to an account.";
  if (status === 403) return "That belongs to another account, so it cannot be changed from here.";
  if (status === 404) return "The manga API answered 404 — this build has no /api/manga routes yet.";
  if (status === 429) return "Too many requests just now. Wait a moment and try again.";
  if (status === 503) return "The studio is not configured for that yet (HTTP 503).";
  if (status >= 500) return "The studio hit a server error (HTTP " + status + "). Trying again fixes it more often than not.";
  return "The request was refused (HTTP " + status + ").";
}

export interface MangaRequestOptions extends Omit<RequestInit, "body"> {
  /** Serialised as JSON. FormData is passed through untouched, for panel uploads. */
  body?: unknown;
}

export async function mangaRequest<T>(path: string, options: MangaRequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const sent = new Headers(headers);
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    // No content-type: the browser has to write the multipart boundary itself.
    payload = body;
  } else if (typeof body !== "undefined") {
    sent.set("content-type", "application/json");
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(path, { ...rest, body: payload, headers: sent, cache: "no-store" });
  } catch {
    throw new MangaRequestError(
      "The studio API could not be reached from this browser. Nothing was saved.",
      0,
    );
  }

  // A 204, an HTML error page from a proxy and a real JSON body all have to be survivable.
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new MangaRequestError(messageFor(data, response.status), response.status);

  return data as T;
}

/** The displayable sentence for anything thrown by `mangaRequest`. */
export function errorText(error: unknown): string {
  if (error instanceof MangaRequestError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong, and the studio has no more detail than that.";
}

/**
 * True when the studio has no data *because the API is not there*, as opposed to being empty.
 *
 * The difference matters in Demo Mode: an empty project list is the normal state of a new account,
 * and a 404 means this deployment has no studio routes at all. They need different copy.
 */
export function isMissingApi(error: unknown): boolean {
  return error instanceof MangaRequestError && (error.status === 404 || error.status === 0);
}
