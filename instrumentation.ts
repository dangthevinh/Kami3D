/**
 * Next calls this once per server process, before it starts serving.
 *
 * It exists for exactly one reason: the auto-pilot's clock (Phase 21). Everything else in this
 * project is request-driven, and this is the only thing that has to happen while nobody is asking.
 *
 * It is deliberately quiet: the import is dynamic so a build, an edge runtime or a project without
 * Supabase never loads a module that talks to the database, and `startAutopilotScheduler` refuses to
 * do anything unless the database's own row says the auto-pilot is on.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  try {
    const { startAutopilotScheduler } = await import("@/lib/autopilot-scheduler");
    const result = startAutopilotScheduler();
    if (result.started) console.log("[autopilot] scheduler " + result.reason);
  } catch (error) {
    // A server that cannot start its scheduler must still start.
    console.error("[autopilot] the scheduler did not start: " + String(error).split("\n")[0]);
  }
}
