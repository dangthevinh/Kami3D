/**
 * The order runner: what an admin's order actually executes.
 *
 * The console writes a row into model_source_orders and this claims it, one order at a time. It does
 * not download anything itself — it runs scripts/fetch-models.mjs once per species, the same pipeline
 * the CLI has always used. That is the whole design: **reuse, do not fork**, so the licence
 * allow-list, the DRACO step, the attribution manifest, the model_url wiring and the download budget
 * keep working exactly as they do by hand, and there is no second path into the repository that a
 * rule could be missing from.
 *
 *   npm run models:work                  # run the oldest queued order
 *   npm run models:work -- --list        # show the queue
 *   npm run models:work -- --order=<id>  # run one specific order
 *   npm run models:work -- --upload      # also push to Supabase Storage
 *
 * The budget is not consulted here either: the CLI reserves every model against
 * public.reserve_model_download() before downloading it, so a batch that runs out of budget stops
 * with a reason in the log rather than an exception.
 */

import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { ANIMALS } from "../data/animals.ts";
import { loadEnvFiles, rest, supabaseConfig } from "./fetch-models.mjs";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FETCH = join(ROOT, "scripts", "fetch-models.mjs");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const found = args.find((arg) => arg.startsWith(name + "="));
  return found ? found.slice(name.length + 1) : null;
};

// The CLI loads .env.local in main(); a worker has to do it for itself.
await loadEnvFiles();

const supabase = supabaseConfig();
if (!supabase) {
  console.error("Model orders need Supabase: the download budget lives in the database (docs/MODELS.md).");
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then: npm run db:schema");
  process.exit(1);
}

const api = (path, init) => rest(supabase, path, init);
const now = () => new Date().toISOString();

const ORDER_COLUMNS =
  "id,status,requested,providers,slugs,created_by,created_at,downloaded,refused,failed,last_error";

async function listOrders() {
  const rows = await api(
    "model_source_orders?select=" + ORDER_COLUMNS + "&order=created_at.desc&limit=20",
  );
  if (rows.length === 0) {
    console.log("No orders yet. Create one at /admin/models.");
    return;
  }
  for (const row of rows) {
    console.log(
      row.status.padEnd(9) +
        " " +
        row.id.slice(0, 8) +
        "  asked " + row.requested +
        "  done " + row.downloaded +
        "  refused " + row.refused +
        "  failed " + row.failed +
        "  " + row.created_at.slice(0, 16) +
        "  by " + row.created_by,
    );
    if (row.last_error) console.log("   last error: " + row.last_error);
  }
}

/**
 * Claim one order.
 *
 * The claim is optimistic: update the row *while it is still queued*, and take it only if the update
 * returned it. Two workers started at the same time therefore cannot both run the same order.
 */
async function claimOrder(preferredId) {
  const query = preferredId
    ? "model_source_orders?select=id&id=eq." + preferredId + "&status=eq.queued"
    : "model_source_orders?select=id&status=eq.queued&order=created_at.asc&limit=1";

  const [candidate] = await api(query);
  if (!candidate) return null;

  const claimed = await api("model_source_orders?id=eq." + candidate.id + "&status=eq.queued", {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify({ status: "running", started_at: now(), last_error: null }),
  });

  return claimed[0] ?? null;
}

/** Species with no model yet, in catalogue order. */
function missingSpecies() {
  return ANIMALS.filter((animal) => !animal.model_url).map((animal) => animal.slug);
}

/**
 * The species an order covers.
 *
 * An order that **names** species means those species, whether or not they already have a model —
 * ordering a model for a species is also how an admin replaces a poor one. An order that names
 * none is the generic "fill the gaps" batch, and for that only species with no model at all are
 * candidates, because fetching a second model for a species that already has one is not a gap.
 */
function speciesFor(order) {
  const named = Array.isArray(order.slugs) ? order.slugs.filter(Boolean) : [];
  const catalogue = new Map(ANIMALS.map((animal) => [animal.slug, animal]));

  if (named.length > 0) return named.map((slug) => catalogue.get(slug)).filter(Boolean);
  return missingSpecies().map((slug) => catalogue.get(slug)).filter(Boolean);
}

/**
 * Run the pipeline for one species.
 *
 * The child's output is parsed rather than trusted: the exit code says whether the process ran, the
 * lines say what the budget decided, and the log rows it wrote are the record of it.
 */
async function fetchForSpecies({ order, slug, providers, upload }) {
  const argv = [
    FETCH,
    "--species=" + slug,
    "--provider=" + providers.join(","),
    "--apply",
    "--compress",
    "--count=1",
    "--approve",
    "--actor=" + order.created_by,
    "--order=" + order.id,
  ];
  if (upload) argv.push("--upload");
  else argv.push("--wire");

  // An order that names species is also how an admin replaces a poor model, so those runs may
  // overwrite the file they name. A generic fill-the-gaps order never needs to: it only ever picks
  // species that have no model at all.
  if (Array.isArray(order.slugs) && order.slugs.length > 0) argv.push("--force");

  try {
    const { stdout } = await run(process.execPath, argv, {
      cwd: ROOT,
      timeout: 15 * 60_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    process.stdout.write(stdout.split("\n").map((line) => "   " + line).join("\n") + "\n");

    // Read the pipeline summary line rather than looking for words anywhere in the output: the
    // phrase "refused by the download budget" appears in the summary even when the count is zero,
    // which is exactly the mistake this line used to make.
    const summary = /(\d+) downloaded, (\d+) stored, (\d+) skipped, (\d+) refused by the download budget/.exec(stdout);
    if (summary) {
      if (Number(summary[1]) > 0) return "downloaded";
      if (Number(summary[4]) > 0) return "refused";
      if (Number(summary[3]) > 0) return "skipped";
      return "failed";
    }

    if (/^\s*failed:/m.test(stdout)) return "failed";
    return "skipped";
  } catch (error) {
    console.error("   pipeline failed: " + String(error.message).split("\n")[0]);
    return "failed";
  }
}

async function patchOrder(id, body) {
  await api("model_source_orders?id=eq." + id, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runOrder(order, { upload }) {
  const species = speciesFor(order);
  const providers = order.providers?.length ? order.providers : ["polyhaven", "nasa", "khronos"];

  console.log("Order " + order.id.slice(0, 8) + ": up to " + order.requested + " model(s) from " + providers.join(", "));
  console.log("  " + species.length + " species still need a model");

  const counts = { downloaded: 0, refused: 0, failed: 0, skipped: 0 };
  let outOfBudget = false;
  let lastError = null;

  for (const animal of species) {
    if (counts.downloaded >= order.requested) break;
    if (outOfBudget) break;

    console.log("→ " + animal.slug);
    const outcome = await fetchForSpecies({ order, slug: animal.slug, providers, upload });
    counts[outcome] += 1;

    // Every further attempt would be refused for the same reason: stop, and record why.
    if (outcome === "refused") outOfBudget = true;
    if (outcome === "failed") lastError = lastError ?? animal.slug + ": the pipeline reported a failure";

    // Written after every species, so a crash leaves an honest partial order rather than a stuck one.
    await patchOrder(order.id, {
      downloaded: counts.downloaded,
      refused: counts.refused,
      failed: counts.failed + counts.skipped,
      last_error: lastError,
    });
  }

  const status = lastError ? "failed" : "done";
  await patchOrder(order.id, {
    status,
    finished_at: now(),
    downloaded: counts.downloaded,
    refused: counts.refused,
    failed: counts.failed + counts.skipped,
    last_error: outOfBudget ? "the download budget ran out before the order was filled" : lastError,
  });

  console.log(
    "Order " + order.id.slice(0, 8) + " " + status + ": " +
      counts.downloaded + " downloaded, " + counts.refused + " refused by the budget, " +
      (counts.failed + counts.skipped) + " failed or skipped.",
  );
  return counts;
}

if (flag("--list")) {
  await listOrders();
} else {
  const order = await claimOrder(value("--order"));
  if (!order) console.log("Nothing queued. (npm run models:work -- --list)");
  else await runOrder(order, { upload: flag("--upload") });
}
