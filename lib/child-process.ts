import "server-only";

import type { ChildProcess, spawn as SpawnFunction } from "node:child_process";

/**
 * Child processes, fetched late and deliberately.
 *
 * `instrumentation.ts` is bundled for **both** runtimes - this project has a middleware, so Next
 * compiles a copy for the edge as well - and the edge build cannot resolve `node:child_process` at
 * all. A static import therefore fails the production build (measured: CI, "Reading from
 * \"node:child_process\" is not handled by plugins"), even when the code that uses it only ever runs
 * under `nodejs`. So the specifier is fetched when a process is actually needed, with the bundler
 * told to leave it alone, and a runtime that has none gets a plain "no" instead of a crash.
 */

export type SpawnFn = typeof SpawnFunction;

/** Any Node built-in, fetched the same way and for the same reason. */
export async function loadNodeModule<T>(name: string): Promise<T | null> {
  try {
    const specifier = name;
    return (await import(/* webpackIgnore: true */ specifier)) as T;
  } catch {
    return null;
  }
}

export async function loadSpawn(): Promise<SpawnFn | null> {
  const module = await loadNodeModule<{ spawn: SpawnFn }>("node:child_process");
  return module?.spawn ?? null;
}

export interface CommandResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  /** Set when the process could not be started at all, which is a different failure from a non-zero exit. */
  spawnError: string | null;
}

/** Run a command to completion, with a ceiling on how long it may take. */
export async function runCommand(
  command: string,
  args: string[],
  { timeoutMs = 120_000, cwd = process.cwd() }: { timeoutMs?: number; cwd?: string } = {},
): Promise<CommandResult> {
  const spawn = await loadSpawn();
  if (!spawn) {
    return { ok: false, code: null, stdout: "", stderr: "", spawnError: "this runtime has no child processes" };
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    let child: ChildProcess;
    try {
      child = spawn(command, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resolve({ ok: false, code: null, stdout: "", stderr: "", spawnError: String(error).split("\n")[0] });
      return;
    }

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ ok: false, code: null, stdout, stderr, spawnError: "timed out after " + timeoutMs + "ms" });
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => finish({ ok: false, code: null, stdout, stderr, spawnError: error.message }));
    child.on("close", (code) => finish({ ok: code === 0, code, stdout, stderr, spawnError: null }));
  });
}
