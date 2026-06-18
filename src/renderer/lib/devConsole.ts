/**
 * Development-only console logging. Disabled in production builds so shipped renderer
 * bundles do not write to the console. Override with `VITE_RENDERER_DEBUG_CONSOLE=1`
 * for ad-hoc diagnostics without a full dev server.
 */
const enabled = import.meta.env.DEV || String(import.meta.env.VITE_RENDERER_DEBUG_CONSOLE ?? "") === "1";

export function devConsoleWarn(scope: string, message: string, error?: unknown): void {
  if (!enabled) return;
  const prefix = `[assistant:${scope}]`;
  if (error !== undefined) {
    console.warn(prefix, message, error);
  } else {
    console.warn(prefix, message);
  }
}

export function devConsoleError(...args: unknown[]): void {
  if (!enabled) return;
  console.error(...args);
}
