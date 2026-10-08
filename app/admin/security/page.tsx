import type { Metadata } from "next";
import Link from "next/link";

import { adminStatus } from "@/lib/admin";
import { SECURITY_EVENT_KINDS, recentSecurityEvents } from "@/lib/security-log";

/**
 * `/admin/security` — the monitoring half of requirement 6 of the phase brief.
 *
 * The events are written by the guards themselves (`lib/write-guard.ts`, the admin gate, and the
 * payment webhook in Phase 32), so this page is a **read** of what the app already refused or allowed.
 * It says three things plainly, and none of them is a dashboard:
 *
 *   1. which kinds of event exist at all, so an empty page is not mistaken for a missing feature;
 *   2. what was recorded, newest first, with the address **redacted to a network prefix** — the stored
 *      row never held the host, so this page cannot leak what the log did not keep;
 *   3. what the log is **not** (no bodies, no tokens, one process, 90 days) rather than letting a green
 *      table imply more than it proves.
 *
 * The middleware already refuses a non-admin before this file runs (Phase 31); the `adminStatus()` check
 * below is the second line, the same way every other console page is built.
 */

export const metadata: Metadata = {
  title: "Security log",
  description: "Refusals and notable security events recorded by Kami3D.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** One line per event, in UTC, so two servers in two zones read the same log the same way. */
function stamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

export default async function AdminSecurityPage() {
  const status = await adminStatus();

  if (!status.admin) {
    return (
      <div className="section-shell py-14">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Security log</h1>
        <div className="glass mt-5 max-w-2xl rounded-[var(--radius-card)] p-5 text-sm leading-relaxed text-white/60">
          <p>
            {status.signedIn
              ? "This account is not an admin. Access is a row in public.app_admins, checked by public.is_admin()."
              : "Sign in as an admin first. The console is refused by the middleware before this page runs."}
          </p>
        </div>
        <Link href="/" className="mt-5 inline-block text-xs text-neon hover:text-white">
          ← Back to Kami3D
        </Link>
      </div>
    );
  }

  const events = await recentSecurityEvents(100);
  const byKind = new Map<string, number>();
  for (const event of events) byKind.set(event.kind, (byKind.get(event.kind) ?? 0) + 1);

  return (
    <div className="section-shell py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-solar">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">Security log</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          What the app refused, and what it let through: a cross-site write, a rate limit, an admin route
          reached by someone who is not an admin. {" "}
          <Link href="/admin/analytics" className="text-neon hover:text-white">
            Channel analytics
          </Link>{" "}
          answers "how many people read this"; this page answers "did anybody try the door".
        </p>
      </header>

      {events.length === 0 ? (
        <div className="glass mt-6 max-w-2xl rounded-[var(--radius-card)] p-5 text-sm leading-relaxed text-white/60">
          <p className="text-white/80">Nothing recorded in the last 100 events.</p>
          <p className="mt-2">
            An empty log is the normal state of a quiet deployment, not a broken one: rows are written when
            a guard refuses something ({SECURITY_EVENT_KINDS.join(", ")}).
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 flex flex-wrap gap-2 text-xs">
            {[...byKind.entries()].map(([kind, count]) => (
              <li key={kind} className="glass rounded-full px-3 py-1 text-white/70">
                {kind} · <span className="text-white">{count}</span>
              </li>
            ))}
          </ul>

          <div className="glass mt-5 overflow-x-auto rounded-[var(--radius-card)]">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead className="text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Network</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-white/10">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-white/50">{stamp(event.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-white/85">{event.kind}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{event.route ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{event.actor_id ?? "guest"}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{event.address_prefix ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">
                      {Object.keys(event.detail ?? {}).length > 0 ? JSON.stringify(event.detail) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section className="glass mt-6 max-w-2xl rounded-[var(--radius-card)] p-5 text-xs leading-relaxed text-white/55">
        <h2 className="text-sm font-semibold text-white/80">What this log is not</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            It holds no request body, no token and no query string: a value longer than 200 characters, or
            anything that is not a short string, number or boolean, is dropped rather than stored.
          </li>
          <li>
            An address is stored as a /24 (IPv4) or /48 (IPv6) prefix. "The same network tried 200 times" is
            what an investigation needs; the host is personal data a log should not keep.
          </li>
          <li>
            Writes are throttled to one row per kind and network per minute, in process, so a flood cannot
            turn the log into the outage — and that also means a determined attacker's events are sampled,
            not complete.
          </li>
          <li>
            Rows are kept 90 days by convention, pruned by hand:{" "}
            <code className="text-white/70">delete from public.security_events where created_at &lt; now() - interval &apos;90 days&apos;;</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
