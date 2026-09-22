/**
 * The grey bars a dynamic route shows while the server answers.
 *
 * It lives in one component and is mounted by the four routes that can actually wait -
 * `/map`, `/settings`, `/profile` and `/admin` - rather than by a root `app/loading.tsx`. That
 * distinction was measured, not assumed: a root boundary joined the shared chunk of **every** route,
 * including the twenty-four statically generated species pages that can never show it, and cost about
 * five kilobytes of first-load JavaScript across the site for a screen most visitors never see.
 *
 * Nothing here imports a component library: a skeleton that needs the design system to draw a grey
 * rectangle is a skeleton that costs more than the page it stands in for.
 */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="section-shell py-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-8 w-72 animate-pulse rounded-full bg-white/8" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="glass h-40 animate-pulse rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
