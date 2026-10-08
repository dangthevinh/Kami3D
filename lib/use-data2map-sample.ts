"use client";

import * as React from "react";

/**
 * One Data2Map sample, fetched once.
 *
 * The product pages used to take their sample as a prop from a server component that imported the
 * JSON at build time. They now fetch it from `/api/data2map/sample/[dataset]`, which is what took
 * 430 kB of GeoJSON out of the build's module graph and out of the prerendered HTML - see
 * `lib/data2map/sample-source.ts` for the numbers and for what the change costs.
 *
 * What it costs, stated plainly: the page shell arrives first and the sample a moment later, so the
 * summary sentence that used to be in the static HTML is drawn by the loader instead. The maps
 * themselves never were in the HTML - every renderer is behind `next/dynamic ssr: false` - so
 * nothing a crawler could read has been lost except that one line.
 *
 * The hook is deliberately dull: one request, no retry, no polling, and a state that always has an
 * answer for "what do I draw right now". A failure is carried as text, because the alternative -
 * a spinner that never resolves - is the thing this project writes against.
 */

export interface Data2MapSampleState<T> {
  sample: T | null;
  loading: boolean;
  error: string | null;
}

export function useData2MapSample<T>(dataset: string): Data2MapSampleState<T> {
  const [state, setState] = React.useState<Data2MapSampleState<T>>({ sample: null, loading: true, error: null });

  React.useEffect(() => {
    let live = true;

    const load = async () => {
      try {
        const response = await fetch("/api/data2map/sample/" + dataset, { headers: { accept: "application/json" } });
        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
              ? (body as { error: string }).error
              : "the sample request answered " + response.status;
          if (live) setState({ sample: null, loading: false, error: message });
          return;
        }

        if (live) setState({ sample: body as T, loading: false, error: null });
      } catch (error) {
        if (live) setState({ sample: null, loading: false, error: "the sample could not be fetched (" + String(error) + ")" });
      }
    };

    void load();
    return () => {
      live = false;
    };
  }, [dataset]);

  return state;
}
