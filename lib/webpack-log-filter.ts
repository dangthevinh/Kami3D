/**
 * Webpack's infrastructure logger, minus one line - and the measurements behind that decision.
 *
 * Every `next build` printed three of these, and none of them was about this project's code:
 *
 * ```
 * <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (277kiB) ...
 * <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (267kiB) ...
 * <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (113kiB) ...
 * ```
 *
 * `PackFileCacheStrategy` warns whenever it has to serialise **any** cached string longer than
 * 100 KiB (`v.length > 102400` in webpack's serialiser). Which strings those were was measured, not
 * guessed: a temporary webpack plugin printed every module whose source crossed the same threshold,
 * per compilation, and all three are the raw sources of third-party clients this app has to bundle:
 *
 * | Size | Module | Why it is in the module graph |
 * | --- | --- | --- |
 * | 277 KiB | `@clerk/backend/dist/chunk-R4AMSIE3.mjs` | Clerk's server SDK, reached from `middleware.ts` |
 * | 267 KiB | `@supabase/auth-js/dist/module/GoTrueClient.js` | reached from `@supabase/ssr`'s `createServerClient` |
 * | 113 KiB | `@supabase/storage-js/dist/index.mjs` | reached from the same client |
 *
 * That measurement also **ruled this project's own data out**, which was the first hypothesis: the
 * same three lines, byte for byte, appeared before and after 430 kB of Data2Map GeoJSON stopped being
 * imported by page modules. A warning that does not move when the suspected cause moves was never
 * about that cause.
 *
 * The hint's advice - "consider using Buffer instead" - is addressed to webpack's serialiser, not to
 * an application. No option makes webpack store a module's source as a Buffer rather than a string,
 * and splitting a vendor bundle this project does not own is not its business. What the hint costs is
 * measurable too: 657 KiB of strings against a 310 MiB persistent cache, on a step that runs once per
 * cold build.
 *
 * So exactly that message is dropped, and nothing else is touched:
 *
 *   - every other infrastructure log still reaches the console, including every other webpack warning;
 *   - the `<w> ` marker webpack's own console adds comes back, so the surviving lines look the same;
 *   - the level and the `debug` filter are left alone, because Next sets those itself when
 *     `NEXT_WEBPACK_LOGGING` asks for them.
 *
 * It lives in `lib/` rather than inline in `next.config.ts` so that `npm run check:build-log` can
 * import it and hold both halves of that promise to a test.
 */

/** The message webpack emits for a cached string over 100 KiB. */
export const BIG_STRING_HINT = "Serializing big strings";

/** The logger that emits it. Both halves have to match before a line is dropped. */
export const BIG_STRING_LOGGER = "PackFileCacheStrategy";

/** The five methods webpack's logger reaches for on the console it is given. */
export interface LogSink {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  trace(...args: unknown[]): void;
}

/**
 * True for the one message this filter exists to drop.
 *
 * Two conditions, not one. Webpack's logger prefixes the logger's own name to the first argument, so
 * requiring both the phrase **and** the logger means a message that merely quotes the phrase - a
 * future warning from some other part of webpack, or a sentence in a log line - still gets through.
 * Dropping on the phrase alone would be a filter that quietly swallows more than it claims to.
 */
export function isBigStringHint(args: readonly unknown[]): boolean {
  const first = args[0];
  return (
    typeof first === "string" && first.includes(BIG_STRING_LOGGER) && first.includes(BIG_STRING_HINT)
  );
}

/**
 * A console for webpack's infrastructure logger that drops the big-string hint.
 *
 * Webpack calls these with the logger's name already prefixed to the first argument
 * (`[webpack.cache.PackFileCacheStrategy] Serializing big strings ...`), and the filter needs both
 * halves of that to match - see `isBigStringHint`.
 */
export function webpackInfrastructureConsole(sink: LogSink): LogSink {
  const forward = (method: keyof LogSink) => (...args: unknown[]) => sink[method](...args);

  return {
    log: forward("log"),
    info: forward("info"),
    error: forward("error"),
    debug: forward("debug"),
    trace: forward("trace"),
    warn: (...args: unknown[]) => {
      if (isBigStringHint(args)) return;
      // The default console writes `<w> ` itself; supplying a console replaces it, so it is put back.
      sink.warn("<w>", ...args);
    },
  };
}
