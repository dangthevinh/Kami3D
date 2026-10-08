import { PageSkeleton } from "@/components/layout/PageSkeleton";

/**
 * The studio's own loading state, and nothing above it.
 *
 * `app/loading.tsx` would join the shared chunk of every route in the product (the comment in
 * `PageSkeleton` records the ~5 kB that cost); this boundary covers the studio's pages, which are the
 * only ones that can wait on a first paint here.
 */
export default function Loading() {
  return <PageSkeleton rows={3} />;
}
