"use client";

import * as React from "react";

import { MangaRequestError, errorText, mangaRequest } from "@/components/manga-studio/api";

/**
 * Read one studio resource, and say out loud what went wrong when it cannot be read.
 *
 * Every data-bearing screen in the studio is a client component that asks the API for its own rows
 * (`/api/manga/*`), because that is what keeps the heavy clients - Clerk's and Supabase's - out of
 * the first paint: the session lives in a cookie the server already read, and nothing here imports an
 * auth SDK. The trade is that a screen can fail *after* it rendered, which is exactly why the state
 * machine below has an `error` arm instead of a silent empty list.
 */

export type MangaQueryStatus = "loading" | "ready" | "error";

export interface MangaQuery<T> {
  status: MangaQueryStatus;
  data: T | null;
  /** The sentence to show when `status` is "error". */
  error: string | null;
  /** True when the failure was "this API does not exist" rather than "this account is empty". */
  missingApi: boolean;
  reload: () => void;
}

export function useMangaQuery<T>(path: string | null): MangaQuery<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [status, setStatus] = React.useState<MangaQueryStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [missingApi, setMissingApi] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    if (!path) {
      setStatus("ready");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    void (async () => {
      try {
        const payload = await mangaRequest<T>(path);
        if (cancelled) return;
        setData(payload);
        setMissingApi(false);
        setStatus("ready");
      } catch (caught) {
        if (cancelled) return;
        setError(errorText(caught));
        setMissingApi(caught instanceof MangaRequestError && (caught.status === 404 || caught.status === 0));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  const reload = React.useCallback(() => setNonce((value) => value + 1), []);

  return { status, data, error, missingApi, reload };
}
