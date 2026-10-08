import "server-only";

import { autopilotClockVerdict, autopilotTickMs } from "@/lib/autopilot-clock";
import { runAutopilotRound } from "@/lib/autopilot-runner";
import { ingestInbox, readInbox } from "@/lib/upload-ingest";

/**
 * The clock, inside the server process.
 *
 * A scheduler that lives here is the difference between "an admin can press a button" and "an admin
 * can switch something on" - and it is only possible because this project runs as a long-lived
 * `next start` process, which is what it says in the README. On a serverless host there is no such
 * process and the same round is driven by `/api/cron/models` instead; the two doors lead to the same
 * function, and the database decides which of them actually gets to run.
 *
 * Three deliberate properties:
 *
 *   - **It is inert until the database says otherwise.** The tick is a cheap read of
 *     `model_autopilot`; while `enabled` is false - which is the default, and the state of every
 *     fresh clone - nothing happens at all. There is no environment variable that switches an
 *     auto-pilot on behind an admin's back.
 *   - **One round at a time.** The in-flight flag stops a slow round from being started again by the
 *     next tick; the database's advisory lock stops it from being started by *anything* else.
 *   - **It never takes the server down.** Every failure is caught and logged as one line, because a
 *     scheduler that can crash the process it lives in is worse than no scheduler.
 */

/** How long between ticks: five minutes unless MODEL_AUTOPILOT_TICK_MS says otherwise, floor 60 s. */
const TICK_MS = autopilotTickMs(process.env);
/** How long a round started by the clock may hold the process's attention. */
const WAIT_MS = Number(process.env.MODEL_AUTOPILOT_WAIT_MS ?? 600_000);

interface SchedulerState {
  timer: NodeJS.Timeout | null;
  running: boolean;
}

const globalState = globalThis as typeof globalThis & { __kamiAutopilot?: SchedulerState };

export function startAutopilotScheduler(): { started: boolean; reason: string } {
  // Whether to start at all is a pure decision, and it lives in lib/autopilot-clock.ts for one
  // reason: this module begins with `server-only`, which throws outside a React Server Component
  // bundle, so no `node --test` file can import it. Keeping the rule there means the test locks the
  // rule that really runs here rather than a copy of it that can drift.
  const verdict = autopilotClockVerdict(process.env, Boolean(globalState.__kamiAutopilot?.timer));
  if (!verdict.start) return { started: false, reason: verdict.reason };

  const state = globalState.__kamiAutopilot ?? { timer: null, running: false };
  globalState.__kamiAutopilot = state;

  const tick = async () => {
    if (state.running) return;
    state.running = true;
    try {
      const report = await runAutopilotRound({ actor: "scheduler", trigger: "scheduler", force: false, waitMs: WAIT_MS });
      // One line per tick, and only when there was something to say: a scheduler that logs "nothing
      // to do" every five minutes trains its reader to ignore it.
      if (report.started || (report.reason && !/switched off|not due/.test(report.reason))) {
        console.log("[autopilot] " + (report.started ? "round: " : "skipped: ") + (report.reason ?? (report.downloaded + " downloaded")));
      }
    } catch (error) {
      console.error("[autopilot] the round failed: " + String(error).split("\n")[0]);
    }

    // The upload inbox is the second thing that has to happen while nobody is asking (Phase 22):
    // dropping a file into Storage is a request, and nothing else in this app would notice it.
    // The list call is cheap and empty most of the time, which is why it runs on every tick.
    if (process.env.MODEL_UPLOADS !== "off") {
      try {
        const waiting = await readInbox();
        if (waiting.length > 0) {
          const ingest = await ingestInbox({ actor: "scheduler" });
          console.log(
            "[uploads] " + ingest.published + " published, " + ingest.rejected + " rejected, " +
              ingest.failed + " failed, out of " + ingest.seen + " file(s)",
          );
        }
      } catch (error) {
        console.error("[uploads] the inbox could not be processed: " + String(error).split("\n")[0]);
      }
    }

    state.running = false;
  };

  state.timer = setInterval(tick, TICK_MS);
  // Do not hold the event loop open on shutdown.
  state.timer.unref?.();

  return { started: true, reason: "ticking every " + Math.round(TICK_MS / 1000) + "s" };
}

/** Exported for the tests and for a page that wants to say whether the clock is here or outside. */
export function schedulerState(): { running: boolean } {
  return { running: Boolean(globalState.__kamiAutopilot?.timer) };
}
