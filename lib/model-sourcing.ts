import "server-only";

import providerData from "@/data/model-providers.json";
import type { DownloadPolicy, DownloadUsage } from "@/lib/model-budget";
import { policyFromJson, usageFromJson } from "@/lib/model-budget";
import { getPersonalDataClient } from "@/lib/personal-data";
import { TABLES } from "@/lib/supabase";

/**
 * The provider registry, as data.
 *
 * It lives in data/model-providers.json rather than in the CLI because the console and the worker
 * need it too, and because a page should not import a script that starts child processes. The
 * implementations stay in scripts/fetch-models.mjs; `npm run check:model-budget` asserts that this
 * file and those implementations still describe the same seven providers.
 */
export interface ProviderRow {
  id: string;
  label: string;
  homepage: string;
  keyless: boolean;
  needsKey: string | null;
  license: string;
  kind: string;
  note: string;
  /** False when the provider needs a token this deployment does not have. */
  configured: boolean;
}

/**
 * The model-sourcing console's data access.
 *
 * Reads are admin-only in SQL too (RLS on the three tables), and writes go through the service role
 * after the route has checked \`is_admin()\` — the same shape as every other admin write in this
 * project, and the reason the console cannot be driven by a signed-in visitor.
 */

export interface PolicyRow extends DownloadPolicy {
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface DownloadLogRow {
  id: string;
  at: string;
  actor: string | null;
  provider: string;
  providerId: string | null;
  title: string | null;
  license: string | null;
  bytes: number | null;
  animalSlug: string | null;
  outcome: "downloaded" | "refused" | "failed";
  reason: string | null;
  orderId: string | null;
}

export interface OrderRow {
  id: string;
  createdAt: string;
  createdBy: string;
  status: "queued" | "running" | "done" | "cancelled" | "failed";
  providers: string[];
  slugs: string[];
  requested: number;
  note: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  downloaded: number;
  refused: number;
  failed: number;
  lastError: string | null;
}

async function client() {
  const supabase = await getPersonalDataClient();
  if (!supabase) throw new Error("no data client: the admin console needs Supabase configured");
  return supabase;
}

export async function readPolicy(): Promise<PolicyRow | null> {
  const supabase = await client();
  const { data, error } = await supabase.from("model_download_policy").select("*").eq("id", "default").maybeSingle();
  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const base = policyFromJson(row);
  if (!base) return null;
  return {
    ...base,
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function readUsage(): Promise<UsageWithCounts | null> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("model_download_usage");
  if (error || !data) return null;
  const usage = usageFromJson(data);
  if (!usage) return null;
  const refused = typeof (data as Record<string, unknown>).refused === "number" ? ((data as Record<string, unknown>).refused as number) : 0;
  const failed = typeof (data as Record<string, unknown>).failed === "number" ? ((data as Record<string, unknown>).failed as number) : 0;
  return { ...usage, refused, failed };
}

export async function readOrders(limit = 12): Promise<OrderRow[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("model_source_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
    status: row.status as OrderRow["status"],
    providers: Array.isArray(row.providers) ? (row.providers as string[]) : [],
    slugs: Array.isArray(row.slugs) ? (row.slugs as string[]) : [],
    requested: Number(row.requested ?? 0),
    note: typeof row.note === "string" ? row.note : null,
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    finishedAt: typeof row.finished_at === "string" ? row.finished_at : null,
    downloaded: Number(row.downloaded ?? 0),
    refused: Number(row.refused ?? 0),
    failed: Number(row.failed ?? 0),
    lastError: typeof row.last_error === "string" ? row.last_error : null,
  }));
}

export async function readDownloadLog(limit = 25): Promise<DownloadLogRow[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("model_download_log")
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    at: String(row.at),
    actor: typeof row.actor === "string" ? row.actor : null,
    provider: String(row.provider),
    providerId: typeof row.provider_id === "string" ? row.provider_id : null,
    title: typeof row.title === "string" ? row.title : null,
    license: typeof row.license === "string" ? row.license : null,
    bytes: typeof row.bytes === "number" ? row.bytes : null,
    animalSlug: typeof row.animal_slug === "string" ? row.animal_slug : null,
    outcome: row.outcome as DownloadLogRow["outcome"],
    reason: typeof row.reason === "string" ? row.reason : null,
    orderId: typeof row.order_id === "string" ? row.order_id : null,
  }));
}

/**
 * The provider registry, plus whether this deployment can use each provider.
 *
 * The console prints this so an admin sees "Sketchfab is off: no SKETCHFAB_API_TOKEN" rather than a
 * button that fails. Only the boolean leaves the server; the token never does.
 */
export function providersWithAvailability(env: Record<string, string | undefined> = process.env): ProviderRow[] {
  const providers = (providerData as { providers: Omit<ProviderRow, "configured">[] }).providers;
  return providers.map((provider) => ({
    ...provider,
    configured: provider.needsKey ? Boolean(env[provider.needsKey]) : true,
  }));
}

export function refusedProviders(): { id: string; reason: string }[] {
  return (providerData as { refused: { id: string; reason: string }[] }).refused;
}

/** The usage numbers plus the two counts the console shows beside them. */
export interface UsageWithCounts extends DownloadUsage {
  refused: number;
  failed: number;
}

export { TABLES };
