/**
 * Runs `callback` once the browser has nothing better to do.
 *
 * Used to load the account UI for visitors whose session state is ambiguous:
 * the bytes never compete with the page's own hydration, and the return value
 * cancels a pending callback so an unmounted component cannot set state.
 */
export function whenIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof window === "undefined") return () => undefined;

  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(callback, 1);
  return () => window.clearTimeout(handle);
}
