import { PageSkeleton } from "@/components/layout/PageSkeleton";

/** This route renders on demand, so it is one of the few that can actually wait. */
export default function Loading() {
  return <PageSkeleton rows={4} />;
}
