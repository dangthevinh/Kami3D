import { AlertTriangle, Check, Database, Download, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CancelOrderButton, OrderForm, PolicyForm } from "@/components/admin/ModelSourcingControls";
import { Badge } from "@/components/ui/badge";
import { adminStatus } from "@/lib/admin";
import { ALLOWED_LICENSES, evaluateBudget } from "@/lib/model-budget";
import {
  providersWithAvailability,
  readDownloadLog,
  readOrders,
  readPolicy,
  readUsage,
  refusedProviders,
} from "@/lib/model-sourcing";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Model sourcing",
  description: "Order 3D models from a provider registry, under a download budget the database enforces.",
  robots: { index: false, follow: false },
};

const MB = 1_048_576;
const mb = (bytes: number) => Math.round((bytes / MB) * 10) / 10 + " MB";

/**
 * The model sourcing console (Phase 18B).
 *
 * Ordering a model is a request; fetching one is a decision the database makes. Every download —
 * from this page, from the worker, from the CLI — passes through \`public.reserve_model_download()\`,
 * which holds an advisory lock, checks the policy against the log and writes the attempt in one
 * transaction. There is no flag anywhere that turns that off, which is why this page can be a
 * control panel instead of an enforcer.
 */
export default async function AdminModelsPage() {
  const status = await adminStatus();

  if (!status.admin) {
    return (
      <div className="section-shell py-16">
        <div className="glass mx-auto max-w-lg rounded-[var(--radius-card)] p-8 text-center">
          <ShieldCheck className="mx-auto size-6 text-solar" aria-hidden />
          <h1 className="mt-3 font-display text-xl font-semibold text-white">Admins only</h1>
          <p className="mt-2 text-sm text-white/55">
            {status.signedIn
              ? "This account is not on the admin list (app_admins)."
              : "Sign in with an admin account to order models."}
          </p>
          <p className="mt-4 text-xs text-white/35">
            {status.checked ? null : "The admin check could not reach the database, so it answered no."}
          </p>
        </div>
      </div>
    );
  }

  const [policy, usage, orders, log] = await Promise.all([readPolicy(), readUsage(), readOrders(), readDownloadLog()]);
  const providers = providersWithAvailability();
  const refused = refusedProviders();

  const decision = evaluateBudget({
    policy,
    usage,
    candidate: { provider: providers[0]?.id ?? "none", bytes: policy?.maxBytesPerModel ?? 0, license: "CC0" },
    approved: true,
  });
  const remainingToday = decision.remainingToday;

  const cards = [
    {
      label: "Today",
      value: usage ? formatCount(usage.today) + " / " + formatCount(policy?.maxPerDay ?? 0) : "—",
      hint: "downloads that spent budget since 00:00 UTC",
    },
    {
      label: "This month",
      value: usage ? formatCount(usage.thisMonth) + " / " + formatCount(policy?.maxPerMonth ?? 0) : "—",
      hint: "the same counter, over the calendar month",
    },
    {
      label: "Storage",
      value: usage ? mb(usage.bytesTotal) + " / " + mb(policy?.maxBytesTotal ?? 0) : "—",
      hint: "sum of the sizes recorded when each download was settled",
    },
    {
      label: "Refused",
      value: usage ? formatCount(usage.refused) : "—",
      hint: "attempts the budget turned down, each with its reason in the log below",
    },
  ];

  return (
    <div className="section-shell py-10">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-solar">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">Model sourcing</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Order models from a registry of free providers and the worker fetches them: DRACO-compressed,
          credited and wired to the species, so they appear on the site. What may be fetched is a budget,
          and the budget is enforced by the database — not by this page.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-[var(--radius-card)] p-4">
            <p className="text-[10px] uppercase tracking-wide text-white/40">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white/90">{card.value}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/35">{card.hint}</p>
          </div>
        ))}
      </section>

      {!policy ? (
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-solar/12 p-4 text-xs text-solar ring-1 ring-solar/25">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          No policy row yet. Apply the schema (npm run db:schema) and reload: until then every download is
          refused, which is the safe direction.
        </p>
      ) : (
        <p className="mt-4 text-xs text-white/45">
          {decision.allowed
            ? "The budget currently allows a download."
            : "The budget currently refuses downloads: " + decision.reason}
          {" "}
          A licence outside {ALLOWED_LICENSES.join(" / ")} is refused whatever the budget says.
        </p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">Download budget</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Saved to model_download_policy and read by public.reserve_model_download() on every attempt.
            Changing a number here changes what the CLI may do — nothing else needs to know.
          </p>
          <div className="mt-4">
            {policy ? <PolicyForm policy={policy} providers={providers} /> : null}
          </div>
          {policy?.updatedAt ? (
            <p className="mt-3 text-[11px] text-white/35">
              Last changed {policy.updatedAt.slice(0, 16).replace("T", " ")} UTC by {policy.updatedBy ?? "unknown"}.
            </p>
          ) : null}
        </section>

        <section className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">Order models</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            An order is a request. The worker claims it, and it fetches each model through the same CLI
            path used by hand — so the licence check, the DRACO step, the attribution file and the budget
            all apply, and there is no second route into the repository.
          </p>
          <div className="mt-4">
            <OrderForm
              providers={providers}
              slugs={[]}
              remainingToday={Math.max(0, remainingToday)}
            />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">
            "Run now" starts npm run models:work as a child process. On a host without child processes,
            queue the order and run that command on a schedule instead — the budget makes a cron safe.
          </p>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">Orders</h2>
        <p className="mt-1 text-xs text-white/45">
          Newest first. Counters are written after every species, so an interrupted run leaves an honest
          partial order rather than a stuck one.
        </p>
        {orders.length === 0 ? (
          <p className="mt-4 text-xs text-white/40">No orders yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {orders.map((order) => (
              <li key={order.id} className="glass flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] p-3 text-xs">
                <Badge
                  variant={
                    order.status === "done" ? "neon" : order.status === "failed" ? "solar" : order.status === "running" ? "iris" : "outline"
                  }
                >
                  {order.status}
                </Badge>
                <span className="tabular-nums text-white/80">
                  {order.downloaded}/{order.requested} downloaded
                </span>
                <span className="tabular-nums text-white/45">{order.refused} refused</span>
                <span className="tabular-nums text-white/45">{order.failed} failed</span>
                <span className="text-white/45">{order.providers.join(", ")}</span>
                {order.slugs.length > 0 ? (
                  <span className="truncate text-white/45">{order.slugs.join(", ")}</span>
                ) : (
                  <span className="text-white/35">every species without a model</span>
                )}
                <span className="ml-auto text-white/35">
                  {order.createdAt.slice(0, 16).replace("T", " ")} · {order.createdBy}
                </span>
                {order.status === "queued" ? <CancelOrderButton id={order.id} /> : null}
                {order.lastError ? (
                  <span className="w-full text-[11px] text-solar/80">{order.lastError}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">Download log</h2>
        <p className="mt-1 text-xs text-white/45">
          Every attempt, including every refusal, with the reason. This is what the budget counts and what
          answers "why did nothing download today".
        </p>
        {log.length === 0 ? (
          <p className="mt-4 text-xs text-white/40">Nothing has been attempted yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-white/40">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Outcome</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">Species</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {log.map((row) => (
                  <tr key={row.id} className="border-t border-white/6">
                    <td className="py-2 pr-3 whitespace-nowrap text-white/50">{row.at.slice(0, 16).replace("T", " ")}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          row.outcome === "downloaded" ? "text-neon" : row.outcome === "refused" ? "text-solar" : "text-white/50",
                        )}
                      >
                        {row.outcome === "downloaded" ? <Check className="size-3" aria-hidden /> : null}
                        {row.outcome}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{row.provider}</td>
                    <td className="py-2 pr-3 max-w-[220px] truncate" title={row.title ?? ""}>
                      {row.title ?? "—"}
                      {row.license ? <span className="text-white/35"> · {row.license}</span> : null}
                    </td>
                    <td className="py-2 pr-3">{row.animalSlug ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.bytes ? mb(row.bytes) : "—"}</td>
                    <td className="py-2 pr-3 truncate">{row.actor ?? "cli"}</td>
                    <td className="py-2 text-white/45">{row.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-white">
            <Database className="size-4 text-neon/80" aria-hidden />
            Providers
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Three of these need no token at all, which is deliberate: a fresh clone can still find and
            fetch a redistributable model.
          </p>
          <ul className="mt-4 space-y-2 text-xs">
            {providers.map((provider) => (
              <li key={provider.id} className="rounded-lg bg-white/4 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={provider.homepage} className="text-white/85 underline decoration-white/20 underline-offset-2" target="_blank" rel="noreferrer noopener">
                    {provider.label}
                  </a>
                  <Badge variant={provider.configured ? "neon" : "outline"}>
                    {provider.keyless ? "no key needed" : provider.configured ? "token found" : "no token"}
                  </Badge>
                  <span className="text-white/40">{provider.license}</span>
                </div>
                <p className="mt-1 leading-relaxed text-white/40">{provider.note}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">What this cannot do</h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/50">
            <li className="flex gap-2">
              <Download className="mt-0.5 size-3.5 shrink-0 text-neon/70" aria-hidden />
              Fetch a model whose licence is not CC0 or CC BY. The allow-list is applied before the
              download and again inside the database, and the refusal is logged with its reason.
            </li>
            <li className="flex gap-2">
              <Download className="mt-0.5 size-3.5 shrink-0 text-neon/70" aria-hidden />
              Publish without a credit: attribution is written to data/model-attribution.json before a
              model can be wired to a species, and the species page renders it.
            </li>
            <li className="flex gap-2">
              <Download className="mt-0.5 size-3.5 shrink-0 text-neon/70" aria-hidden />
              Outrun the budget from the command line. The CLI reserves through the same function this page
              writes to, so \`--apply\` is refused exactly like a button is, with the same reason.
            </li>
            <li className="flex gap-2">
              <Download className="mt-0.5 size-3.5 shrink-0 text-neon/70" aria-hidden />
              Batch-fetch without a person: while require_approval is on, an order carries the admin who
              placed it and every attempt is logged against them.
            </li>
          </ul>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-white/45">Refused sources</h3>
          <ul className="mt-2 space-y-1 text-[11px] text-white/40">
            {refused.map((entry) => (
              <li key={entry.id}>
                <span className="text-white/60">{entry.id}</span> — {entry.reason}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-white/35">
            Other admin surfaces:{" "}
            <Link href="/admin/analytics" className="underline decoration-white/20 underline-offset-2">
              Channel analytics
            </Link>
            {" · "}
            <Link href="/admin/geodata" className="underline decoration-white/20 underline-offset-2">
              Geodata
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
