/**
 * When the in-process clock is allowed to start - the decision on its own.
 *
 * `lib/autopilot-scheduler.ts` refuses to tick during a build, and refuses to tick at all when
 * `MODEL_AUTOPILOT=off`. That refusal is the only thing standing between `next build` and a model
 * download started from CI, and until this file existed nothing tested it: the scheduler opens with
 * `import "server-only"`, which throws outside a React Server Component bundle, so a `node --test`
 * file cannot import it.
 *
 * So the rule moved here, where it has no imports at all, and the scheduler calls it. A test can
 * import this module and know it is checking the rule that really runs rather than a copy of it that
 * drifts.
 *
 * Nothing here reads `process.env` by itself: the environment arrives as an argument, because a
 * function that looks at the world cannot be asked what it would do in a build.
 *
 *   node --test scripts/check-autopilot-clock.mjs
 */

export interface ClockVerdict {
  /** True only when every rule above has been satisfied. */
  start: boolean;
  /** Why it did not start, in the words the server log already uses. */
  reason: string;
}

/** The fastest this clock is allowed to run. Zero, negative and absent values all land on this. */
export const AUTOPILOT_TICK_FLOOR_MS = 60_000;

/** How often it ticks when `MODEL_AUTOPILOT_TICK_MS` is not set: five minutes. */
export const AUTOPILOT_TICK_DEFAULT_MS = 300_000;

/**
 * The three reasons not to start, in the order the scheduler has always checked them.
 *
 * The order is load-bearing: `MODEL_AUTOPILOT=off` wins over a build, so an operator who has turned
 * the clock off reads that in the log rather than a message about a build.
 */
export function autopilotClockVerdict(
  env: Record<string, string | undefined>,
  alreadyStarted: boolean,
): ClockVerdict {
  // The one switch a human sets to make sure this process never downloads anything.
  if (env.MODEL_AUTOPILOT === "off") return { start: false, reason: "MODEL_AUTOPILOT=off" };

  // `next build` imports instrumentation.ts, and `npm run build` sets npm_lifecycle_event. Both are
  // a compiler, not a server: a clock started there would download models for a build nobody asked
  // to download anything for. (CI is where this fires.)
  if (env.NEXT_PHASE === "phase-production-build" || env.npm_lifecycle_event === "build") {
    return { start: false, reason: "this is a build, not a server" };
  }

  // Starting twice would leave the first timer running forever with nothing holding its handle.
  if (alreadyStarted) return { start: false, reason: "already started" };

  return { start: true, reason: "the clock may start" };
}

/**
 * How long between ticks, never faster than {@link AUTOPILOT_TICK_FLOOR_MS}.
 *
 * A value that is not a number is not a zero: `MODEL_AUTOPILOT_TICK_MS=abc` used to reach
 * `setInterval` as `NaN`, which Node reads as a 1 ms delay - a busy loop in the server process.
 * Unset or unreadable now means {@link AUTOPILOT_TICK_DEFAULT_MS}, and everything else is clamped
 * up to the floor.
 */
export function autopilotTickMs(env: Record<string, string | undefined>): number {
  const raw = env.MODEL_AUTOPILOT_TICK_MS;
  if (raw === undefined) return AUTOPILOT_TICK_DEFAULT_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return AUTOPILOT_TICK_DEFAULT_MS;

  return Math.max(AUTOPILOT_TICK_FLOOR_MS, parsed);
}
